// 비회원 무료 조회 한도 — 서로 다른 시설 2곳까지만 상세정보를 무료로 볼 수 있다.
const STORAGE_KEY = "mosim-guest-viewed-ids";
export const FREE_VIEW_LIMIT = 2;

export function getViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function canViewFacility(id: string): boolean {
  const viewed = getViewedIds();
  return viewed.includes(id) || viewed.length < FREE_VIEW_LIMIT;
}

export function registerFacilityView(id: string) {
  const viewed = getViewedIds();
  if (!viewed.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...viewed, id]));
  }
}
