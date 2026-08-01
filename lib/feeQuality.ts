// 비급여 비용 데이터 품질 검사.
// 공단 원본에는 "1일 1원", "월 31원" 같은 값이 섞여 있다(입력 실수·자리수 누락 추정).
// 요양시설 정보는 신뢰가 생명이라, 이런 값을 숫자 그대로 보여주지 않고 "확인 필요"로 표시한다.
// 원칙: 원본을 고쳐 쓰지 않는다. 이상해 보인다는 사실만 알리고 시설 문의로 안내한다.

export interface NonCoveredFee {
  name: string;
  daily: number;
  monthly: number;
}

export type FeeQuality =
  | { kind: "ok" }
  /** 값이 없음(0원) — 공개하지 않은 항목 */
  | { kind: "unpublished" }
  /** 자릿수가 어긋난 것으로 보이는 값 */
  | { kind: "suspicious"; reason: string };

// 1일 500원 미만은 실제 비급여로 성립하기 어렵다(가장 싼 간식비도 1일 1,000원대).
const MIN_PLAUSIBLE_DAILY = 500;
// 월 15,000원 미만도 마찬가지 (1일 500원 × 30일)
const MIN_PLAUSIBLE_MONTHLY = 15000;

export function checkFee(fee: NonCoveredFee): FeeQuality {
  const daily = Number(fee.daily) || 0;
  const monthly = Number(fee.monthly) || 0;

  if (daily <= 0 && monthly <= 0) return { kind: "unpublished" };

  if (daily > 0 && daily < MIN_PLAUSIBLE_DAILY) {
    return { kind: "suspicious", reason: `1일 ${daily.toLocaleString()}원으로 입력돼 있어요` };
  }
  if (daily <= 0 && monthly > 0 && monthly < MIN_PLAUSIBLE_MONTHLY) {
    return { kind: "suspicious", reason: `월 ${monthly.toLocaleString()}원으로 입력돼 있어요` };
  }
  return { kind: "ok" };
}

/** 시뮬레이터 기본값 등으로 쓸 수 있는, 신뢰할 만한 식비만 추린다 */
export function usableMealFee(fees: NonCoveredFee[] | undefined): number | null {
  if (!fees) return null;
  const meal = fees.find((f) => f.name.includes("식재료") || f.name.includes("식비"));
  if (!meal || checkFee(meal).kind !== "ok") return null;
  return meal.daily > 0 ? meal.daily : null;
}

/** 월 환산 기준 — 공단 원본이 31일 기준이라 화면에도 그대로 밝힌다 */
export const MONTHLY_BASIS_NOTE = "월 금액은 공단 공개자료의 31일 기준 값이에요.";
