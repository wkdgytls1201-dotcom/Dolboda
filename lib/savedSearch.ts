import { FACILITY_TYPE_LABEL } from "./types";
import { PROGRAM_TAG_META, type ProgramTag } from "./programTaxonomy";
import type { FacilityFilters } from "./facilityFilters";

// 한 사람이 저장할 수 있는 검색조건 개수 — 활동 지역(MAX_REGIONS=10)보다 낮게 잡았다.
// 검색조건은 지역보다 훨씬 좁은 타겟이라 몇 개만 있어도 "저장한 조건마다 매일 새 시설을
// 훑는" 알림 스크립트 비용이 늘어난다.
export const MAX_SAVED_SEARCHES = 5;

/**
 * 사람이 읽는 요약 — 저장 목록·알림 메일에 그대로 쓴다.
 * ("요양원 · 3등급 이상 · 빈자리만" 처럼 조건을 앞에서부터 최대 4개까지 이어붙인다)
 */
export function summarizeFilters(filters: FacilityFilters): string {
  const parts: string[] = [];

  filters.types.forEach((t) => parts.push(FACILITY_TYPE_LABEL[t]));

  if (filters.grades.length > 0) {
    parts.push(`${Math.max(...filters.grades)}등급 이상`);
  }
  if (filters.maxDistanceKm != null) {
    parts.push(`${filters.maxDistanceKm}km 이내`);
  }
  filters.departments.forEach((d) => parts.push(d));
  filters.programTags.forEach((t) => parts.push(PROGRAM_TAG_META[t as ProgramTag]?.label ?? t));
  if (filters.onlyVacancy) parts.push("빈자리 있는 곳만");
  if (filters.verifiedOnly) parts.push("공공데이터 확인 시설");
  if (filters.goodScoreOnly) parts.push("안심지수 우수만");
  if (filters.hasPhotoOnly) parts.push("실사진 있는 곳만");
  if (filters.longTenureOnly) parts.push("오래 일한 직원 많은 곳");

  if (parts.length === 0) return "전체 시설";
  return parts.slice(0, 4).join(" · ") + (parts.length > 4 ? ` 외 ${parts.length - 4}개` : "");
}

/** 저장할 값이 하나도 없는 필터는 사실상 "전체"라 저장하는 의미가 없다 */
export function hasAnyFilter(filters: FacilityFilters): boolean {
  return (
    filters.types.length > 0 ||
    filters.grades.length > 0 ||
    filters.maxDistanceKm != null ||
    filters.departments.length > 0 ||
    filters.programTags.length > 0 ||
    filters.onlyVacancy ||
    filters.verifiedOnly ||
    filters.goodScoreOnly ||
    filters.hasPhotoOnly ||
    filters.longTenureOnly
  );
}
