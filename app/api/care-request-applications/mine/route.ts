import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 로그인한 모심시터 본인의 매칭확정 건 — 돌봄 확인서 페이지에서 시터 쪽 조회용.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const sitterProfile = await prisma.sitterProfile.findUnique({
    where: { userId: session.user.id },
    include: { certifications: true },
  });
  if (!sitterProfile) {
    return NextResponse.json({ error: "등록된 모심시터 프로필이 없어요." }, { status: 404 });
  }

  const application = await prisma.careRequestApplication.findFirst({
    where: { sitterProfileId: sitterProfile.id, status: "매칭확정" },
    orderBy: { createdAt: "desc" },
    include: {
      careRequest: { include: { guardian: { select: { name: true } } } },
    },
  });
  if (!application) {
    return NextResponse.json({ error: "매칭확정된 돌봄이 없어요." }, { status: 404 });
  }

  return NextResponse.json({
    application: {
      id: application.id,
      status: application.status,
      careRequest: application.careRequest,
      sitterProfile: {
        nickname: sitterProfile.nickname,
        experienceYears: sitterProfile.experienceYears,
        certifications: sitterProfile.certifications.map((c) => ({ id: c.id, name: c.name })),
      },
    },
  });
}
