// 로그인 수단을 화면에 표시할 이름으로. session.user.provider(auth.ts의 jwt 콜백이 채움)를
// 그대로 쓰면 "kakao"가 노출되므로 여기서 한 번 걸러 쓴다.
//
// 알 수 없는 값이면 "소셜"로 떨어뜨린다 — 새 제공자를 붙였는데 이 표를 깜빡했을 때
// 화면에 원문 id가 새어나가는 것보다는 낫다.
const LABELS: Record<string, string> = {
  kakao: "카카오",
  naver: "네이버",
};

export function authProviderLabel(provider?: string) {
  return (provider && LABELS[provider]) || "소셜";
}
