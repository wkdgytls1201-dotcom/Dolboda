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
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(token);
  // 길이는 반드시 **바이트**로 비교한다. 글자 수로 보면 한글 32글자(96바이트)짜리 토큰이
  // 32글자 검사를 통과해 timingSafeEqual까지 내려가고, 거기서 길이가 다르다며 예외를 던져
  // 400이어야 할 잘못된 요청이 500이 된다(실측: ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH).
  if (given.length !== expected.length) return false;
  // 비교에 걸리는 시간으로 토큰을 한 바이트씩 맞춰가는 공격을 막는다
  return timingSafeEqual(expected, given);
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
