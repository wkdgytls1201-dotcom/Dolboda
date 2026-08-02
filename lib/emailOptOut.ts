import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";

// 시설 문의 전달 수신거부 — 서버 전용 모듈(node:crypto를 쓴다).
// 클라이언트가 import하는 파일에서 부르지 말 것(§3-9 번들 오염 규칙).

/** 대소문자·공백 차이로 같은 주소를 다른 것으로 취급하지 않게 정규화한다. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// 링크만 알면 아무 주소나 차단할 수 있으면 안 된다 — 주소마다 서명을 붙인다.
// AUTH_SECRET은 이미 세션 서명에 쓰는 값이라 별도 시크릿을 늘리지 않는다.
function secret(): string {
  return process.env.AUTH_SECRET ?? "dolboda-dev-unsubscribe-secret";
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", secret()).update(normalizeEmail(email)).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = unsubscribeToken(email);
  if (token.length !== expected.length) return false;
  // 문자열 비교 시간으로 토큰을 한 글자씩 맞춰가는 공격을 막는다
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** 발송 직전에 부른다. 한 번 거부한 주소로는 두 번 다시 보내지 않는다. */
export async function isOptedOut(email: string): Promise<boolean> {
  const found = await prisma.emailOptOut.findUnique({
    where: { email: normalizeEmail(email) },
    select: { email: true },
  });
  return Boolean(found);
}

export async function addOptOut(params: {
  email: string;
  facilityId?: string | null;
  facilityName?: string | null;
  source: "one-click" | "manual";
}): Promise<void> {
  const email = normalizeEmail(params.email);
  await prisma.emailOptOut.upsert({
    where: { email },
    // 이미 있으면 그대로 둔다 — 최초 거부 시점이 기록으로서 의미가 있다
    update: {},
    create: {
      email,
      facilityId: params.facilityId ?? null,
      facilityName: params.facilityName ?? null,
      source: params.source,
    },
  });
}
