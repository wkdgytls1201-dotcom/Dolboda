// 하단 탭바를 "화면 상태"로 숨기기 위한 아주 작은 공유 저장소.
//
// 왜 경로 프리픽스로 부족한가: 등급테스트는 인트로(시작하기)에서는 탭바가 보여야
// 자연스럽고(사용자 피드백 2026-08-05), 52문항을 푸는 동안에만 몰입을 위해 숨겨야
// 한다 — 같은 경로 안에서 단계에 따라 달라지므로 pathname만으로는 알 수 없다.
//
// 페이지 컴포넌트가 setTabBarHidden(true/false)로 신호를 보내고, MobileTabBar가
// useSyncExternalStore로 구독한다. 언마운트 시 반드시 false로 되돌릴 것(이탈 시 잔류 방지).

let hidden = false;
const listeners = new Set<() => void>();

export function setTabBarHidden(next: boolean) {
  if (hidden === next) return;
  hidden = next;
  for (const l of listeners) l();
}

export function subscribeTabBarHidden(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTabBarHidden() {
  return hidden;
}

/** SSR 스냅샷 — 서버에서는 항상 보이는 상태로 렌더한다 */
export function getTabBarHiddenServer() {
  return false;
}
