import type { FacilityType } from "./types";
import type { ProgramTag } from "./programTaxonomy";

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
}

export const EMPTY_FILTERS: FacilityFilters = {
  types: [],
  grades: [],
  maxDistanceKm: null,
  departments: [],
  onlyVacancy: false,
  verifiedOnly: false,
  programTags: [],
  goodScoreOnly: false,
};
