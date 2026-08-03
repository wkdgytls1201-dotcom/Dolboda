import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 보호자 본인의 복지용구 상담 신청 내역 — app/api/consult/mine과 같은 패턴.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const items = await prisma.welfareConsultRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, sido: true, sigungu: true, items: true, status: true, createdAt: true },
  });

  return NextResponse.json({ items });
}

const ALLOWED_STATUS = ["연락받음"] as const;

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: unknown; status?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  const status =
    body.status === null
      ? null
      : ALLOWED_STATUS.includes(body.status as (typeof ALLOWED_STATUS)[number])
      ? (body.status as string)
      : undefined;
  if (status === undefined) {
    return NextResponse.json({ error: "상태 값이 올바르지 않아요." }, { status: 400 });
  }

  const existing = id
    ? await prisma.welfareConsultRequest.findUnique({ where: { id }, select: { userId: true } })
    : null;
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "수정할 수 없어요." }, { status: 404 });
  }

  const updated = await prisma.welfareConsultRequest.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });
  return NextResponse.json(updated);
}
