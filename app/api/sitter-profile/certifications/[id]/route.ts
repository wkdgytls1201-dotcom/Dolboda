import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const certification = await prisma.sitterCertification.findUnique({
    where: { id: params.id },
    include: { sitterProfile: true },
  });

  if (!certification || certification.sitterProfile.userId !== session.user.id) {
    return NextResponse.json({ error: "삭제할 수 없어요." }, { status: 404 });
  }

  await prisma.sitterCertification.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
