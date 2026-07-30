import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLocationType, buildCareRequestData } from "@/lib/careRequestValidation";

// 보호자 본인의 가장 최근 돌봄 요청 1건(진행 중이 아니어도 최근 것 하나) — 상세/관리 화면에서 사용
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const careRequest = await prisma.careRequest.findFirst({
    where: { guardianId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        include: { sitterProfile: { include: { certifications: true } } },
      },
    },
  });

  if (!careRequest) {
    return NextResponse.json({ error: "등록된 돌봄 요청이 없어요." }, { status: 404 });
  }

  return NextResponse.json(careRequest);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const existing = await prisma.careRequest.findFirst({
    where: { guardianId: session.user.id, status: { in: ["OPEN", "MATCHED"] } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 진행 중인 돌봄 요청이 있어요.", careRequestId: existing.id },
      { status: 409 }
    );
  }

  const body = (await req.json()) as Record<string, unknown>;
  const { locationType, region, startDate, endDate } = body as {
    locationType?: string;
    region?: string;
    startDate?: string;
    endDate?: string;
  };

  const type = parseLocationType(locationType) ?? "HOSPITAL";
  if (!region || !startDate || !endDate) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: "종료일이 시작일보다 빨라요." }, { status: 400 });
  }

  const fields = buildCareRequestData(body, false);

  // 유형별 필수값 — 병원 간병은 거동 수준, 가사 돌봄은 집안일 1개 이상.
  if (type === "HOSPITAL" && !fields.mobilityLevel) {
    return NextResponse.json({ error: "거동 수준을 선택해주세요." }, { status: 400 });
  }
  if (type === "HOUSEKEEPING" && (fields.householdTasks as string[]).length === 0) {
    return NextResponse.json({ error: "필요한 집안일을 1개 이상 선택해주세요." }, { status: 400 });
  }

  // 등록 직후 상세 화면이 바로 뜰 수 있게 applications(빈 배열)까지 포함해 돌려준다.
  const careRequest = await prisma.careRequest.create({
    include: {
      applications: {
        include: { sitterProfile: { include: { certifications: true } } },
      },
    },
    data: {
      ...fields,
      guardianId: session.user.id,
      locationType: type,
      region,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    } as never,
  });

  return NextResponse.json(careRequest, { status: 201 });
}
