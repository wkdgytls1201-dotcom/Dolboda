// 최근 본 시설 — 홈의 "최근 본 시설" 섹션이 읽는 로컬 기록.
//
// 서버에 저장하지 않는 이유: 열람 이력은 건강 상황을 짐작케 하는 민감한 흔적이라
// 계정에 남기지 않는 쪽이 개인정보 면에서 가볍고, 서버 왕복·스키마도 필요 없다.
// viewLimit.ts(비회원 열람 제한)와 별개다 — 그쪽은 순서 없이 "몇 곳 봤나"만 세고
// 비회원만 기록하지만, 여기는 로그인 여부와 무관하게 "무엇을 언제 봤나"를 최신순으로 든다.
//
// ⚠️ 렌더 중에 읽지 말 것(CLAUDE.md — 하이드레이션 불일치). useLayoutEffect에서 읽는다.

const STORAGE_KEY = "dolboda-recent-facilities-v1";
const MAX_ENTRIES = 12;

type Entry = { id: string; at: number };

function read(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is Entry =>
        typeof e === "object" && e !== null && typeof e.id === "string" && typeof e.at === "number"
    );
  } catch {
    return [];
  }
}

/** 상세 페이지에서 호출 — 같은 시설은 맨 앞으로 끌어올리고, 최대 개수를 넘으면 오래된 것부터 버린다. */
export function recordRecentFacility(id: string) {
  try {
    const rest = read().filter((e) => e.id !== id);
    const next = [{ id, at: Date.now() }, ...rest].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장 실패(사파리 시크릿 모드 등)는 기능이 아니라 편의라 조용히 넘어간다
  }
}

/** 최신순 id 목록. */
export function getRecentFacilityIds(): string[] {
  return read().map((e) => e.id);
}
