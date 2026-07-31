import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const profile = await prisma.sitterProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  const { name, issuedBy } = (await req.json()) as { name?: string; issuedBy?: string };
  if (!name) {
    return NextResponse.json({ error: "자격증명을 입력해주세요." }, { status: 400 });
  }

  const certification = await prisma.sitterCertification.create({
    data: { sitterProfileId: profile.id, name, issuedBy },
  });

  return NextResponse.json(certification, { status: 201 });
}
