// 유사 시설 추천 — "이 시설과 비슷한 곳"을 찾고, 왜 비슷한지·무엇이 다른지 설명한다.
//
// 설계의 핵심: 보호자가 대안을 찾는 순간에는 항상 이유가 있다.
//   "여기 자리가 없네" / "너무 머네" / "비싸네" / "점수가 아쉽네"
// 그래서 유사도만으로 줄 세우지 않고, 의도(intent)별로 다시 정렬해서 보여준다.
//
// 성능: 28,860곳을 매번 전부 비교할 수 없으므로 2단계로 나눈다.
//   1) 후보 생성 — 같은 유형 + 같은 시/도, 좌표가 있으면 거리순 상위 N
//   2) 정밀 채점 — 후보만 특성 비교

import type { Facility } from "./types";
import { isHospital } from "./types";
import { haversineDistanceKm } from "./distance";
import { calcDolbodaScore } from "./dolbodaScore";
import type { ProgramTag } from "./programTaxonomy";

export type SimilarIntent = "similar" | "closer" | "available" | "cheaper" | "better";

export const INTENT_META: Record<SimilarIntent, { label: string; empty: string }> = {
  similar: { label: "비슷한 곳", empty: "비슷한 조건의 시설을 찾지 못했어요" },
  closer: { label: "더 가까운 곳", empty: "이 시설보다 가까운 비슷한 곳이 없어요" },
  available: { label: "자리 있는 곳", empty: "근처에 빈자리가 확인된 시설이 없어요" },
  cheaper: { label: "비용 낮은 곳", empty: "비급여가 더 낮은 시설을 찾지 못했어요" },
  better: { label: "안심지수 높은 곳", empty: "안심지수가 더 높은 시설이 없어요" },
};

/** 현재 시설 대비 차이 — 카드에 배지로 보여준다 */
export interface SimilarDelta {
  label: string;
  /** good이면 초록(이 시설보다 나음), neutral이면 회색 */
  tone: "good" | "neutral";
}

export interface SimilarFacility {
  facility: Facility;
  distanceKm?: number;
  /** 0~100, 높을수록 비슷함 */
  similarity: number;
  /** 왜 비슷한지 */
  reasons: string[];
  /** 현재 시설과 무엇이 다른지 */
  deltas: SimilarDelta[];
}

/**
 * 월 비급여 총액 — 비용 비교의 대리 지표.
 * 요양병원(심평원)은 항목별 min/max 범위로, 공단 시설은 월/일 금액으로 들어와 구조가 다르다.
 * 자릿수가 어긋난 값(1일 1원 등)은 비교를 왜곡하므로 제외한다 — feeQuality와 같은 기준.
 */
function monthlyFeeOf(f: Facility): number | null {
  let sum = 0;
  let counted = 0;

  if (isHospital(f)) {
    for (const fee of f.nonCoveredFees ?? []) {
      // 범위로만 공개되므로 중앙값을 쓴다
      const mid = (fee.min + fee.max) / 2;
      if (mid >= 15000) {
        sum += mid;
        counted++;
      }
    }
  } else {
    for (const fee of f.nonCoveredFees ?? []) {
      if (fee.monthly >= 15000) {
        sum += fee.monthly;
        counted++;
      }
    }
  }
  return counted > 0 ? Math.round(sum) : null;
}

function capacityOf(f: Facility): number | null {
  if (isHospital(f)) {
    const beds = f.facilityStatus.generalBeds + f.facilityStatus.upgradeBeds;
    return beds > 0 ? beds : null;
  }
  return f.capacity > 0 ? f.capacity : null;
}

function vacancyOf(f: Facility): number | null {
  if (isHospital(f)) return null;
  if (f.capacity <= 0 || f.currentOccupancy === undefined) return null;
  return f.capacity - f.currentOccupancy;
}

function programTagsOf(f: Facility): Set<ProgramTag> {
  if (isHospital(f)) return new Set();
  return new Set((f.programTags ?? []).map((t) => t.tag));
}

/** 0~1로 정규화된 근접도 — 두 값이 비슷할수록 1 */
function closeness(a: number | null, b: number | null, scale: number): number | null {
  if (a == null || b == null) return null;
  const diff = Math.abs(a - b);
  return Math.max(0, 1 - diff / scale);
}

function jaccard<T>(a: Set<T>, b: Set<T>): number | null {
  if (a.size === 0 && b.size === 0) return null;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : null;
}

/**
 * 기준 시설과 후보 하나를 비교해 유사도·설명을 만든다.
 * 가중치는 보호자가 "비슷하다"고 느끼는 순서 — 규모와 프로그램 구성이 가장 크게 좌우한다.
 */
export function compareFacilities(base: Facility, other: Facility): SimilarFacility {
  const parts: { score: number; weight: number; reason?: string }[] = [];

  // 규모 — 30명짜리와 300명짜리는 완전히 다른 곳이다
  const capBase = capacityOf(base);
  const capOther = capacityOf(other);
  const capScore = closeness(capBase, capOther, 80);
  if (capScore != null) {
    parts.push({
      score: capScore,
      weight: 3,
      reason: capScore > 0.7 ? "규모가 비슷해요" : undefined,
    });
  }

  // 프로그램 구성 — 어떤 활동을 하는 곳인지가 성격을 결정한다
  const progScore = jaccard(programTagsOf(base), programTagsOf(other));
  if (progScore != null) {
    parts.push({
      score: progScore,
      weight: 3,
      reason: progScore > 0.6 ? "운영 프로그램이 비슷해요" : undefined,
    });
  }

  // 평가등급
  const gradeScore = closeness(base.grade, other.grade, 4);
  if (gradeScore != null) {
    parts.push({
      score: gradeScore,
      weight: 2,
      reason: base.grade === other.grade && base.grade != null ? "평가등급이 같아요" : undefined,
    });
  }

  // 비용 수준
  const feeBase = monthlyFeeOf(base);
  const feeOther = monthlyFeeOf(other);
  const feeScore = closeness(feeBase, feeOther, 600000);
  if (feeScore != null) {
    parts.push({
      score: feeScore,
      weight: 2,
      reason: feeScore > 0.8 ? "비급여 비용대가 비슷해요" : undefined,
    });
  }

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const similarity =
    totalWeight > 0
      ? Math.round((parts.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight) * 100)
      : 0;

  const distanceKm =
    base.lat != null && base.lng != null && other.lat != null && other.lng != null
      ? haversineDistanceKm(base.lat, base.lng, other.lat, other.lng)
      : undefined;

  // 현재 시설 대비 차이 — 보호자가 대안을 고를 때 실제로 보는 것들
  const deltas: SimilarDelta[] = [];

  const vac = vacancyOf(other);
  if (vac != null && vac > 0) deltas.push({ label: `빈자리 ${vac}자리`, tone: "good" });

  if (feeBase != null && feeOther != null) {
    const diff = feeBase - feeOther;
    if (Math.abs(diff) >= 30000) {
      deltas.push({
        label:
          diff > 0
            ? `월 ${Math.round(diff / 10000)}만원 낮음`
            : `월 ${Math.round(-diff / 10000)}만원 높음`,
        tone: diff > 0 ? "good" : "neutral",
      });
    }
  }

  const scoreBase = calcDolbodaScore(base).total;
  const scoreOther = calcDolbodaScore(other).total;
  if (scoreBase != null && scoreOther != null && scoreOther !== scoreBase) {
    const diff = scoreOther - scoreBase;
    if (Math.abs(diff) >= 3) {
      deltas.push({
        label: `안심지수 ${diff > 0 ? "+" : ""}${diff}`,
        tone: diff > 0 ? "good" : "neutral",
      });
    }
  }

  const reasons = parts.map((p) => p.reason).filter((r): r is string => Boolean(r));

  return { facility: other, distanceKm, similarity, reasons, deltas };
}

// 대안으로 실제 고려할 만한 거리. 이걸 넘으면 아무리 비슷해도 "다른 동네 시설"이라
// 보호자에게 의미가 없다(제주에서 순천을 추천하는 식). 다만 시설이 드문 지역에서는
// 결과가 아예 없어지므로, 3곳 미만이면 단계적으로 넓힌다.
const NEARBY_STEPS_KM = [30, 60, 150, Infinity];

function withinReasonableDistance(list: SimilarFacility[]): SimilarFacility[] {
  for (const km of NEARBY_STEPS_KM) {
    const near = list.filter((c) => c.distanceKm == null || c.distanceKm <= km);
    if (near.length >= 3) return near;
  }
  return list;
}

/** 의도에 맞게 후보를 걸러 다시 정렬한다 */
export function rankByIntent(
  base: Facility,
  candidates: SimilarFacility[],
  intent: SimilarIntent
): SimilarFacility[] {
  const baseFee = monthlyFeeOf(base);
  const baseScore = calcDolbodaScore(base).total;
  const baseDist = 0;

  // 거리 가드 — closer는 어차피 거리순이라 그대로 두고, 나머지는 현실적인 반경으로 좁힌다
  let list = intent === "closer" ? candidates : withinReasonableDistance(candidates);

  if (intent === "closer") {
    list = list.filter((c) => c.distanceKm != null);
    return list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }
  if (intent === "available") {
    list = list.filter((c) => (vacancyOf(c.facility) ?? 0) > 0);
    return list.sort((a, b) => b.similarity - a.similarity);
  }
  if (intent === "cheaper") {
    if (baseFee == null) return [];
    list = list.filter((c) => {
      const f = monthlyFeeOf(c.facility);
      return f != null && f < baseFee;
    });
    return list.sort((a, b) => (monthlyFeeOf(a.facility) ?? 0) - (monthlyFeeOf(b.facility) ?? 0));
  }
  if (intent === "better") {
    if (baseScore == null) return [];
    list = list.filter((c) => {
      const s = calcDolbodaScore(c.facility).total;
      return s != null && s > baseScore;
    });
    return list.sort(
      (a, b) =>
        (calcDolbodaScore(b.facility).total ?? 0) - (calcDolbodaScore(a.facility).total ?? 0)
    );
  }

  // similar — 유사도 우선, 동점이면 가까운 순
  void baseDist;
  return list.sort(
    (a, b) => b.similarity - a.similarity || (a.distanceKm ?? 999) - (b.distanceKm ?? 999)
  );
}
