// 돌봄 포인트 — 서버 전용 헬퍼(docs/points-spec.md).
// 원칙: 포인트 지급·차감이 실패해도 원래 하려던 일(후기 저장, 반응 저장)은 절대
// 실패하면 안 된다 — 호출부는 항상 실패를 무시할 수 있게 award가 throw하지 않는다.
import { prisma } from "@/lib/prisma";
import { POINT_EXPIRY_MONTHS } from "@/lib/pointsConfig";

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

export interface LedgerEntry {
  amount: number;
  createdAt: Date;
}

/** 적립일로부터 N개월이 지난 시점 */
export function pointExpiresAt(earnedAt: Date): Date {
  const d = new Date(earnedAt);
  d.setMonth(d.getMonth() + POINT_EXPIRY_MONTHS);
  return d;
}

/**
 * 원장에서 **지금 쓸 수 있는 잔액**을 계산한다 (약관 제12조의2 — 적립 후 24개월 소멸).
 *
 * 단순히 합산하면 안 되는 이유: 소멸한 적립분을 빼려면 "그게 이미 쓰였는지"를 알아야 한다.
 * 원장은 적립·사용을 행으로만 남기고 어느 적립을 썼는지는 기록하지 않으므로,
 * **오래된 적립부터 쓰인 것으로 본다(FIFO).** 이용자에게 유리한 해석이다 —
 * 곧 소멸할 포인트가 먼저 소진되므로 "쓰지도 못하고 사라지는" 일이 줄어든다.
 *
 * 사용(음수)은 소멸하지 않는다. 이미 쓴 것을 되돌릴 이유가 없다.
 */
export function usableBalance(entries: LedgerEntry[], now: Date = new Date()): number {
  const earns = entries
    .filter((e) => e.amount > 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((e) => ({ at: e.createdAt, left: e.amount }));

  let spent = entries.reduce((s, e) => s + (e.amount < 0 ? -e.amount : 0), 0);
  for (const lot of earns) {
    if (spent <= 0) break;
    const used = Math.min(spent, lot.left);
    lot.left -= used;
    spent -= used;
  }

  return earns.reduce((s, lot) => s + (pointExpiresAt(lot.at) > now ? lot.left : 0), 0);
}

/** 아직 안 쓴 적립분 중 가장 먼저 소멸하는 건 — 화면이 "언제 사라지는지" 알리는 데 쓴다. */
export function nextExpiry(
  entries: LedgerEntry[],
  now: Date = new Date()
): { amount: number; at: Date } | null {
  const earns = entries
    .filter((e) => e.amount > 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((e) => ({ at: e.createdAt, left: e.amount }));

  let spent = entries.reduce((s, e) => s + (e.amount < 0 ? -e.amount : 0), 0);
  for (const lot of earns) {
    if (spent <= 0) break;
    const used = Math.min(spent, lot.left);
    lot.left -= used;
    spent -= used;
  }

  for (const lot of earns) {
    const at = pointExpiresAt(lot.at);
    if (lot.left > 0 && at > now) return { amount: lot.left, at };
  }
  return null;
}

export async function getPointBalance(userId: string): Promise<number> {
  const entries = await prisma.pointLedger.findMany({
    where: { userId },
    select: { amount: true, createdAt: true },
  });
  return usableBalance(entries);
}
