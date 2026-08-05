// 추천인 코드(points-spec §5 2단계) — 서버 전용 헬퍼.
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { POINT_EARN } from "@/lib/pointsConfig";

// 혼동 문자(0/O, 1/I/L) 제외 — 전화로 불러줘도 틀리지 않는 코드
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** 내 추천 코드 — 없으면 그 자리에서 만든다(지연 생성). 충돌은 재시도로 흡수. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({ where: { userId } });
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.referralCode.create({
        data: { userId, code: generateCode() },
      });
      return created.code;
    } catch {
      // 코드 충돌(P2002-code)이면 새 코드로 재시도, userId 충돌이면 이미 생성된 것
      const again = await prisma.referralCode.findUnique({ where: { userId } });
      if (again) return again.code;
    }
  }
  throw new Error("referral code generation failed");
}

/**
 * 돌봄 완료 시점에 부르는 추천 보상 정산 — 완료에 관여한 사람들(보호자·매니저) 중
 * "초대받고 아직 보상 전"인 사람이 있으면 그 순간 양쪽에 지급한다.
 * 멱등: rewardedAt null 조건부 updateMany로 선점하므로 두 번 불려도 한 번만 지급되고,
 * 원장 유니크(userId·kind·refId)가 한 겹 더 막는다. 실패는 조용히 무시 —
 * 보상 때문에 완료 처리가 실패하면 안 된다.
 */
export async function settleReferralOnFirstCompletion(userIds: (string | undefined)[]) {
  for (const userId of userIds) {
    if (!userId) continue;
    try {
      const attribution = await prisma.referralAttribution.findUnique({ where: { userId } });
      if (!attribution || attribution.rewardedAt) continue;
      const claimed = await prisma.referralAttribution.updateMany({
        where: { userId, rewardedAt: null },
        data: { rewardedAt: new Date() },
      });
      if (claimed.count === 0) continue;
      await awardPoints({
        userId: attribution.referrerId,
        kind: "referral_referrer",
        refId: userId, // 초대받은 사람 기준으로 평생 1회
        amount: POINT_EARN.referralReferrer,
      });
      await awardPoints({
        userId,
        kind: "referral_referee",
        refId: userId,
        amount: POINT_EARN.referralReferee,
      });
    } catch {
      /* 무시 */
    }
  }
}
