// 무인증 엔드포인트(상담신청·등급도우미 설명) 남용 방지용 초경량 레이트리밋.
//
// 한계를 먼저 밝힌다: 인메모리라 서버 인스턴스마다 따로 센다. 서버리스에서 인스턴스가
// 여러 개면 실제 상한은 (설정값 × 인스턴스 수)가 된다. 정확한 전역 상한을 두려면
// Upstash 같은 외부 카운터가 필요한데, 그건 의존성과 운영 비용이 늘어난다.
// 지금 막으려는 것은 "스크립트 한 번으로 수천 건이 들어오는" 상황이고, 그건 이걸로 막힌다.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
// 키가 무한정 쌓여 메모리를 먹지 않게 상한을 둔다
const MAX_KEYS = 10_000;

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // 만료된 게 없는데도 가득 찼다면(공격 중) 오래된 것부터 버린다 — Map은 삽입순이라 앞이 오래된 것
  if (buckets.size >= MAX_KEYS) {
    let drop = Math.floor(MAX_KEYS / 4);
    for (const key of buckets.keys()) {
      if (drop-- <= 0) break;
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** 초 단위 — 429 응답의 Retry-After 헤더에 그대로 쓴다 */
  retryAfter: number;
}

/** 고정 윈도우 방식. key는 보통 `${라우트}:${IP}` */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count++;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

// Vercel은 x-forwarded-for의 맨 앞을 실제 클라이언트로 채워준다.
// IP를 못 얻으면 "unknown" 하나로 묶이는데, 그 경우엔 오히려 더 빡빡하게 걸리는 셈이라 안전한 쪽이다.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** 429 공통 응답 */
export function tooManyRequests(message: string, retryAfter: number) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}
