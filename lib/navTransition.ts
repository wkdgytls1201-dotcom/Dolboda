// 시설 상세로 넘어갈 때의 Shared Element Transition 코어.
//
// 예전 구현(632813d·ff36b35)은 라이브러리를 쓰고 전환이 420ms 동안 새 화면을 붙잡아
// "느려진 것 같다"는 사용자 지적으로 되돌려졌다(53baa3b). 이번 구조가 다른 점:
// ① 새 라우트가 커밋되는 순간(대개 loading.tsx 스켈레톤, 53baa3b 실측 ~258ms) 전환을
//    끝낸다 — NavTransitionWatcher가 pathname 변화를 알려준다. 전환의 도착지가 본문이
//    아니라 스켈레톤이라, 데이터가 느려도 전환이 그만큼 길어지지 않는다.
// ② 그래도 450ms 상한을 두고 그 뒤엔 무조건 놓아준다 — 전환이 화면을 붙잡는 일이
//    구조적으로 불가능하다.
// ③ 미지원 브라우저(Firefox·구형 웹뷰)·reduced-motion은 아무것도 하지 않는 그냥
//    이동이다. 전환은 이동을 보조할 뿐, 전제 조건이 아니다(스펙 §5-3).

let pendingDone: (() => void) | null = null;

/** 새 라우트가 커밋되면 NavTransitionWatcher가 부른다 — 대기 중인 전환을 끝낸다. */
export function completeNavTransition() {
  pendingDone?.();
  pendingDone = null;
}

export function navigateWithViewTransition(navigate: () => void) {
  const doc = document as Document & {
    startViewTransition?: (update: () => Promise<void>) => unknown;
  };
  if (
    typeof doc.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    navigate();
    return;
  }
  const routeCommitted = new Promise<void>((resolve) => {
    pendingDone = resolve;
  });
  doc.startViewTransition(() => {
    navigate();
    return Promise.race([
      routeCommitted,
      new Promise<void>((resolve) => setTimeout(resolve, 450)),
    ]);
  });
}

/**
 * 클릭된 카드 안의 대표 이미지(data-vt-hero)·시설명(data-vt-title)에만
 * view-transition-name을 부여한다. 같은 시설이 배너·내주변·점수높은에 동시에 떠도
 * 이름은 클릭한 카드에만 붙으므로 중복 이름으로 전환이 깨지지 않는다(스펙 §4-5).
 * 이동이 일어나지 않는 경우(열람 제한 로그인 모달)를 위해 잠시 후 이름을 거둔다.
 */
export function tagFacilityTransition(card: HTMLElement) {
  const targets: Array<[selector: string, name: string]> = [
    ["[data-vt-hero]", "facility-hero"],
    ["[data-vt-title]", "facility-title"],
  ];
  const tagged: HTMLElement[] = [];
  for (const [selector, name] of targets) {
    const el = card.querySelector<HTMLElement>(selector);
    if (el) {
      el.style.setProperty("view-transition-name", name);
      tagged.push(el);
    }
  }
  if (tagged.length > 0) {
    setTimeout(() => {
      for (const el of tagged) el.style.removeProperty("view-transition-name");
    }, 800);
  }
}
