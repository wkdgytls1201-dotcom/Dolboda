import { isHospital, type Facility, type FacilityType } from "./types";
import type { ProgramTag } from "./programTaxonomy";
import { haversineDistanceKm } from "./distance";
import { scoreThresholdsOf } from "./dolbodaScore";

// FilterBar.tsx(클라이언트 컴포넌트)와 서버 쪽(API 라우트·lib/savedSearch.ts)이
// 같은 타입을 써야 하는데, 클라이언트 컴포넌트 파일에서 값을 import하면 그 파일 전체
// ("use client" + lucide-react 아이콘 + AuthModal 등)가 서버 함수 번들에 딸려 들어간다.
// 그래서 타입·상수만 이 순수 파일에 두고 양쪽이 여기서 가져다 쓴다.

export interface FacilityFilters {
  types: FacilityType[];
  grades: number[];
  maxDistanceKm: number | null;
  departments: string[];
  onlyVacancy: boolean;
  verifiedOnly: boolean;
  /** 프로그램 태그 — 공단 프로그램 12만 건을 분류해 만든 필터 */
  programTags: ProgramTag[];
  /** 안심지수 "우수"(전국 상위 25%) 이상만 — 돌보다의 핵심 지표를 필터 첫 자리에 내세운다 */
  goodScoreOnly: boolean;
  /**
   * 실사진이 있는 시설만.
   *
   * 사진 없는 카드는 일러스트나 로드뷰로 채워지는데, 보호자 입장에서 "실제로 어떻게
   * 생겼는지 본 곳"과 "안 본 곳"은 판단의 무게가 다르다. 전국 사진 보유율
   * 32%(2026-08-06 초) → 86.6%(2026-08-07, 전국 파이프라인 완료) — 더는 "결과를 크게
   * 줄이는" 필터가 아니라 기본 기대치에 가깝다. 기본값은 여전히 꺼짐(opt-in) —
   * 사용자가 "최대 노출 우선" 원칙으로 명시적으로 유지 결정함(2026-08-07). 임의로 켜지 말 것.
   */
  hasPhotoOnly: boolean;
  /**
   * 2년 이상 일한 직원 비율이 그 유형의 상위 25%인 곳만.
   *
   * 보호자 체크리스트가 공통으로 "직원 교체율"을 묻고, 미국 CMS는 이직률을 요양원
   * 별점에 편입했다. 우리는 공단 자료로 26,235곳(91%)의 근속 분포를 이미 갖고 있었는데
   * 시설 상세 안쪽에만 있었다. 판정은 lib/tenureSignal.ts 한 곳에서만 한다.
   *
   * ⚠️ 요양병원은 이 조건을 적용하지 않는다 — 심평원 자료에 근속 항목이 없어
   *    1,282곳 전부 데이터가 없다. 거르면 "조용히 0곳"이 된다.
   */
  longTenureOnly: boolean;
  /**
   * 같은 기관이 함께 제공하는 다른 급여 — 전부 만족해야 통과(AND).
   *
   * 방문목욕이 특히 실질적이다(10,348곳 보유). 거동이 어려운 어르신에게 목욕은 가장
   * 힘든 일이고 "방문요양 받는 곳에서 목욕도 되나"는 보호자가 반드시 묻는 것인데,
   * 지금까지는 시설을 하나씩 열어봐야 알 수 있었다(상세의 한 줄로만 있었다).
   *
   * ⚠️ 근속 필터와 달리 **입소 시설(요양원·요양병원)을 예외 처리하지 않는다.**
   *    그쪽에 이 값이 없는 건 데이터 결손이 아니라 **실제로 방문 서비스를 안 하기
   *    때문**이라, 걸러지는 게 맞다(실측: 요양원·요양병원 0%, 재가 58.8%, 주야간 20%).
   *    대신 필터 화면에서 그 이유를 미리 밝힌다.
   */
  extraServices: string[];
}

/** 필터로 낼 부가 급여 — 표본이 얇은 것(단기보호 47곳)과 별도 화면이 있는 것(복지용구)은 뺐다 */
export const EXTRA_SERVICE_OPTIONS = ["방문목욕", "방문요양", "방문간호"] as const;

export const EMPTY_FILTERS: FacilityFilters = {
  types: [],
  grades: [],
  maxDistanceKm: null,
  departments: [],
  onlyVacancy: false,
  verifiedOnly: false,
  programTags: [],
  goodScoreOnly: false,
  hasPhotoOnly: false,
  longTenureOnly: false,
  extraServices: [],
};

// ---------------------------------------------------------------------------
// 클라이언트 필터 파이프라인 — 원래 SearchPageClient의 useMemo 안에 있었다.
// 필터 바텀시트가 "임시 조건으로 몇 곳이 남는지"를 적용 전에 계산해야 해서
// (같은 규칙을 두 벌 두면 반드시 어긋난다) 순수 함수로 뽑아 양쪽이 공유한다.

export type SearchSortKey = "distance" | "grade" | "score";

export interface FilterContext {
  query: string;
  origin: { lat: number; lng: number };
  hasLocation: boolean;
  /** 내 주변 최근접 API를 쓰는 화면인지 — 프로그램 태그를 클라이언트에서 한 번 더 거를지 결정 */
  useNearest: boolean;
  sortKey: SearchSortKey;
}

export interface FilteredItem {
  f: Facility;
  dist: number | undefined;
}

/** 필터만 적용(정렬 없음) — 결과 수 계산은 이걸로 충분하다 */
export function filterFacilityList(
  facilities: Facility[],
  filters: FacilityFilters,
  ctx: FilterContext
): FilteredItem[] {
  let list: FilteredItem[] = facilities.map((f) => ({
    f,
    dist:
      f.lat !== undefined && f.lng !== undefined
        ? haversineDistanceKm(ctx.origin.lat, ctx.origin.lng, f.lat, f.lng)
        : undefined,
  }));

  if (ctx.query.trim()) {
    const q = ctx.query.trim().toLowerCase();
    list = list.filter(
      (x) => x.f.name.toLowerCase().includes(q) || x.f.address.toLowerCase().includes(q)
    );
  }
  // 시설 유형은 서버 쿼리가 걸러 오는 게 기본이지만, 바텀시트의 임시 조건 계산처럼
  // "서버 범위보다 좁혀 보는" 경우가 있어 여기서도 한 번 거른다(서버와 중복 적용해도 무해).
  if (filters.types.length > 0) {
    list = list.filter((x) => filters.types.includes(x.f.facilityType));
  }
  if (filters.grades.length > 0) {
    list = list.filter((x) => x.f.grade !== null && filters.grades.includes(x.f.grade));
  }
  if (filters.maxDistanceKm !== null) {
    list = list.filter((x) => x.dist !== undefined && x.dist <= filters.maxDistanceKm!);
  }
  // 등급·안심지수순 + 위치 있음 + 검색어 없음 → 내 주변 100km로 좁힌다(검색 화면의 기존 규칙)
  if ((ctx.sortKey === "grade" || ctx.sortKey === "score") && ctx.hasLocation && !ctx.query.trim()) {
    list = list.filter((x) => x.dist !== undefined && x.dist <= 100);
  }
  if (filters.departments.length > 0) {
    list = list.filter(
      (x) => isHospital(x.f) && x.f.departments.some((d) => filters.departments.includes(d.name))
    );
  }
  // 프로그램 태그: 목록 API는 서버가 걸러 오지만 nearby API는 안 걸러 온다 — 그 경우만 여기서.
  // 임시 조건 계산(useNearest와 무관하게 로컬 목록 대상)도 이 분기로 정확히 동작한다.
  if (filters.programTags.length > 0 && ctx.useNearest) {
    list = list.filter((x) => {
      const tags = isHospital(x.f) ? [] : x.f.programTags ?? [];
      const owned = new Set(tags.map((t) => t.tag));
      return filters.programTags.every((t) => owned.has(t));
    });
  }
  if (filters.onlyVacancy) {
    list = list.filter((x) => {
      if (isHospital(x.f)) return true;
      if (x.f.capacity === 0) return true;
      if (x.f.currentOccupancy === undefined) return false;
      return x.f.capacity - x.f.currentOccupancy > 0;
    });
  }
  if (filters.verifiedOnly) {
    list = list.filter((x) => x.f.dataSource === "public");
  }
  if (filters.goodScoreOnly) {
    // 문턱은 유형별이다 — 전체 하나로 재면 방문요양 15,677곳 중 0.5%만 통과해
    // "방문요양 + 안심지수 우수"가 사실상 죽은 조합이 된다(실측 2026-08-06).
    list = list.filter(
      (x) => (x.f.dolbodaTotal ?? 0) >= scoreThresholdsOf(x.f.facilityType).good
    );
  }
  if (filters.hasPhotoOnly) {
    // 카드 페이로드는 photos를 첫 장만 싣는다(lib/facilityRepo.ts) — 있고 없고만 보면 된다.
    //
    // ⚠️ 요양병원은 제외한다 — 공단 시설사진은 장기요양기관만 있고 심평원 자료에는
    //    사진 항목이 아예 없다(실측 2026-08-06: 요양병원 1,282곳 중 실사진 0곳).
    //    거르면 "요양병원 + 실사진" 조합이 **항상 0곳**이 된다. 근속 필터와 같은 이유.
    list = list.filter((x) => isHospital(x.f) || (x.f.photos?.length ?? 0) > 0);
  }
  if (filters.extraServices.length > 0) {
    // 입소 시설은 여기서 자연히 걸러진다 — 방문 서비스를 제공하지 않으니 맞는 동작이다.
    list = list.filter((x) => {
      // 요양병원은 이 항목 자체가 없는 유형이라 빈 배열로 본다(programTags와 같은 처리)
      const owned = new Set(isHospital(x.f) ? [] : x.f.otherServices ?? []);
      return filters.extraServices.every((s) => owned.has(s));
    });
  }
  if (filters.longTenureOnly) {
    // 요양병원은 근속 자료 자체가 없다 — 거르면 통째로 사라지므로 조건에서 제외한다.
    // 판정값(tenureGood)은 서버가 lib/tenureSignal.ts로 미리 계산해 실어준다.
    list = list.filter((x) => isHospital(x.f) || x.f.tenureGood === true);
  }
  return list;
}

/** 필터 + 정렬 — 검색 화면의 결과 목록이 쓴다 */
export function filterAndSortFacilityList(
  facilities: Facility[],
  filters: FacilityFilters,
  ctx: FilterContext
): FilteredItem[] {
  const list = filterFacilityList(facilities, filters, ctx);
  list.sort((a, b) => {
    if (ctx.sortKey === "distance") return (a.dist ?? Infinity) - (b.dist ?? Infinity);
    if (ctx.sortKey === "grade") {
      if (a.f.grade === null) return 1;
      if (b.f.grade === null) return -1;
      const aScore = !isHospital(a.f) ? a.f.evaluationDetail?.totalScore ?? 0 : 0;
      const bScore = !isHospital(b.f) ? b.f.evaluationDetail?.totalScore ?? 0 : 0;
      return a.f.grade - b.f.grade || bScore - aScore;
    }
    const aTotal = a.f.dolbodaTotal ?? -1;
    const bTotal = b.f.dolbodaTotal ?? -1;
    return bTotal - aTotal || (a.dist ?? Infinity) - (b.dist ?? Infinity);
  });
  return list;
}
