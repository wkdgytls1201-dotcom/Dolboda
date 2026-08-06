// 돌봄 포인트 — 서버 전용 헬퍼(docs/points-spec.md).
// 원칙: 포인트 지급·차감이 실패해도 원래 하려던 일(후기 저장, 반응 저장)은 절대
// 실패하면 안 된다 — 호출부는 항상 실패를 무시할 수 있게 award가 throw하지 않는다.
import { prisma } from "@/lib/prisma";

export type EarnKind =
  | "review_received"
  | "review_five_star"
  | "reaction"
  | "review_written"
  | "referral_referrer"
  | "referral_referee";

/** 적립 — 같은 사건(userId+kind+refId) 중복 지급은 유니크 제약이 조용히 막는다. */
export async function awardPoints(params: {
  userId: string;
  kind: EarnKind;
  refId: string;
  amount: number;
  memo?: string;
}): Promise<boolean> {
  try {
    await prisma.pointLedger.create({
      data: {
        userId: params.userId,
        kind: params.kind,
        refId: params.refId,
        amount: params.amount,
        memo: params.memo,
      },
    });
    return true;
  } catch (e) {
    // 이미 지급된 사건(P2002) 또는 일시 오류 — 어느 쪽이든 본 동작을 막지 않는다.
    //
    // 다만 **일시 오류는 흔적을 남긴다.** 중복 지급(P2002)은 정상 동작이라 조용해도 되지만,
    // DB 장애로 못 준 것까지 조용히 삼키면 "포인트가 안 들어왔다"는 문의가 왔을 때
    // 무슨 일이 있었는지 알 방법이 없다(2026-08-06 감사에서 확인).
    const code = (e as { code?: string })?.code;
    if (code !== "P2002") {
      console.error(
        `포인트 적립 실패(중복 아님): user=${params.userId} kind=${params.kind} ref=${params.refId}`,
        e
      );
    }
    return false;
  }
}

export async function getPointBalance(userId: string): Promise<number> {
  const agg = await prisma.pointLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}
