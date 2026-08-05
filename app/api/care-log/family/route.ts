import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 돌봄일지 가족 공유 관리(care-log-spec §9-5) — 전부 보호자 본인만.
// 초대 생성(POST)·목록(GET)·해제(DELETE). 수락은 별도 라우트(./accept)에서 한다.

const MAX_ACTIVE = 5; // 초대·수락 합쳐 활성 5개 — 가족 공유지 공개 배포가 아니다
const INVITE_TTL_MS = 7 * 86400 * 1000; // 미수락 초대는 7일 뒤 만료

async function findOwnRequest(userId: string) {
  return prisma.careRequest.findFirst({
    where: { guardianId: userId, status: { in: ["MATCHED", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}

function isExpired(row: { acceptedAt: Date | null; createdAt: Date }) {
  return !row.acceptedAt && row.createdAt.getTime() < Date.now() - INVITE_TTL_MS;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const request = await findOwnRequest(session.user.id);
  if (!request) {
    return NextResponse.json({ error: "확정된 돌봄이 없어요." }, { status: 404 });
  }

  const rows = await prisma.careLogFamilyAccess.findMany({
    where: { careRequestId: request.id, revokedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId).filter((v): v is string => v !== null) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return NextResponse.json({
    members: rows
      .filter((r) => !isExpired(r))
      .map((r) => ({
        id: r.id,
        accepted: r.acceptedAt !== null,
        acceptedAt: r.acceptedAt,
        createdAt: r.createdAt,
        // 이름은 수락한 가족의 계정 이름(없으면 null) — 연락처·이메일은 내리지 않는다
        name: r.userId ? (nameById.get(r.userId) ?? null) : null,
        // 토큰은 미수락 초대에만 — 보호자가 링크를 다시 공유할 수 있게
        token: r.acceptedAt ? null : r.token,
      })),
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const request = await findOwnRequest(session.user.id);
  if (!request) {
    return NextResponse.json({ error: "확정된 돌봄이 없어요." }, { status: 404 });
  }

  const active = await prisma.careLogFamilyAccess.findMany({
    where: { careRequestId: request.id, revokedAt: null },
  });
  if (active.filter((r) => !isExpired(r)).length >= MAX_ACTIVE) {
    return NextResponse.json(
      { error: `가족 초대는 ${MAX_ACTIVE}명까지예요. 쓰지 않는 초대를 해제해주세요.` },
      { status: 409 }
    );
  }

  const created = await prisma.careLogFamilyAccess.create({
    data: { careRequestId: request.id, token: crypto.randomUUID().replace(/-/g, "") },
  });
  return NextResponse.json({ id: created.id, token: created.token }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const request = await findOwnRequest(session.user.id);
  if (!request) {
    return NextResponse.json({ error: "확정된 돌봄이 없어요." }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id가 필요해요." }, { status: 400 });
  }
  // updateMany로 careRequestId까지 함께 대조 — 남의 초대 id를 찍어도 0건이 될 뿐이다
  const updated = await prisma.careLogFamilyAccess.updateMany({
    where: { id, careRequestId: request.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "해제할 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
