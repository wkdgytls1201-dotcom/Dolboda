import type { TrendPoint } from "./vacancyTrend";

// 자리 인사이트 — 매일 모은 스냅샷에서 "이 시설에 들어갈 수 있을까"를 읽어낸다.
// 설계·근거·한계는 docs/vacancy-insight-spec.md에 정리했다. 지표를 바꾸기 전에 읽을 것.
//
// ★ 이 파일이 다루는 것은 공단이 공개하지 않는 정보다. 공단은 "오늘 정원/현원/대기"만
//   공개하고 어제 값은 주지 않는다. 우리가 매일 저장했기 때문에 "변화"를 말할 수 있고,
//   그 변화가 보호자의 진짜 질문("대기 걸어야 하나, 얼마나 기다리나")에 답한다.
//
// ★ 과장 금지 원칙: 표본이 얇으면 지표를 만들지 않는다. 예측은 "추정"이라 밝히고
//   근거 기간을 함께 보여준다. 공공데이터의 갱신 지연·집계 시점 차이를 감안하면
//   하루 이틀 단위 변화는 잡음이라, 지표는 전부 "며칠 이상 관측"을 전제로 계산한다.

/** 관측 일수에 따른 신뢰도. 화면은 이 값으로 무엇을 보여줄지 정한다. */
export type InsightConfidence = "none" | "low" | "medium" | "high";

export const CONFIDENCE_DAYS = {
  low: 7, // 일주일 — 주중/주말 한 바퀴
  medium: 14, // 2주 — 짧은 추세가 보이기 시작
  high: 30, // 한 달 — 회전 빈도를 말할 수 있는 최소치
} as const;

export function confidenceOf(days: number): InsightConfidence {
  if (days >= CONFIDENCE_DAYS.high) return "high";
  if (days >= CONFIDENCE_DAYS.medium) return "medium";
  if (days >= CONFIDENCE_DAYS.low) return "low";
  return "none";
}

export interface VacancyInsight {
  /** 관측한 날 수(forward-fill 후) */
  days: number;
  confidence: InsightConfidence;
  /** 관측 기간 중 "자리가 새로 난" 횟수 — 빈자리가 0에서 양수로 바뀐 사건 */
  openings: number;
  /** 관측일 중 정원이 찼던 날의 비율(0~1) */
  fullRatio: number;
  /** 평균 빈자리 수 */
  avgVacancy: number;
  /** 지금 대기 인원 */
  waitlist: number;
  /**
   * 대기 감소 속도(명/일). 양수면 줄어드는 중, 음수면 늘어나는 중.
   * 최소제곱 직선의 기울기를 부호만 뒤집은 값이다.
   */
  waitPerDay: number;
  /**
   * 예상 대기 기간(일). 지금 대기 인원이 지금 속도로 빠질 때의 추정치.
   * 신뢰도 medium 이상 + 실제로 줄고 있을 때만 값이 있다(그 외 null).
   */
  estimatedWaitDays: number | null;
}

/** 최소제곱 직선의 기울기 — x는 0,1,2… (일), y는 대기 인원 */
function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * 추이 시계열에서 인사이트를 뽑는다.
 *
 * 관측이 CONFIDENCE_DAYS.low(7일) 미만이면 null — 3~4일치로 "회전율"이나 "대기 속도"를
 * 말하면 공공데이터의 갱신 지연을 추세로 착각해 보호자를 오도한다.
 */
export function computeVacancyInsight(series: TrendPoint[]): VacancyInsight | null {
  const days = series.length;
  const confidence = confidenceOf(days);
  if (confidence === "none") return null;

  // "자리가 났다" 사건 — 0에서 양수로 바뀐 순간만 센다. 빈자리가 3→5로 는 것은
  // 같은 자리의 재집계일 수 있어 사건으로 세지 않는다(과대 계상 방지).
  let openings = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i - 1].vacancy === 0 && series[i].vacancy > 0) openings++;
  }

  const fullDays = series.filter((s) => s.vacancy === 0).length;
  const avgVacancy = series.reduce((s, p) => s + p.vacancy, 0) / days;
  const latest = series[series.length - 1];

  // 대기는 줄어드는 게 "좋은" 방향이라, 기울기 부호를 뒤집어 "하루에 몇 명씩 빠지나"로 읽는다
  const waitPerDay = -slope(series.map((s) => s.waitlist));

  // 예측은 조건이 다 맞을 때만 낸다:
  //  - 2주 이상 관측(medium+)  - 대기가 실제로 있고  - 실제로 줄고 있고
  //  - 속도가 잡음 수준(0.05명/일 미만)이 아닐 것
  const estimatedWaitDays =
    confidence !== "low" && latest.waitlist > 0 && waitPerDay >= 0.05
      ? Math.ceil(latest.waitlist / waitPerDay)
      : null;

  return {
    days,
    confidence,
    openings,
    fullRatio: fullDays / days,
    avgVacancy: Math.round(avgVacancy * 10) / 10,
    waitlist: latest.waitlist,
    waitPerDay: Math.round(waitPerDay * 100) / 100,
    estimatedWaitDays,
  };
}

/**
 * 인사이트를 보호자가 읽는 문장들로 바꾼다.
 * 숫자만 던지지 않는다 — 이 화면의 독자는 50~70대이고, 판단에 쓸 말이 필요하다.
 * 확정적으로 말할 수 있는 것(관측된 사실)과 추정(예측)을 문장에서 구분한다.
 */
export function insightSentences(insight: VacancyInsight): {
  facts: string[];
  estimate: string | null;
  caveat: string;
} {
  const facts: string[] = [];

  if (insight.fullRatio >= 0.9) {
    facts.push(`관측한 ${insight.days}일 중 대부분 정원이 차 있었어요.`);
  } else if (insight.fullRatio <= 0.1) {
    facts.push(`관측한 ${insight.days}일 내내 빈자리가 있었어요.`);
  } else {
    facts.push(
      `관측한 ${insight.days}일 중 ${Math.round(insight.fullRatio * 100)}%는 정원이 찬 상태였어요.`
    );
  }

  if (insight.openings > 0) {
    facts.push(`그 사이 자리가 ${insight.openings}번 났어요.`);
  } else if (insight.fullRatio >= 0.9) {
    facts.push("그 사이 새로 난 자리는 없었어요.");
  }

  if (insight.waitlist > 0) {
    if (insight.waitPerDay >= 0.05) {
      facts.push(`대기는 ${insight.waitlist}명이고, 하루 평균 ${insight.waitPerDay}명씩 줄고 있어요.`);
    } else if (insight.waitPerDay <= -0.05) {
      facts.push(
        `대기는 ${insight.waitlist}명이고, 하루 평균 ${Math.abs(insight.waitPerDay)}명씩 늘고 있어요.`
      );
    } else {
      facts.push(`대기는 ${insight.waitlist}명으로 거의 그대로예요.`);
    }
  }

  const estimate =
    insight.estimatedWaitDays !== null
      ? `지금 속도가 이어진다면 대기가 빠지는 데 약 ${insight.estimatedWaitDays}일 걸릴 것으로 보여요.`
      : null;

  // 신뢰도를 문장으로 밝힌다 — 짧은 관측을 긴 관측처럼 보이게 하지 않는다
  const caveat =
    insight.confidence === "low"
      ? `아직 ${insight.days}일치만 모았어요. 기간이 쌓일수록 정확해져요.`
      : insight.confidence === "medium"
        ? `최근 ${insight.days}일 기록을 바탕으로 한 추정이에요.`
        : `최근 ${insight.days}일 기록을 바탕으로 한 추정이에요. 실제 입소는 시설 사정에 따라 달라요.`;

  return { facts, estimate, caveat };
}
