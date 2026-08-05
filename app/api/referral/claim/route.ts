import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { POINT_EARN, REFERRAL_CLAIM_WINDOW_DAYS } from "@/lib/pointsConfig";

// 추천 코드 귀속(points-spec §5 2단계) — 초대 링크로 들어와 가입한 계정을 추천인에게
// 묶고, 그 자리에서 양쪽에 지급한다(2026-08-05 사용자 결정 — 처음엔 "첫 돌봄 완료 시
// 지급"이었지만, 포인트가 현금성이 없어 유령 계정으로 캐도 실익이 없으므로 가입 즉시
// 지급으로 완화. 남는 방어선: 14일 귀속 창·가입자당 1회·본인 코드 차단·원장 유니크).

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const userId = session.user.id;

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!normalized) {
    return NextResponse.json({ error: "코드가 필요해요." }, { status: 400 });
  }

  // 이미 귀속된 계정이면 그대로 성공 — 링크를 두 번 밟아도 이상해지지 않는다
  const existing = await prisma.referralAttribution.findUnique({ where: { userId } });
  if (existing) return NextResponse.json({ ok: true, already: true });

  const referral = await prisma.referralCode.findUnique({ where: { code: normalized } });
  if (!referral) {
    return NextResponse.json({ error: "없는 코드예요." }, { status: 404 });
  }
  if (referral.userId === userId) {
    return NextResponse.json({ error: "내 코드는 쓸 수 없어요." }, { status: 400 });
  }

  // 신규 회원만 — 기존 회원끼리 코드를 주고받아 보상을 캐는 것을 막는다
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  if (
    !me ||
    me.createdAt.getTime() < Date.now() - REFERRAL_CLAIM_WINDOW_DAYS * 86400000
  ) {
    return NextResponse.json(
      { error: `가입 ${REFERRAL_CLAIM_WINDOW_DAYS}일 이내에만 초대를 등록할 수 있어요.` },
      { status: 400 }
    );
  }

  try {
    await prisma.referralAttribution.create({
      data: { userId, referrerId: referral.userId, rewardedAt: new Date() },
    });
  } catch {
    // 동시 요청으로 이미 만들어졌으면 성공으로 본다(가입자당 1회 — id가 곧 유니크).
    // 지급도 건너뛴다 — 먼저 만든 요청이 이미 지급했다.
    return NextResponse.json({ ok: true, already: true });
  }

  // 귀속 성공 시 즉시 양쪽 지급 — 실패해도 귀속은 유효(원장 유니크가 재지급을 막는다)
  await awardPoints({
    userId: referral.userId,
    kind: "referral_referrer",
    refId: userId,
    amount: POINT_EARN.referralReferrer,
  });
  await awardPoints({
    userId,
    kind: "referral_referee",
    refId: userId,
    amount: POINT_EARN.referralReferee,
  });

  return NextResponse.json({ ok: true, rewarded: true });
}
