// 링크 공유의 공통 3단 폴백 — 비교함 "가족에게 공유"(app/compare)와 매니저 공개 프로필
// "내 프로필 공유"(mypage/sitter/profile)가 같은 규칙을 쓴다.
//
// 1. navigator.share — 모바일 네이티브 공유 시트(카톡·문자 포함)
// 2. 클립보드 복사
// 3. 클립보드까지 막힌 환경(일부 웹뷰) — 주소창을 공유할 URL로 바꿔주고
//    "길게 눌러 복사"를 안내할 수 있게 한다(막다른 실패 문구 금지)
//
// 반환값을 보고 호출한 쪽이 안내 문구를 정한다:
//  "shared"   공유 시트가 떠서 그 자체가 피드백 — 별도 안내 불필요
//  "cancelled" 사용자가 시트를 그냥 닫음 — 아무 말도 하지 않는 게 맞다
//  "copied"   클립보드에 복사됨 — "붙여넣어 보내세요" 류 안내
//  "fallback" 주소창을 url로 바꿔놨음 — "주소창 링크를 길게 눌러 복사" 안내

export type ShareOutcome = "shared" | "cancelled" | "copied" | "fallback";

export async function shareOrCopyLink(opts: {
  url: string;
  title: string;
  text?: string;
}): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
      // 그 외 실패는 클립보드로 이어서 시도
    }
  }
  try {
    await navigator.clipboard.writeText(opts.url);
    return "copied";
  } catch {
    window.history.replaceState(null, "", opts.url);
    return "fallback";
  }
}
