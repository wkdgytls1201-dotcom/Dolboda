import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
  } = body as Partial<{
    region: string;
    locationNote: string | null;
    startDate: string;
    endDate: string;
    situation: string;
    mobilityLevel: string;
    needsMealAssist: boolean;
    needsToiletAssist: boolean;
    conditions: string[];
    sitterGenderPref: string;
    requestNote: string | null;
  }>;

  const careRequest = await prisma.careRequest.update({
    where: { id: params.id },
    data: {
      ...(region !== undefined && { region }),
      ...(locationNote !== undefined && { locationNote }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(situation !== undefined && { situation }),
      ...(mobilityLevel !== undefined && { mobilityLevel }),
      ...(needsMealAssist !== undefined && { needsMealAssist }),
      ...(needsToiletAssist !== undefined && { needsToiletAssist }),
      ...(conditions !== undefined && { conditions }),
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
