import { DetailSection } from "@/components/DetailSection";
import { DolbodaScoreCard } from "@/components/DolbodaScoreCard";
import { calcDolbodaScore } from "@/lib/dolbodaScore";
import { getScoreContext } from "@/lib/scoreContext";
import type { Facility } from "@/lib/types";

// "공공데이터 기반 안심지수" 섹션 — 페이지 본문에서 떼어내 <Suspense>로 흘려보내는 조각.
//
// SimilarSection·VacancyTrend와 같은 이유: 지역 평균·최근접 요양병원 거리는 시설 자체
// 데이터와 별개 조회라, 예전처럼 클라이언트 마운트 후 fetch로 기다리면 28,000여
// 상세페이지가 매번 왕복 하나씩을 더 진다(2026-08-07 감사). 서버에서 먼저 계산해
// 스트리밍하면 그 왕복이 사라지고, 지역 평균 조회 자체는 하루 캐시라 비싸지 않다.
//
// 안심지수 총점 자체(regionContext 없이)는 이 조회 없이도 계산되므로, 느려도
// "빈 섹션"이 아니라 "지역 비교가 아직 안 붙은 점수"로 뜬다 — 스켈레톤이 카드 모양
// 그대로인 이유다.
export async function ScoreContextSection({ facility }: { facility: Facility }) {
  const ctx = await getScoreContext({
    facilityType: facility.facilityType,
    address: facility.address,
    lat: facility.lat ?? null,
    lng: facility.lng ?? null,
  });

  return (
    <DetailSection id="dolboda-score" title="공공데이터 기반 안심지수">
      <DolbodaScoreCard
        score={calcDolbodaScore(facility, { nearestHospitalKm: ctx.nearestHospitalKm })}
        grade={facility.grade}
        gradeSource={facility.gradeSource}
        facilityType={facility.facilityType}
        regionContext={
          ctx.regionAverage != null && ctx.regionName
            ? { name: ctx.regionName, average: ctx.regionAverage, count: ctx.regionCount }
            : null
        }
      />
    </DetailSection>
  );
}

/** 스트리밍 중 자리를 지키는 뼈대. 지역 맥락 없이 계산한 점수를 그대로 보여줘도 되지만,
 * 부모(FacilityDetailClient)가 이 섹션 자체를 서버 슬롯으로만 받으므로 도착 전에는
 * 카드와 같은 높이의 뼈대만 둔다 — 도착 시 화면이 튀지 않게. */
export function ScoreContextSectionSkeleton() {
  return (
    <section className="border-t border-ink-100 py-9" aria-hidden="true">
      <div className="mb-5 h-7 w-52 animate-pulse rounded bg-ink-100" />
      <div className="h-40 w-full animate-pulse rounded-2xl bg-ink-100" />
    </section>
  );
}
