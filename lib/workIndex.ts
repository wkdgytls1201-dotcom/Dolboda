// 돌보다 근무환경 지수 — 돌보다 매니저(요양보호사·간병인)용 지표.
// 안심지수가 "보호자에게 좋은 시설"이라면, 이건 "일하는 사람에게 좋은 시설"을 본다.
// 같은 공공데이터를 반대편 시선으로 다시 읽는 것이 핵심 아이디어다.
//
// 원칙은 안심지수와 동일하다:
//  1) 없는 데이터는 지어내지 않는다 — 미확보 신호는 계산에서 빼고 화면에 그대로 밝힌다
//  2) 확보 가중치가 절반 미만이면 점수를 내지 않는다(산출 보류)
//  3) 미확보 가중치만큼 전국 평균으로 수렴시켜, 데이터가 적은 시설이 유리해지지 않게 한다
//
// 구간 기준은 임의값이 아니라 실제 분포의 사분위수로 잡았다(2026-08-03 재측정).
// ★ 업무 강도는 시설 유형별로 법정 배치기준이 달라 구간표도 유형별로 나뉜다.
// 자세한 근거는 docs/work-index-spec.md 참고.

import type { Facility } from "./types";
import { isHospital } from "./types";

export type WorkAreaKey = "workload" | "retention" | "medicalSupport" | "teamSize" | "trust";

// 매니저가 실제로 중요하게 여기는 순서대로 가중치를 뒀다.
// 1순위 "몇 명을 돌봐야 하나"(체력), 2순위 "사람들이 오래 다니나"(분위기·처우의 대리 신호)
export const WORK_AREAS: { key: WorkAreaKey; label: string; weight: number }[] = [
  { key: "workload", label: "업무 강도", weight: 35 },
  { key: "retention", label: "근속 안정성", weight: 30 },
  { key: "medicalSupport", label: "의료 지원", weight: 15 },
  { key: "teamSize", label: "팀 규모", weight: 10 },
  { key: "trust", label: "기관 신뢰", weight: 10 },
];

export interface WorkSignal {
  label: string;
  score: number | null; // null = 공공데이터 미확보
  weight?: number;
  note?: string;
}

export interface WorkArea {
  key: WorkAreaKey;
  label: string;
  weight: number;
  score: number | null;
  signals: WorkSignal[];
}

export interface WorkIndex {
  total: number | null; // null = 데이터 부족으로 산출 보류
  coverage: number;
  areas: WorkArea[];
  /** 요양보호사 1인당 어르신 수 — 카드에 바로 보여주는 대표 수치 */
  workloadRatio: number | null;
  /** 1년 이상 근속 비율(%) */
  retentionRate: number | null;
}

const PRIOR_SCORE = 65;

// ★ 업무 강도 구간은 시설 유형별로 다르다 (2026-08-03 변경).
//
// 예전에는 두 유형에 같은 구간표를 썼는데, 법정 배치기준 자체가 달라서 주야간보호가
// 구조적으로 불리했다. 실측(11,442곳): 요양원 중앙값 2.3명 / 주야간보호 중앙값 6.6명 —
// **둘 다 각자의 법정 기준(2.3명 / 7명)을 거의 정확히 지키고 있는데**, 하나의 구간표로
// 재니 주야간보호 5,397곳 중 "매우 좋음"이 단 4곳(0.07%)이었다. 지표가 아니라 편향이었다.
//
// 그래서 각 유형의 실제 사분위수로 구간을 따로 잡는다(기존 방법론은 그대로).
// 두 유형 모두 p25 이하가 95점이 되어 같은 잣대로 비교된다.
const WORKLOAD_BANDS: Record<"NURSING_HOME" | "DAY_NIGHT_CARE", number[]> = {
  // 요양원 실측(6,045곳): p25 2.1 · p50 2.3 · p75 3.0 · p90 4.4 (법정 1:2.3)
  NURSING_HOME: [2.1, 2.3, 3.0, 4.4],
  // 주야간보호 실측(5,397곳): p25 5.3 · p50 6.6 · p75 8.7 · p90 12 (법정 1:7)
  DAY_NIGHT_CARE: [5.3, 6.6, 8.7, 12],
};
const WORKLOAD_SCORES = [95, 80, 60, 40, 25];

/** 각 유형의 법정 요양보호사 1인당 정원 — 이상치 판별과 화면 문구에 쓴다 */
export const LEGAL_RATIO: Record<string, number> = {
  NURSING_HOME: 2.3,
  DAY_NIGHT_CARE: 7,
};

/** 법정 기준의 3배를 넘으면 신고 누락으로 의심한다(정원 48명에 요양보호사 1명 같은 값) */
function isSuspectRatio(ratio: number, facilityType: string): boolean {
  const legal = LEGAL_RATIO[facilityType];
  return legal != null && ratio > legal * 3;
}

function workloadScore(ratio: number, facilityType: string): number {
  // 표에 없는 유형(방문요양 등)은 요양원 기준을 따른다 — 화면에서 쓰이지 않지만
  // 함수가 유형을 모른다고 계산을 포기하면 호출부가 복잡해진다.
  const bands = WORKLOAD_BANDS[facilityType as keyof typeof WORKLOAD_BANDS] ?? WORKLOAD_BANDS.NURSING_HOME;
  for (let i = 0; i < bands.length; i++) {
    if (ratio <= bands[i]) return WORKLOAD_SCORES[i];
  }
  return WORKLOAD_SCORES[WORKLOAD_SCORES.length - 1];
}

// 실제 분포(1년 이상 근속 비율, 11,471곳 · 2026-08-03 재측정): p25 40% · p50 67% · p75 80%
// 8/2 공단 전체 재적재로 중앙값이 60→67, p75가 75→80으로 올라 구간을 함께 갱신했다.
function retentionScore(rate: number): number {
  if (rate >= 80) return 95;
  if (rate >= 67) return 80;
  if (rate >= 40) return 60;
  if (rate >= 20) return 40;
  return 25;
}

function weightedAvg(signals: WorkSignal[]): number | null {
  const available = signals.filter((s) => s.score != null);
  if (available.length === 0) return null;
  const totalWeight = available.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  return Math.round(
    available.reduce((sum, s) => sum + (s.score as number) * (s.weight ?? 1), 0) / totalWeight
  );
}

export function calcWorkIndex(f: Facility): WorkIndex {
  // 요양병원은 공단 인력·근속 데이터가 없어(심평원 소관) 이 지표를 낼 수 없다
  if (isHospital(f)) {
    return {
      total: null,
      coverage: 0,
      areas: WORK_AREAS.map((a) => ({ ...a, score: null, signals: [] })),
      workloadRatio: null,
      retentionRate: null,
    };
  }

  const careWorkers = f.careWorkerDetail?.total ?? 0;
  const tenure = f.tenure?.find((t) => t.role === "요양보호사");
  const tenureTotal = tenure?.total ?? 0;
  const stable = tenure ? tenure.y1to2 + tenure.over2y : 0;

  // 업무 강도 — 방문요양은 정원 개념이 없어 계산 불가(대신 신호를 만들지 않는다)
  const capacity = f.capacity ?? 0;
  const workloadRatio =
    f.facilityType !== "HOME_CARE" && capacity > 0 && careWorkers > 0
      ? Math.round((capacity / careWorkers) * 10) / 10
      : null;

  const retentionRate =
    tenureTotal > 0 ? Math.round((stable / tenureTotal) * 100) : null;

  // 같은 유형끼리 비교해야 뜻이 있어서 중앙값도 유형별로 안내한다
  const typeMedian = f.facilityType === "DAY_NIGHT_CARE" ? 6.6 : 2.3;
  const suspect = workloadRatio != null && isSuspectRatio(workloadRatio, f.facilityType);

  const workload: WorkSignal[] = [
    {
      label: "요양보호사 1인당 어르신 수",
      score: workloadRatio == null ? null : workloadScore(workloadRatio, f.facilityType),
      weight: 3,
      note:
        workloadRatio == null
          ? f.facilityType === "HOME_CARE"
            ? "방문요양은 정원 개념이 없어 계산하지 않아요"
            : "정원 또는 인력 정보가 공개되지 않았어요"
          : suspect
          ? // 신고 누락이 의심되는 값 — 점수는 낮게 두되(실제로 인력이 부족하든 신고가
            // 틀렸든 확인이 필요한 상태다) 숫자를 사실로 단정하지는 않는다
            `공개 데이터로는 1인당 ${workloadRatio}명 — 신고 값이 실제와 다를 수 있어 확인이 필요해요`
          : `${workloadRatio}명 (같은 유형 중앙값 ${typeMedian}명)`,
    },
  ];
  // 현원 기준도 함께 본다 — 정원은 채워져 있지 않을 수 있어 실제 체감과 다를 수 있다
  const occupancy = f.currentOccupancy;
  if (occupancy !== undefined && occupancy > 0 && careWorkers > 0) {
    const actual = Math.round((occupancy / careWorkers) * 10) / 10;
    workload.push({
      label: "현재 실제 담당 인원",
      score: workloadScore(actual, f.facilityType),
      weight: 2,
      note: isSuspectRatio(actual, f.facilityType)
        ? `공개 데이터로는 현원 기준 1인당 ${actual}명 — 확인이 필요해요`
        : `현원 기준 1인당 ${actual}명`,
    });
  }

  const retention: WorkSignal[] = [
    {
      label: "1년 이상 근속 비율",
      score: retentionRate == null ? null : retentionScore(retentionRate),
      weight: 3,
      note:
        retentionRate == null
          ? "근속 현황이 공개되지 않았어요"
          : `${retentionRate}% (전국 중앙값 67%)`,
    },
  ];
  if (tenure && tenureTotal > 0) {
    // 2년 이상 장기근속자가 있다는 건 오래 일할 수 있는 곳이라는 뜻.
    // (원본 파일엔 3개월·6개월 단위 세분값도 있지만 DB에는 1년 미만으로 합쳐 저장돼 있다)
    const veteran = Math.round((tenure.over2y / tenureTotal) * 100);
    retention.push({
      label: "2년 이상 장기근속 비율",
      score: veteran >= 50 ? 95 : veteran >= 30 ? 80 : veteran >= 15 ? 60 : veteran > 0 ? 45 : 30,
      weight: 2,
      note: `${veteran}% — 오래 일하는 분이 많을수록 좋은 신호예요`,
    });
  }

  const nurses = f.staffDetail.medical.nurses + f.staffDetail.medical.nursingAssistants;
  const medicalSupport: WorkSignal[] = [
    {
      label: "간호 인력 배치",
      score: nurses >= 3 ? 95 : nurses >= 1 ? 75 : careWorkers > 0 ? 40 : null,
      weight: 2,
      note:
        careWorkers > 0
          ? nurses > 0
            ? `${nurses}명 — 의료 처치를 함께 맡아줘요`
            : "간호 인력이 없어 의료적 부담이 커질 수 있어요"
          : "인력 정보가 공개되지 않았어요",
    },
    {
      label: "사회복지사 배치",
      score:
        f.staffDetail.socialCare.socialWorkers > 0
          ? 90
          : careWorkers > 0
          ? 50
          : null,
      note:
        f.staffDetail.socialCare.socialWorkers > 0
          ? "상담·프로그램을 분담해요"
          : undefined,
    },
  ];

  const teamSize: WorkSignal[] = [
    {
      label: "함께 일하는 요양보호사",
      // 너무 적으면 휴가·교대가 어렵고, 아주 크면 체계가 잡혀 있는 편
      score:
        careWorkers === 0
          ? null
          : careWorkers >= 20
          ? 90
          : careWorkers >= 10
          ? 80
          : careWorkers >= 5
          ? 65
          : 45,
      note:
        careWorkers > 0
          ? `${careWorkers}명 — 인원이 많을수록 교대·휴가가 수월해요`
          : "인력 정보가 공개되지 않았어요",
    },
  ];

  const trust: WorkSignal[] = [
    {
      label: "공단 정기평가 등급",
      score:
        f.grade == null || f.grade < 1 || f.grade > 5
          ? null
          : [95, 80, 65, 45, 25][f.grade - 1],
      weight: 2,
    },
    {
      label: "배상책임보험 가입",
      // 사고가 났을 때 일하는 사람도 보호받는지 — 매니저에게 직접적인 안전망
      score: f.institutionInfo?.liabilityInsurance ? 95 : 45,
      note: f.institutionInfo?.liabilityInsurance
        ? "사고 시 보상 체계가 있어요"
        : "가입 여부가 확인되지 않았어요",
    },
  ];
  if (f.adminActions && f.adminActions.length > 0) {
    trust.unshift({
      label: "행정처분 이력",
      score: 0,
      weight: 4,
      note: `${f.adminActions.length}건 공표됨`,
    });
  }

  const groups = [workload, retention, medicalSupport, teamSize, trust];
  const areas: WorkArea[] = WORK_AREAS.map((area, i) => ({
    ...area,
    score: weightedAvg(groups[i]),
    signals: groups[i],
  }));

  const coverage = areas.reduce((sum, a) => (a.score != null ? sum + a.weight : sum), 0);
  if (coverage < 50) {
    return { total: null, coverage, areas, workloadRatio, retentionRate };
  }

  const raw =
    areas.reduce((sum, a) => (a.score != null ? sum + a.score * a.weight : sum), 0) / coverage;
  const total = Math.round((raw * coverage + PRIOR_SCORE * (100 - coverage)) / 100);

  return { total, coverage, areas, workloadRatio, retentionRate };
}

export function workLevel(total: number): { label: string; tone: string } {
  if (total >= 85) return { label: "매우 좋음", tone: "bg-mint-100 text-mint-700" };
  if (total >= 70) return { label: "좋음", tone: "bg-mint-50 text-mint-700" };
  if (total >= 55) return { label: "보통", tone: "bg-accent-100 text-accent-600" };
  return { label: "확인 필요", tone: "bg-primary-50 text-primary-600" };
}
