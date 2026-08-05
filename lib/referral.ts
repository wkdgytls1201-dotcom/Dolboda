// 추천인 코드(points-spec §5 2단계) — 서버 전용 헬퍼.
// 보상 지급은 귀속 시점에 claim 라우트가 직접 한다(가입 즉시 지급 — 사용자 결정).
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

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
