// 시설 카드 → 시설 상세 페이지 "이어지는 화면" 전환 (View Transitions API).
//
// ── 무엇을 하는 코드인가 ────────────────────────────────────────────────
// 목록에서 시설 카드를 누르면, 화면이 새로 열리는 대신 **누른 카드가 상세 페이지로
// 변형되는 것처럼** 보이게 한다. 카드의 사진은 상세 페이지 상단 사진 자리로 커지고,
// 시설명은 상세 페이지 제목 자리로 이동한다.
//
// 원리는 간단하다. 전환 전후 화면에서 "이건 같은 물건이다"라고 알려주고 싶은 요소에
// 똑같은 이름(view-transition-name)을 붙여두면, 브라우저가 그 둘 사이의 위치·크기
// 차이를 스스로 계산해 애니메이션을 만들어준다. 우리가 좌표를 계산하거나 매 프레임
// 값을 바꾸지 않는다(그래서 성능 부담이 거의 없다 — 브라우저가 transform으로 처리한다).
//
// ── 이름을 미리 안 붙이고 "누르는 순간" 붙이는 이유 ──────────────────────
// view-transition-name은 문서 안에서 유일해야 한다. 목록에는 카드가 수십 장이라
// 전부 미리 붙여두면 이름이 겹치거나(같은 이름) 스냅샷 레이어가 수십 개 생겨
// 저사양 기기에서 무거워진다. 그래서 "지금 누른 카드"에만 그 자리에서 붙인다.
//
// ── 이름에 시설 id를 넣는 이유 ──────────────────────────────────────────
// 목록을 필터·정렬해 순서가 바뀌어도, 그리고 상세에서 "비슷한 시설" 카드를 눌러
// 다른 시설로 넘어가도, 항상 정확히 같은 시설끼리만 이어지게 하기 위해서다.

/** 한 시설에 대해 카드·상세가 공유할 이름들. id를 넣어 다른 시설과 절대 안 섞이게 한다. */
export function facilityTransitionNames(facilityId: string) {
  // CSS 식별자로 쓰이므로 영문·숫자·하이픈만 남긴다(시설 id는 "nhis2-pi961y" 같은 형태).
  const safe = facilityId.replace(/[^a-zA-Z0-9-]/g, "");
  return {
    hero: `fc-hero-${safe}`,
    title: `fc-title-${safe}`,
    badges: `fc-badges-${safe}`,
  };
}

/** 카드 안에서 각 요소를 찾기 위한 표시(data 속성). 카드와 이 파일만 알면 되는 약속이다. */
export const VT_PART = {
  hero: "data-vt-hero",
  title: "data-vt-title",
  badges: "data-vt-badges",
} as const;

/** 마지막으로 누른 시설 — 뒤로 돌아왔을 때 어느 카드와 이어줄지 기억해둔다. */
const LAST_KEY = "dolboda-vt-facility";

/**
 * 짝짓기는 "이름"이, 속도·시차 같은 스타일은 "클래스"가 맡는다.
 *
 * 이름에는 시설 id가 들어가 매번 달라지기 때문에(fc-hero-nhis2-xxx) 고정된 CSS로
 * 지목할 수가 없다. 그래서 app/globals.css는 view-transition-class(fc-hero/fc-text)로
 * 타이밍을 건다. 이 속성을 모르는 조금 옛 브라우저에서는 타이밍 조정만 무시되고
 * 브라우저 기본 전환으로 자연스럽게 동작한다.
 */
function applyNames(root: HTMLElement, names: ReturnType<typeof facilityTransitionNames>) {
  const set = (attr: string, name: string, cls: string) => {
    const el = root.querySelector<HTMLElement>(`[${attr}]`);
    if (!el) return;
    el.style.viewTransitionName = name;
    // setProperty를 쓰는 이유: view-transition-class는 아직 TypeScript의
    // CSSStyleDeclaration 타입에 없어서 el.style.viewTransitionClass로는 못 쓴다.
    el.style.setProperty("view-transition-class", cls);
  };
  set(VT_PART.hero, names.hero, "fc-hero");
  set(VT_PART.title, names.title, "fc-text");
  set(VT_PART.badges, names.badges, "fc-text");
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 이 브라우저가 전환 애니메이션을 지원하는지. 미지원이면 아래 함수들은 조용히 아무것도 안 한다. */
export function supportsViewTransition() {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

/**
 * 문서 안의 모든 카드에서 전환 이름을 떼어낸다.
 *
 * ★ 이게 없으면 전환이 통째로 취소된다. 같은 이름이 둘 이상이면 브라우저가
 *   InvalidStateError를 내며 애니메이션을 포기하기 때문이다. 뒤로 돌아왔을 때
 *   앞서 눌렀던 카드에 이름이 남아 있는 상황이 실제로 생긴다.
 */
export function clearFacilityTransitionNames() {
  if (typeof document === "undefined") return;
  const sel = `[${VT_PART.hero}],[${VT_PART.title}],[${VT_PART.badges}]`;
  document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
    el.style.viewTransitionName = "";
    el.style.removeProperty("view-transition-class");
  });
}

/**
 * 카드를 누른 순간 호출한다. 그 카드의 사진·시설명·배지에 상세 페이지와 짝이 될
 * 이름을 붙이고, 어느 시설이었는지 기억해둔다.
 *
 * 아무것도 안 하는 경우(전부 정상 동작, 전환만 없음):
 *  - 브라우저가 View Transitions를 지원하지 않을 때(iOS Safari 17 이하 등)
 *  - 사용자가 "움직임 줄이기"를 켜둔 때 — 큰 확대·이동 대신 짧은 페이드만 남긴다
 */
export function markFacilityCardForTransition(cardEl: HTMLElement | null, facilityId: string) {
  if (!cardEl || !supportsViewTransition() || prefersReducedMotion()) return;

  clearFacilityTransitionNames();

  const names = facilityTransitionNames(facilityId);
  applyNames(cardEl, names);

  try {
    sessionStorage.setItem(LAST_KEY, facilityId);
  } catch {
    // 시크릿 모드 등에서 sessionStorage가 막혀 있어도 전환 자체에는 지장 없다
  }
}

/**
 * 목록으로 되돌아왔을 때, 직전에 눌렀던 시설의 카드에 이름을 다시 붙인다.
 * 상세 → 목록 방향으로도 같은 요소끼리 이어지게 하기 위한 것이다.
 *
 * 그 카드가 화면에 없을 수도 있다(필터가 바뀌었거나, 목록이 아직 안 그려졌거나).
 * 그때는 아무것도 하지 않는다 — 짝을 못 찾으면 브라우저가 알아서 일반 페이드로
 * 처리하므로, 억지로 엉뚱한 카드에 붙여 순간이동처럼 보이게 만들지 않는다.
 */
export function restoreFacilityCardTransition() {
  if (!supportsViewTransition() || prefersReducedMotion()) return;

  let id: string | null = null;
  try {
    id = sessionStorage.getItem(LAST_KEY);
  } catch {
    return;
  }
  if (!id) return;

  clearFacilityTransitionNames();

  const card = document.querySelector<HTMLElement>(`[data-vt-card="${CSS.escape(id)}"]`);
  if (!card) return;

  applyNames(card, facilityTransitionNames(id));
}
