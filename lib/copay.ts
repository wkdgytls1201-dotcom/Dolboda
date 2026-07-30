// 2026년 기준 장기요양보험 본인부담금 계산 상수.
// 월 한도액(1·2등급, 인지지원등급)과 본인부담률은 공개된 2026년 고시자료로 검증함.
// 3~5등급 한도액도 2026년 고시자료 기준으로 갱신함(요양24 등 공개 요약 기준).
// 시설급여 1일 수가는 등급별 고시금액이 매년/분기 갱신되므로 실제 서비스 적용 전
// 국민건강보험공단 장기요양보험 홈페이지의 최신 고시금액으로 반드시 재확인할 것 (현재는 공개된 요약치 기준 근사값).

export type LtciGrade = 1 | 2 | 3 | 4 | 5 | "cognitive";
export type ServiceType = "home" | "facility";
export type CopayTier = "general" | "reducedLight" | "reducedHeavy" | "basic";

export const LTCI_GRADE_LABEL: Record<LtciGrade, string> = {
  1: "1등급",
  2: "2등급",
  3: "3등급",
  4: "4등급",
  5: "5등급",
  cognitive: "인지지원등급",
};

// 재가급여 월 한도액(원)
export const HOME_CARE_MONTHLY_LIMIT: Record<LtciGrade, number> = {
  1: 2512900,
  2: 2331200,
  3: 1528200,
  4: 1409700,
  5: 1208900,
  cognitive: 676320,
};

// 시설급여 1일 수가(원) — 2026년 고시 요약치 기준 근사값, 실제 계약 전 고시금액 재확인 필요
export const FACILITY_CARE_DAILY_RATE: Partial<Record<LtciGrade, number>> = {
  1: 84000,
  2: 78000,
  3: 72000,
  4: 72000,
  5: 72000,
};

// 본인부담률 — 일반 15%(재가)/20%(시설), 40%감경 9%/12%, 60%감경 6%/8%, 기초생활수급자 0%
export const COPAY_RATE: Record<CopayTier, Record<ServiceType, number>> = {
  general: { home: 0.15, facility: 0.2 },
  reducedLight: { home: 0.09, facility: 0.12 }, // 40% 감경 구간
  reducedHeavy: { home: 0.06, facility: 0.08 }, // 60% 감경 구간
  basic: { home: 0, facility: 0 }, // 기초생활수급자
};

export const COPAY_TIER_LABEL: Record<CopayTier, string> = {
  general: "일반",
  reducedLight: "감경 40%",
  reducedHeavy: "감경 60%",
  basic: "기초생활수급자",
};

export function calcHomeCareCopay(grade: LtciGrade, tier: CopayTier, usageAmount: number) {
  const limit = HOME_CARE_MONTHLY_LIMIT[grade];
  const withinLimit = Math.min(usageAmount, limit);
  const overLimit = Math.max(0, usageAmount - limit);
  const rate = COPAY_RATE[tier].home;
  const withinLimitCopay = Math.round(withinLimit * rate);
  const copay = withinLimitCopay + overLimit;
  return { limit, withinLimit, overLimit, withinLimitCopay, copay };
}

export function calcFacilityCareCopay(
  grade: LtciGrade,
  tier: CopayTier,
  days: number,
  monthlyMealCost: number,
  monthlySnackCost: number
) {
  const dailyRate = FACILITY_CARE_DAILY_RATE[grade] ?? 0;
  const careCost = dailyRate * days;
  const rate = COPAY_RATE[tier].facility;
  const careCopay = Math.round(careCost * rate);
  const nonCoveredCost = monthlyMealCost + monthlySnackCost;
  const copay = careCopay + nonCoveredCost;
  return {
    dailyRate,
    careCost,
    careCopay,
    mealCost: monthlyMealCost,
    snackCost: monthlySnackCost,
    nonCoveredCost,
    copay,
  };
}
