import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 로그인한 모심시터의 활동 가능 지역과 겹치는, 아직 열려있는 돌봄 요청 목록
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const sitterProfile = await prisma.sitterProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!sitterProfile) {
    return NextResponse.json({ error: "등록된 모심시터 프로필이 없어요." }, { status: 404 });
  }

  const openRequests = await prisma.careRequest.findMany({
    where: { status: "OPEN", region: { in: sitterProfile.regions } },
    orderBy: { createdAt: "desc" },
    include: { applications: { where: { sitterProfileId: sitterProfile.id } } },
  });

  return NextResponse.json({
    items: openRequests.map((r) => ({ ...r, alreadyApplied: r.applications.length > 0 })),
  });
}
