// 2026년 기준 장기요양보험 본인부담금 계산 상수.
// 월 한도액·본인부담률·시설급여/주야간보호/방문요양 수가 전부 2026년 고시 공개자료로
// 대조 확인함 (2026-07-31). 고시는 해마다 개정되므로 연초마다 이 파일의 금액을 재확인할 것.
// 확인 출처: 보건복지부 고시 요약(장기요양급여 제공기준 및 급여비용 산정방법), 공개 수가표.

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

// 시설급여(노인요양시설) 1일 수가(원) — 2026년 고시 기준 (2026-07-31 공개자료 대조 확인)
export const FACILITY_CARE_DAILY_RATE: Partial<Record<LtciGrade, number>> = {
  1: 93070,
  2: 86340,
  3: 81540,
  4: 81540,
  5: 81540,
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

// 주야간보호 1일 수가(원) — 등급·이용시간대별, 2026년 고시 기준 (2026-07-31 공개자료 대조 확인)
export type DayNightBand = "3to6" | "6to8" | "8to10" | "10to13";

export const DAY_NIGHT_BAND_LABEL: Record<DayNightBand, string> = {
  "3to6": "3~6시간",
  "6to8": "6~8시간",
  "8to10": "8~10시간",
  "10to13": "10시간 이상",
};

export const DAY_NIGHT_DAILY_RATE: Record<DayNightBand, Record<LtciGrade, number>> = {
  "3to6": { 1: 41820, 2: 38720, 3: 35740, 4: 34120, 5: 32490, cognitive: 32490 },
  "6to8": { 1: 56060, 2: 51930, 3: 47940, 4: 46300, 5: 44650, cognitive: 44650 },
  "8to10": { 1: 69730, 2: 64590, 3: 59640, 4: 58010, 5: 56360, cognitive: 56360 },
  "10to13": { 1: 76820, 2: 71160, 3: 65750, 4: 64090, 5: 62460, cognitive: 56360 },
};

// 방문요양 1회 방문 수가(원) — 방문시간별, 2026년 고시 기준 (2026-07-31 공개자료 대조 확인)
export const HOME_VISIT_RATE: Record<number, number> = {
  30: 17450,
  60: 25320,
  90: 34120,
  120: 43430,
  150: 50640,
  180: 57020,
  210: 63530,
  240: 70080,
};

export const HOME_VISIT_MINUTES = [60, 90, 120, 180, 240] as const;

export function calcDayNightCopay(
  grade: LtciGrade,
  tier: CopayTier,
  daysPerMonth: number,
  band: DayNightBand,
  dailyMealCost: number
) {
  const dailyRate = DAY_NIGHT_DAILY_RATE[band][grade];
  const usageAmount = dailyRate * daysPerMonth;
  const base = calcHomeCareCopay(grade, tier, usageAmount);
  const mealCost = dailyMealCost * daysPerMonth;
  return { ...base, dailyRate, usageAmount, mealCost, copay: base.copay + mealCost };
}

export function calcHomeVisitCopay(
  grade: LtciGrade,
  tier: CopayTier,
  visitsPerMonth: number,
  minutes: number
) {
  const visitRate = HOME_VISIT_RATE[minutes] ?? 0;
  const usageAmount = visitRate * visitsPerMonth;
  const base = calcHomeCareCopay(grade, tier, usageAmount);
  return { ...base, visitRate, usageAmount };
}

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
