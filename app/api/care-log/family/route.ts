import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listGuardianContexts, pickContext } from "@/lib/careLogContext";

// 돌봄일지 가족 공유 관리(care-log-spec §9-5) — 전부 보호자 본인만.
// 초대 생성(POST)·목록(GET)·해제(DELETE). 수락은 별도 라우트(./accept)에서 한다.

const MAX_ACTIVE = 5; // 초대·수락 합쳐 활성 5개 — 가족 공유지 공개 배포가 아니다
const INVITE_TTL_MS = 7 * 86400 * 1000; // 미수락 초대는 7일 뒤 만료

/**
 * 이 보호자의 돌봄 건을 고른다.
 *
 * 예전엔 여기서 `findFirst orderBy createdAt desc`로 최신 한 건만 집었다 — 16차에서
 * 일지·빠른알림·사진 세 라우트가 갖고 있던 것과 **같은 결함**이고, 그때 lib/careLogContext로
 * 통일하면서 이 라우트만 빠졌다(2026-08-06 감사에서 발견).
 *
 * 문제: 지난 돌봄이 쌓이면 보호자도 여러 건을 갖는다. 일지 화면은 건을 전환할 수 있는데
 * 가족 공유만 항상 최신 건을 잡으면, **A건 일지를 보다가 초대한 가족이 B건을 보게 된다.**
 * 이제 화면이 보고 있던 `requestId`를 그대로 받고, 없으면 진행 중 건을 먼저 고른다.
 */
async function findOwnRequest(userId: string, requestId?: string | null) {
  const ctx = pickContext(await listGuardianContexts(userId), requestId);
  return ctx ? { id: ctx.request.id } : null;
}

function requestIdOf(req: Request): string | null {
  return new URL(req.url).searchParams.get("requestId");
}

function isExpired(row: { acceptedAt: Date | null; createdAt: Date }) {
  return !row.acceptedAt && row.createdAt.getTime() < Date.now() - INVITE_TTL_MS;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const request = await findOwnRequest(session.user.id, requestIdOf(req));
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const request = await findOwnRequest(session.user.id, requestIdOf(req));
  if (!request) {
    return NextResponse.json({ error: "확정된 돌봄이 없어요." }, { status: 404 });
  }

  // 개수 확인 후 생성(TOCTOU) — 초대 두 개를 거의 동시에 누르면 둘 다 "4명"을 보고
  // 통과해 5명 상한을 넘길 수 있다(2026-08-07 감사). care-requests POST·points 사용과
  // 같은 요령으로 이 돌봄 건 단위 advisory lock을 걸고 트랜잭션 안에서 다시 센다.
  try {
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"family-invite:" + request.id}))`;
      const active = await tx.careLogFamilyAccess.findMany({
        where: { careRequestId: request.id, revokedAt: null },
      });
      if (active.filter((r) => !isExpired(r)).length >= MAX_ACTIVE) {
        throw new Error("INVITE_LIMIT");
      }
      return tx.careLogFamilyAccess.create({
        data: { careRequestId: request.id, token: crypto.randomUUID().replace(/-/g, "") },
      });
    });
    return NextResponse.json({ id: created.id, token: created.token }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "INVITE_LIMIT") {
      return NextResponse.json(
        { error: `가족 초대는 ${MAX_ACTIVE}명까지예요. 쓰지 않는 초대를 해제해주세요.` },
        { status: 409 }
      );
    }
    throw e;
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const request = await findOwnRequest(session.user.id, requestIdOf(req));
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
