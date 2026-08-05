import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { REFERRAL_CLAIM_WINDOW_DAYS } from "@/lib/pointsConfig";

// 추천 코드 귀속(points-spec §5 2단계) — 초대 링크로 들어와 가입한 계정을 추천인에게
// 묶는다. 보상은 여기서 지급하지 않는다 — 귀속된 사람이 "첫 돌봄을 완료"하는 순간
// 양쪽에 지급된다(care-requests [id] 완료 훅). 가입만으로 주면 유령 계정이 통로가 된다.

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
      data: { userId, referrerId: referral.userId },
    });
  } catch {
    // 동시 요청으로 이미 만들어졌으면 성공으로 본다(가입자당 1회 — id가 곧 유니크)
  }
  return NextResponse.json({ ok: true });
}
