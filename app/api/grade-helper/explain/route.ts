import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";

// 등급 도우미 결과 설명 생성 — LLM은 설명 문장에만 쓴다(세션당 1회).
// 등급 추정은 이미 클라이언트 상태 머신이 끝냈고, 여기서 등급을 바꾸거나 단정하면 안 된다.
// ANTHROPIC_API_KEY가 없으면 null을 돌려주고 클라이언트가 규칙 기반 설명을 쓴다.
//
// ⚠️ 로그인 없이 부를 수 있는 유일한 LLM 호출 지점이다. 그대로 두면 우리 API 키로
// 아무나 Claude를 쓸 수 있어 비용이 그대로 청구된다. 그래서 두 겹으로 막는다:
//   ① IP당 10분에 5회 — 정상 사용은 세션당 1회라 넉넉하다
//   ② 인스턴스당 시간당 200회 — IP를 바꿔가며 부르는 경우의 비용 상한
const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_MS = 10 * 60 * 1000;
const GLOBAL_LIMIT = 200;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ text: null });
  }

  const ip = rateLimit(`explain:${clientIp(req)}`, PER_IP_LIMIT, PER_IP_WINDOW_MS);
  if (!ip.ok) {
    return tooManyRequests("잠시 후 다시 시도해주세요.", ip.retryAfter);
  }
  const global = rateLimit("explain:global", GLOBAL_LIMIT, GLOBAL_WINDOW_MS);
  if (!global.ok) {
    // 전역 상한에 걸리면 실패로 알리지 않고 규칙 기반 설명으로 조용히 넘긴다 —
    // 사용자 입장에선 설명 문구만 조금 달라질 뿐 화면이 깨지지 않는다.
    return NextResponse.json({ text: null });
  }

  let summary: unknown;
  try {
    ({ summary } = await req.json());
  } catch {
    return NextResponse.json({ text: null }, { status: 400 });
  }
  if (typeof summary !== "string" || summary.length === 0 || summary.length > 2000) {
    return NextResponse.json({ text: null }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 350,
        system:
          "당신은 한국 노인장기요양보험 안내 도우미입니다. 보호자가 버튼형 스크리닝에 답한 결과 요약을 받아, 존댓말 해요체로 3~4문장의 따뜻한 설명을 작성하세요. 규칙: (1) 이미 계산된 예상 범위를 그대로 언급하고 절대 다른 등급을 단정하거나 새로 계산하지 마세요. (2) 도움이 가장 필요한 영역을 짚어주세요. (3) 실제 등급은 공단 방문조사와 등급판정위원회가 결정한다는 점을 꼭 안내하세요. (4) 금액이나 월 한도액 같은 숫자는 언급하지 마세요.",
        messages: [{ role: "user", content: summary }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return NextResponse.json({ text: null });
    const data = await res.json();
    const text: string | undefined = data?.content?.[0]?.text;
    return NextResponse.json({ text: text ?? null });
  } catch {
    return NextResponse.json({ text: null });
  }
}
