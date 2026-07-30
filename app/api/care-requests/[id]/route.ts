import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLocationType, buildCareRequestData } from "@/lib/careRequestValidation";

async function getOwnedRequest(id: string, userId: string) {
  const careRequest = await prisma.careRequest.findUnique({ where: { id } });
  if (!careRequest || careRequest.guardianId !== userId) return null;
  return careRequest;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const existing = await getOwnedRequest(params.id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "수정할 수 없어요." }, { status: 404 });
  }

  const body = (await req.json()) as Record<string, unknown>;

  // 돌봄이 끝났을 때 보호자가 완료 처리 — 시터의 "완료된 돌봄" 탭에 쌓인다.
  if (body.action === "complete") {
    const completed = await prisma.careRequest.update({
      where: { id: params.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.careRequestApplication.updateMany({
      where: { careRequestId: params.id, status: "매칭확정" },
      data: { status: "돌봄완료" },
    });
    return NextResponse.json(completed);
  }

  const { locationType, region, startDate, endDate } = body as Partial<{
    locationType: string;
    region: string;
    startDate: string;
    endDate: string;
  }>;

  const parsedType = parseLocationType(locationType);
  const fields = buildCareRequestData(body, true);

  // 수정 후의 유형 기준으로 유형별 필수값을 다시 검증한다.
  const nextType = parsedType ?? existing.locationType;
  const nextMobility =
    "mobilityLevel" in fields ? (fields.mobilityLevel as string | null) : existing.mobilityLevel;
  const nextTasks =
    "householdTasks" in fields ? (fields.householdTasks as string[]) : existing.householdTasks;
  if (nextType === "HOSPITAL" && !nextMobility) {
    return NextResponse.json({ error: "거동 수준을 선택해주세요." }, { status: 400 });
  }
  if (nextType === "HOUSEKEEPING" && nextTasks.length === 0) {
    return NextResponse.json({ error: "필요한 집안일을 1개 이상 선택해주세요." }, { status: 400 });
  }

  const careRequest = await prisma.careRequest.update({
    where: { id: params.id },
    data: {
      ...fields,
      ...(parsedType !== null && { locationType: parsedType }),
      ...(region !== undefined && { region }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
    } as never,
  });

  return NextResponse.json(careRequest);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const existing = await getOwnedRequest(params.id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "취소할 수 없어요." }, { status: 404 });
  }

  const careRequest = await prisma.careRequest.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json(careRequest);
}
