// 비회원 무료 조회 한도 — 서로 다른 시설 5곳까지 상세정보를 무료로 보고,
// 6번째부터 로그인을 요청한다.
//
// 처음엔 2곳이었다. 초기 서비스에서는 가입 전환보다 이탈이 더 아프고, 보호자는 원래
// 서너 곳을 나란히 놓고 비교하는 사람들이라 2곳에서 막으면 비교 자체를 못 해본 채 떠난다.
// 반대로 무제한으로 두면 우리가 붙잡을 접점이 없어서, 비교를 한 바퀴 돌 만큼만 열어둔다.
const STORAGE_KEY = "mosim-guest-viewed-ids";
export const FREE_VIEW_LIMIT = 5;

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
