import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  const body = await req.json();
  const {
    region,
    locationNote,
    startDate,
    endDate,
    situation,
    mobilityLevel,
    needsMealAssist,
    needsToiletAssist,
    conditions,
    sitterGenderPref,
    requestNote,
  } = body as {
    region?: string;
    locationNote?: string;
    startDate?: string;
    endDate?: string;
    situation?: string;
    mobilityLevel?: string;
    needsMealAssist?: boolean;
    needsToiletAssist?: boolean;
    conditions?: string[];
    sitterGenderPref?: string;
    requestNote?: string;
  };

  if (!region || !startDate || !endDate || !situation || !mobilityLevel) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }

  const careRequest = await prisma.careRequest.create({
    data: {
      guardianId: session.user.id,
      region,
      locationNote,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      situation,
      mobilityLevel,
      needsMealAssist: needsMealAssist ?? false,
      needsToiletAssist: needsToiletAssist ?? false,
      conditions: conditions ?? [],
      sitterGenderPref: sitterGenderPref ?? "무관",
      requestNote,
    },
  });

  return NextResponse.json(careRequest, { status: 201 });
}
