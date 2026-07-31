import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";
import { FACILITY_TYPE_LABEL, type FacilityType } from "@/lib/types";

// 지역 SEO 랜딩 페이지(/region/...)에서 쓰는 서버 렌더링 조각들.
// 클라이언트 훅 없이 순수 마크업이라 검색엔진·AI 크롤러가 그대로 읽는다.

const TYPE_ORDER: FacilityType[] = [
  "NURSING_HOSPITAL",
  "NURSING_HOME",
  "DAY_NIGHT_CARE",
  "HOME_CARE",
  "SILVER_TOWN",
];

export function TypeCountChips({
  typeCounts,
}: {
  typeCounts: Partial<Record<FacilityType, number>>;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {TYPE_ORDER.filter((t) => (typeCounts[t] ?? 0) > 0).map((t) => (
        <li
          key={t}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-card"
        >
          {FACILITY_TYPE_LABEL[t]} <span className="text-primary-600">{typeCounts[t]}곳</span>
        </li>
      ))}
    </ul>
  );
}

export function FacilityLinkList({
  facilities,
}: {
  facilities: { id: string; name: string; facilityType: string; grade: number | null; address: string }[];
}) {
  return (
    <ul className="space-y-2">
      {facilities.map((f) => (
        <li key={f.id}>
          <Link
            href={`/facility/${f.id}`}
            className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card"
          >
            <span className="min-w-0 flex-1">
              <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-ink-900">{f.name}</span>
                {f.grade != null && (
                  <span className="rounded-full bg-royal-50 px-2 py-0.5 text-[11px] font-bold text-royal-700">
                    {f.grade}등급
                  </span>
                )}
                <span className="rounded-full bg-ink-100/60 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                  {FACILITY_TYPE_LABEL[f.facilityType as FacilityType] ?? "요양시설"}
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs text-ink-500">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{f.address}</span>
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-ink-300" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// 지역 페이지 공통 FAQ — 요양시설을 처음 알아보는 보호자용 기본 안내.
// FAQPage JSON-LD와 내용을 일치시켜야 하므로 데이터로 정의한다.
export const REGION_FAQ: { q: string; a: string }[] = [
  {
    q: "요양병원과 요양원은 무엇이 다른가요?",
    a: "요양병원은 의사·간호사가 상주하는 의료기관으로 치료와 재활이 필요할 때 이용하며 건강보험이 적용돼요. 요양원은 요양보호사가 일상 돌봄을 제공하는 생활시설로, 노인장기요양보험의 장기요양등급 판정을 받아 이용해요.",
  },
  {
    q: "평가등급은 어떤 의미인가요?",
    a: "건강보험심사평가원(요양병원)과 국민건강보험공단(장기요양기관)이 주기적으로 시설 운영과 서비스 수준을 평가해 매기는 등급이에요. 1등급에 가까울수록 평가 결과가 좋다는 뜻이라, 시설을 비교할 때 중요한 기준이 돼요.",
  },
  {
    q: "시설 비용은 어떻게 확인하나요?",
    a: "시설마다 상급병실료 같은 비급여 항목과 인력 구성이 달라 총비용 차이가 커요. 돌보다 상세페이지에서 시설별 비급여 비용과 인력 현황을 먼저 비교한 뒤, 전화 상담으로 최종 확인하는 것을 권해요.",
  },
];

export function RegionFaq() {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <h2 className="mb-3 font-bold text-ink-900">자주 묻는 질문</h2>
      <dl className="space-y-4">
        {REGION_FAQ.map((item) => (
          <div key={item.q}>
            <dt className="mb-1 text-sm font-semibold text-ink-900">{item.q}</dt>
            <dd className="text-sm leading-relaxed text-ink-500">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function regionFaqJsonLd() {
  return {
    "@type": "FAQPage",
    mainEntity: REGION_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

// 지역 페이지 → 가이드 콘텐츠 내부 링크. 지역 검색어로 들어온 보호자를 질문형 콘텐츠로,
// 가이드를 읽은 보호자를 다시 지역 검색으로 순환시키는 SEO 구조의 절반이다.
const GUIDE_LINKS = [
  { slug: "nursing-home-vs-hospital", label: "요양원과 요양병원, 뭐가 다른가요?" },
  { slug: "nursing-home-cost", label: "요양원 한 달 비용은 얼마나 들까요?" },
  { slug: "checklist", label: "좋은 요양원 고르는 체크리스트" },
  { slug: "grade-application", label: "장기요양등급 신청 방법" },
];

export function GuideLinkStrip() {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-base font-bold text-ink-900">시설 고르기 전에 읽어보세요</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {GUIDE_LINKS.map((g) => (
          <Link
            key={g.slug}
            href={`/guide/${g.slug}`}
            className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white px-4 py-3.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
          >
            {g.label}
            <ChevronRight size={16} className="shrink-0 text-ink-300" />
          </Link>
        ))}
      </div>
    </section>
  );
}
