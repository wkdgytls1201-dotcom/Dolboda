// 돌봄 포인트 — 서버 전용 헬퍼(docs/points-spec.md).
// 원칙: 포인트 지급·차감이 실패해도 원래 하려던 일(후기 저장, 반응 저장)은 절대
// 실패하면 안 된다 — 호출부는 항상 실패를 무시할 수 있게 award가 throw하지 않는다.
import { prisma } from "@/lib/prisma";

export type EarnKind = "review_received" | "review_five_star" | "reaction" | "review_written";

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
  } catch {
    // 이미 지급된 사건(P2002) 또는 일시 오류 — 어느 쪽이든 본 동작을 막지 않는다
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
