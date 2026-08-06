import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPointBalance, usableBalance, nextExpiry } from "@/lib/points";
import { POINT_SPEND } from "@/lib/pointsConfig";
import { getOrCreateReferralCode } from "@/lib/referral";

// 돌봄 포인트(docs/points-spec.md) — 잔액·내역 조회와 사용처 구매.
// 원장(PointLedger)의 합이 곧 잔액이라 별도 잔액 컬럼과 어긋날 수 없다.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const userId = session.user.id;

  const [balance, entries, allEntries, sitterProfile, openRequest, referralCode, invited, rewarded] =
    await Promise.all([
    getPointBalance(userId),
    prisma.pointLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, amount: true, kind: true, createdAt: true },
    }),
    // 소멸 예정 계산은 30건이 아니라 원장 전체를 봐야 한다(오래된 적립이 먼저 소멸한다)
    prisma.pointLedger.findMany({ where: { userId }, select: { amount: true, createdAt: true } }),
    prisma.sitterProfile.findUnique({
      where: { userId },
      select: { id: true, ribbonUntil: true },
    }),
    // 우선 요청은 지원자를 받는 중(OPEN)인 요청에만 뜻이 있다
    prisma.careRequest.findFirst({
      where: { guardianId: userId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      select: { id: true, boostUntil: true },
    }),
    getOrCreateReferralCode(userId),
    prisma.referralAttribution.count({ where: { referrerId: userId } }),
    prisma.referralAttribution.count({
      where: { referrerId: userId, rewardedAt: { not: null } },
    }),
  ]);

  // "24개월 뒤 사라진다"고 안내만 하고 언제인지 안 알려주면 쓸 기회를 놓친다
  const expiring = nextExpiry(allEntries);

  return NextResponse.json({
    balance,
    entries,
    expiring: expiring ? { amount: expiring.amount, at: expiring.at } : null,
    referral: { code: referralCode, invited, rewarded },
    ribbon: {
      eligible: sitterProfile !== null,
      until: sitterProfile?.ribbonUntil ?? null,
    },
    requestBoost: {
      eligible: openRequest !== null,
      until: openRequest?.boostUntil ?? null,
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const userId = session.user.id;

  const { item } = (await req.json().catch(() => ({}))) as { item?: string };
  if (item !== "ribbon" && item !== "requestBoost") {
    return NextResponse.json({ error: "알 수 없는 상품이에요." }, { status: 400 });
  }
  const product = POINT_SPEND[item];

  // 잔액 확인과 차감을 한 트랜잭션에서, 사용자별 자문 잠금으로 직렬화한다 —
  // 더블 클릭·중복 탭이 동시에 결제하면 잔액이 음수가 될 수 있다(care-requests POST과
  // 같은 요령 — db push 워크플로라 부분 유니크 인덱스 대신 잠금을 쓴다).
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + ":points"}))`;

      // 잔액은 소멸분을 뺀 값이어야 한다 — 단순 합산을 쓰면 24개월 지난 포인트로도
      // 결제가 되고, 화면에 보이는 잔액(getPointBalance)과도 어긋난다.
      const entries = await tx.pointLedger.findMany({
        where: { userId },
        select: { amount: true, createdAt: true },
      });
      const balance = usableBalance(entries);
      if (balance < product.price) {
        return { error: `포인트가 부족해요. (보유 ${balance}P / 필요 ${product.price}P)` };
      }

      const now = new Date();
      const extendFrom = (current: Date | null) =>
        new Date(Math.max(now.getTime(), current?.getTime() ?? 0) + product.days * 86400000);

      if (item === "ribbon") {
        const profile = await tx.sitterProfile.findUnique({
          where: { userId },
          select: { id: true, ribbonUntil: true },
        });
        if (!profile) return { error: "매니저 프로필이 있어야 쓸 수 있어요." };
        await tx.sitterProfile.update({
          where: { id: profile.id },
          data: { ribbonUntil: extendFrom(profile.ribbonUntil) },
        });
      } else {
        const request = await tx.careRequest.findFirst({
          where: { guardianId: userId, status: "OPEN" },
          orderBy: { createdAt: "desc" },
          select: { id: true, boostUntil: true },
        });
        if (!request) return { error: "지원자를 받는 중인 돌봄 요청이 있어야 쓸 수 있어요." };
        await tx.careRequest.update({
          where: { id: request.id },
          data: { boostUntil: extendFrom(request.boostUntil) },
        });
      }

      await tx.pointLedger.create({
        data: {
          userId,
          amount: -product.price,
          kind: item === "ribbon" ? "spend_ribbon" : "spend_request_boost",
          // 사용 건은 사건 중복 방지가 아니라 매 건 고유해야 한다 — 난수 refId
          refId: crypto.randomUUID(),
        },
      });
      return { ok: true as const };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
