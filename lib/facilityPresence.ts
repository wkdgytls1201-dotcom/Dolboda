// 폐업 추정 시설의 노출 판단 — 단일 기준점.
//
// Facility.missingSince = 공단 일일 파일에서 처음 사라진 날(daily-nhis-sync.mjs가 기록,
// 다시 나타나면 null 복구). 하루 이틀은 데이터 누락일 수 있어 7일 연속 사라진 시설만
// 사이트맵에서 빼고 페이지를 noindex한다. 행 삭제는 하지 않는다 — 스냅샷·상담 연결이
// 있을 수 있고, "언제 사라졌나"가 지역별 폐업 집계의 근거라서다.
//
// ⚠️ "폐업 확정"이 아니다: 이름+주소 해시 매칭이라 상호명 변경·이전도 여기 잡힌다.
//    사용자에게 보이는 문구도 "확인되지 않음"까지만 말한다.

export const MISSING_HIDE_DAYS = 7;

/** 색인·사이트맵에서 감출 만큼 오래(7일+) 파일에서 사라진 시설인가 */
export function missingLongEnough(missingSince: Date | null): boolean {
  if (!missingSince) return false;
  return Date.now() - missingSince.getTime() >= MISSING_HIDE_DAYS * 86_400_000;
}

/** Prisma where 조각 — "아직 노출해도 되는 시설" (사라진 적 없거나 7일 미만) */
export function presentFacilityWhere() {
  const cutoff = new Date(Date.now() - MISSING_HIDE_DAYS * 86_400_000);
  return { OR: [{ missingSince: null }, { missingSince: { gt: cutoff } }] };
}
