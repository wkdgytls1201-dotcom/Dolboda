// 운영자 알림용 텔레그램 발송 (서버 전용).
//
// 이미 공단 일일 수집 스크립트(scripts/daily-nhis-sync.mjs)가 같은 봇을 쓰고 있다 —
// 여기서는 앱 런타임(Vercel)에서 같은 채팅방으로 보낸다. 그래서 Vercel에도
// TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID를 넣어야 한다(GitHub Actions 시크릿과 별개다).
//
// 원칙 두 가지:
// 1) 없으면 조용히 건너뛴다 — 알림은 부가 기능이라, 토큰이 없다고 상담 접수가 실패하면 안 된다.
// 2) 실패해도 절대 예외를 위로 던지지 않는다 — 호출부는 await 해도 안전하다.

const API = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      console.error("텔레그램 발송 실패:", res.status, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("텔레그램 발송 오류:", e);
    return false;
  }
}
