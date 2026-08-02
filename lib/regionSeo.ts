// 지역 SEO 랜딩 페이지(/region/...)용 시/도 매핑.
// slug = URL·검색 키워드에 쓰는 짧은 이름, prefixes = 주소 첫 토큰 매칭용.
// 데이터가 없는 지역(현재 인천/전북/경북)은 페이지가 자동으로 404 되고,
// 나중에 시설 데이터가 들어오면 별도 작업 없이 페이지가 살아난다.

export interface RegionSeo {
  slug: string; // URL 경로 + 짧은 표기 (예: "경남")
  label: string; // 화면·제목 표기 (예: "경남")
  full: string; // 행정구역 전체 이름 (예: "경상남도")
  prefixes: string[]; // 주소가 이 중 하나로 시작하면 해당 지역
}

export const REGION_SEO: RegionSeo[] = [
  { slug: "서울", label: "서울", full: "서울특별시", prefixes: ["서울"] },
  { slug: "경기", label: "경기", full: "경기도", prefixes: ["경기"] },
  { slug: "인천", label: "인천", full: "인천광역시", prefixes: ["인천"] },
  { slug: "부산", label: "부산", full: "부산광역시", prefixes: ["부산"] },
  { slug: "대구", label: "대구", full: "대구광역시", prefixes: ["대구"] },
  { slug: "대전", label: "대전", full: "대전광역시", prefixes: ["대전"] },
  { slug: "울산", label: "울산", full: "울산광역시", prefixes: ["울산"] },
  { slug: "세종", label: "세종", full: "세종특별자치시", prefixes: ["세종"] },
  { slug: "강원", label: "강원", full: "강원특별자치도", prefixes: ["강원"] },
  { slug: "충북", label: "충북", full: "충청북도", prefixes: ["충청북도", "충북"] },
  { slug: "충남", label: "충남", full: "충청남도", prefixes: ["충청남도", "충남"] },
  { slug: "전북", label: "전북", full: "전북특별자치도", prefixes: ["전라북도", "전북"] },
  {
    slug: "전남광주",
    label: "전남·광주",
    full: "전남광주통합특별시",
    prefixes: ["전남광주", "전라남도", "광주"],
  },
  { slug: "경북", label: "경북", full: "경상북도", prefixes: ["경상북도", "경북"] },
  { slug: "경남", label: "경남", full: "경상남도", prefixes: ["경상남도", "경남"] },
  { slug: "제주", label: "제주", full: "제주특별자치도", prefixes: ["제주"] },
];

export function findRegionBySlug(slug: string): RegionSeo | undefined {
  return REGION_SEO.find((r) => r.slug === slug);
}

export function findRegionByAddress(address: string): RegionSeo | undefined {
  return REGION_SEO.find((r) => r.prefixes.some((p) => address.startsWith(p)));
}

// 주소 두 번째 토큰 = 시/군/구 (예: "경상남도 사천시 ..." → "사천시")
/**
 * 스폰서 슬롯 등에서 쓰는 지역 정규 키 — "경남 김해시"처럼 `시도 slug + 시군구`.
 *
 * 주소 표기("경상남도")와 slug("경남")가 섞여 저장되면 같은 지역이 두 키로 갈라져
 * 슬롯 상한도 노출 조회도 어긋난다. 저장하는 쪽(관리자 승인)과 읽는 쪽(지역 페이지)이
 * 반드시 이 함수를 함께 쓴다. 클라이언트에서도 안전하다(순수 데이터만 사용).
 */
export function canonicalRegionKey(address: string): string | null {
  const sido = address.split(/\s+/)[0] ?? "";
  const region = REGION_SEO.find((r) => r.prefixes.some((p) => sido.startsWith(p)));
  const sigungu = sigunguOf(address);
  if (!region || !sigungu) return null;
  return `${region.slug} ${sigungu}`;
}

export function sigunguOf(address: string): string | null {
  const token = address.split(/\s+/)[1];
  if (!token) return null;
  return /(시|군|구)$/.test(token) ? token : null;
}

// 주소 끝 괄호 안 첫 지명 = 읍/면/동 (예: "... (곤양면, OO아파트)" → "곤양면")
export function subLocalityOf(address: string): string | null {
  const m = address.match(/\(([^)]+)\)\s*$/);
  if (!m) return null;
  const first = m[1].split(",")[0].trim();
  return /(읍|면|동|가|리)$/.test(first) ? first : null;
}
