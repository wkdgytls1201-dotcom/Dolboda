// 알림(관심 지역)과 돌보다 매니저 활동 가능 지역에서 공용으로 쓰는 시/도 목록.
export const REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

// ── 전남·광주 행정통합(2026 개편) 대응 ─────────────────────────────────────
// 공단 주소가 "전남광주통합특별시 ○구/○시 …"로 바뀌었다(일일 동기화가 조용히 반영,
// 2026-08-06 실측 2,365곳). REGIONS는 "광주"/"전남"을 계속 나눠 쓰므로, 통합시 주소는
// 두 번째 토큰(광주 5개 자치구인지)으로 갈라야 한다 — 접두어만으론 구분 불가.
// "일하기 좋은 시설 광주 탭 0곳" 버그의 원인이 이 표기 변화였다.
export const MERGED_JEONNAM_GWANGJU = "전남광주통합특별시";
export const GWANGJU_DISTRICTS = ["동구", "서구", "남구", "북구", "광산구"] as const;

/** 통합시 주소를 "광주"/"전남"으로 가른다. 통합시 주소가 아니면 null. */
export function splitMergedJeonnamGwangju(address: string): "광주" | "전남" | null {
  if (!address.startsWith(MERGED_JEONNAM_GWANGJU)) return null;
  const second = address.slice(MERGED_JEONNAM_GWANGJU.length).trim().split(/\s+/)[0] ?? "";
  return (GWANGJU_DISTRICTS as readonly string[]).includes(second) ? "광주" : "전남";
}

/** 주소가 REGIONS 라벨의 지역에 속하는지 — 광주/전남은 통합시 표기·구 단위까지 판정 */
export function addressMatchesRegionLabel(label: string, address: string): boolean {
  if (label === "광주") {
    return address.startsWith("광주광역시") || splitMergedJeonnamGwangju(address) === "광주";
  }
  if (label === "전남") {
    return address.startsWith("전라남도") || splitMergedJeonnamGwangju(address) === "전남";
  }
  return address.startsWith(label);
}
