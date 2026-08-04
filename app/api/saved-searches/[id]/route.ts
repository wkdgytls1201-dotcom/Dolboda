import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  // 본인 것만 지울 수 있게 userId까지 조건에 넣는다 — 다른 사람 id를 넣어 지우는 걸 막는다
  const { count } = await prisma.savedSearch.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  if (count === 0) {
    return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
