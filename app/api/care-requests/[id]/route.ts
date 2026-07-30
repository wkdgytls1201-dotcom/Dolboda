import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLocationType, sanitizeTasks, clampVisit } from "@/lib/careRequestValidation";

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

  const body = await req.json();
  const {
    locationType,
    region,
    locationNote,
    startDate,
    endDate,
    situation,
    mobilityLevel,
    needsMealAssist,
    needsToiletAssist,
    conditions,
    householdTasks,
    visitsPerWeek,
    visitHours,
    sitterGenderPref,
    requestNote,
  } = body as Partial<{
    locationType: string;
    region: string;
    locationNote: string | null;
    startDate: string;
    endDate: string;
    situation: string | null;
    mobilityLevel: string | null;
    needsMealAssist: boolean;
    needsToiletAssist: boolean;
    conditions: string[];
    householdTasks: string[];
    visitsPerWeek: number | null;
    visitHours: number | null;
    sitterGenderPref: string;
    requestNote: string | null;
  }>;

  const parsedType = parseLocationType(locationType);
  // 수정 후의 유형 기준으로 유형별 필수값을 다시 검증한다.
  const nextType = parsedType ?? existing.locationType;
  const nextSituation = situation !== undefined ? situation : existing.situation;
  const nextMobility = mobilityLevel !== undefined ? mobilityLevel : existing.mobilityLevel;
  const nextTasks =
    householdTasks !== undefined ? sanitizeTasks(householdTasks) : existing.householdTasks;
  if (nextType === "HOSPITAL" && (!nextSituation || !nextMobility)) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }
  if (nextType === "HOUSEKEEPING" && nextTasks.length === 0) {
    return NextResponse.json({ error: "필요한 집안일을 1개 이상 선택해주세요." }, { status: 400 });
  }

  const careRequest = await prisma.careRequest.update({
    where: { id: params.id },
    data: {
      ...(parsedType !== null && { locationType: parsedType }),
      ...(region !== undefined && { region }),
      ...(locationNote !== undefined && { locationNote }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(situation !== undefined && { situation }),
      ...(mobilityLevel !== undefined && { mobilityLevel }),
      ...(needsMealAssist !== undefined && { needsMealAssist }),
      ...(needsToiletAssist !== undefined && { needsToiletAssist }),
      ...(conditions !== undefined && { conditions }),
      ...(householdTasks !== undefined && { householdTasks: nextTasks }),
      ...(visitsPerWeek !== undefined && { visitsPerWeek: clampVisit(visitsPerWeek, 7) }),
      ...(visitHours !== undefined && { visitHours: clampVisit(visitHours, 24) }),
      ...(sitterGenderPref !== undefined && { sitterGenderPref }),
      ...(requestNote !== undefined && { requestNote }),
    },
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
