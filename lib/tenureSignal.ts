import { isHospital, type Facility, type FacilityType } from "./types";

// 직원 근속 신호 — "오래 일한 분들이 계속 돌봐주는가".
//
// 왜 이 지표인가:
//  - 국내 보호자 체크리스트가 공통으로 "직원 교체율"을 묻고, 미국 CMS는 2022년에
//    **이직률을 요양원 별점 체계에 새로 편입**했다. 규제기관과 보호자가 독립적으로
//    같은 신호를 지목한다.
//  - 우리는 공단 자료로 이미 26,235곳(91%)의 근속 분포를 갖고 있었는데, 시설 상세
//    페이지 안쪽에만 있고 검색으로는 못 좁혔다(실측 2026-08-06).
//
// 무엇을 하지 않는가:
//  - **이직률을 수치로 말하지 않는다.** "이 시설 이직률 40%"는 시설과 분쟁이 되고,
//    공단 자료는 퇴사 사유를 담지 않아 근거가 얇다. 근속 비율만 쓴다.
//  - **낮은 곳에 표시를 달지 않는다.** 좋은 곳에만 배지를 단다 — 없는 것을 강조하면
//    낙인이 된다(돌봄일지 반응 분포에서 0인 항목을 숨긴 것과 같은 판단).
//  - 요양병원은 아예 대상이 아니다(§ TENURE_MIN_STAFF 아래 주석).

/**
 * 유형별 "상위 25%" 경계 — 실제 분포의 3사분위수에서 뽑았다(2026-08-06 실측,
 * 2년 이상 근속 비율 기준). 임의로 정한 값이 아니므로 바꾸려면 분포부터 다시 볼 것.
 *
 *            p25   p50   p75(여기)  p90
 *  요양원     20%   43%   60%       75%   (n=6,083)
 *  주야간보호  0%   38%   62%       80%   (n=5,496)
 *  방문요양   11%   36%   52%       67%   (n=14,656)
 *
 * 안심지수 "우수"가 전국 상위 25%인 것과 같은 기준선이라, 두 필터가 같은 감각으로 읽힌다.
 *
 * ⚠️ 이 값과 TENURE_MIN_STAFF는 `scripts/send-facility-alerts.mjs`에 **사본이 하나 더** 있다
 *    (순수 node라 ts를 못 읽는다). 바꾸면 양쪽 다 고칠 것 — 한쪽만 고치면 화면에서 걸러진
 *    조건과 알림이 보내는 대상이 갈린다.
 */
const TENURE_GOOD_PCT: Partial<Record<FacilityType, number>> = {
  NURSING_HOME: 60,
  DAY_NIGHT_CARE: 62,
  HOME_CARE: 52,
};

/**
 * 표본 가드 — 직원이 너무 적으면 비율이 사람 한 명에 요동친다(2명 중 1명이면 50%).
 * 5명 기준으로 잘라도 요양원 93%·방문요양 96%·주야간 86%가 남는다(실측).
 *
 * 요양병원은 이 지표를 쓰지 않는다 — 근속 항목이 심평원 자료에 아예 없어
 * 1,282곳 전부가 데이터 0%다. 조건을 걸면 "조용히 0곳"이 된다.
 */
export const TENURE_MIN_STAFF = 5;

export interface TenureSignal {
  /** 2년 이상 근속 비율(%) — 반올림 */
  pct: number;
  /** 근속 자료에 잡힌 총원 */
  staff: number;
  /** 이 유형의 상위 25% 경계를 넘었는지 */
  isGood: boolean;
}

/**
 * 시설의 근속 신호를 계산한다. 쓸 수 없으면 null.
 *
 * 카드 목록과 시설 상세가 **같은 함수**를 써야 한다 — 화면마다 따로 계산하면
 * "목록에선 배지가 있는데 상세엔 없는" 어긋남이 생긴다.
 */
export function tenureSignalOf(f: Facility): TenureSignal | null {
  if (isHospital(f)) return null;
  const rows = f.tenure ?? [];
  if (rows.length === 0) return null;

  const staff = rows.reduce((s, t) => s + (Number(t.total) || 0), 0);
  if (staff < TENURE_MIN_STAFF) return null;

  const over2y = rows.reduce((s, t) => s + (Number(t.over2y) || 0), 0);
  const pct = Math.round((over2y / staff) * 100);
  const threshold = TENURE_GOOD_PCT[f.facilityType as FacilityType];
  return { pct, staff, isGood: threshold !== undefined && pct >= threshold };
}

/**
 * 돌봄직원 1명당 어르신 수. 보호자 체크리스트가 가장 먼저 묻는 값인데
 * 지금은 안심지수 총점에 녹아 있어 직접 비교가 안 된다.
 *
 * 정의는 lib/dolbodaScore.ts의 계산과 **같아야 한다** — 화면에 보이는 숫자와
 * 점수의 근거가 다르면 둘 다 못 믿게 된다.
 */
export function perCareWorkerOf(f: Facility): number | null {
  if (isHospital(f)) return null;
  const workers = f.careWorkerDetail?.total ?? 0;
  const capacity = f.capacity ?? 0;
  if (workers <= 0 || capacity <= 0) return null;
  return Math.round((capacity / workers) * 10) / 10;
}
