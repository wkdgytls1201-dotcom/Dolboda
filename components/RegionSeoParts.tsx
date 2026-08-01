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

// 지역 페이지 FAQ — 지역명·시설 수를 받아 페이지마다 다른 질문·답을 만든다.
// 광역·시군구 페이지가 똑같은 FAQ를 반복하면 검색엔진이 중복 콘텐츠로 본다.
// FAQPage JSON-LD와 화면 내용을 일치시켜야 하므로 같은 빌더를 공유한다.
export interface RegionFaqContext {
  /** "서울" 또는 "강남구"처럼 페이지가 다루는 지역 이름 */
  regionName?: string;
  /** 지역 내 전체 시설 수 — 있으면 지역 고유 질문이 추가된다 */
  total?: number;
  /** 유형별 시설 수 — 요양원 수 등 구체 숫자를 답에 넣는다 */
  typeCounts?: Partial<Record<FacilityType, number>>;
}

export function buildRegionFaq(ctx: RegionFaqContext = {}): { q: string; a: string }[] {
  const at = ctx.regionName ? `${ctx.regionName}에서 ` : "";
  const faq: { q: string; a: string }[] = [];

  if (ctx.regionName && ctx.total) {
    const parts = ctx.typeCounts
      ? (Object.entries(ctx.typeCounts) as [FacilityType, number][])
          .filter(([, n]) => n > 0)
          .map(([t, n]) => `${FACILITY_TYPE_LABEL[t]} ${n}곳`)
          .join(", ")
      : "";
    faq.push({
      q: `${ctx.regionName}에는 요양시설이 몇 곳 있나요?`,
      a: `돌보다에 등록된 ${ctx.regionName} 요양시설은 총 ${ctx.total.toLocaleString()}곳이에요.${
        parts ? ` ${parts}으로 구성돼 있어요.` : ""
      } 공공데이터 기준이라 실제 운영 여부는 시설에 확인해 주세요.`,
    });
  }

  faq.push(
    {
      q: `${at}요양병원과 요양원 중 어디를 알아봐야 하나요?`,
      a: "치료·재활이 계속 필요하면 의사가 상주하는 요양병원(건강보험 적용), 식사·거동 같은 일상 돌봄이 주로 필요하면 요양원(장기요양등급 필요)이 맞아요. 돌보다의 '요양원과 요양병원 차이' 가이드에서 자세히 비교할 수 있어요.",
    },
    {
      q: `${ctx.regionName ? `${ctx.regionName} ` : ""}시설의 평가등급은 어떻게 확인하나요?`,
      a: `${
        ctx.regionName ? `${ctx.regionName} 시설 목록에서 ` : "시설 목록에서 "
      }각 시설의 평가등급이 함께 표시돼요. 요양병원은 건강보험심사평가원, 요양원·주야간보호·방문요양은 국민건강보험공단이 매기는 공식 등급으로, 1등급(A등급)에 가까울수록 평가 결과가 좋다는 뜻이에요.`,
    },
    {
      q: "시설 비용은 어떻게 비교하나요?",
      a: "급여 수가는 전국 공통이라 시설마다 달라지는 건 식재료비·상급병실료 같은 비급여예요. 돌보다 상세페이지에서 시설별 비급여와 월 실부담 시뮬레이터로 비교한 뒤, 전화 상담으로 최종 확인하는 것을 권해요.",
    }
  );
  return faq;
}

// 지역 고유 통계 — 페이지마다 다른 숫자가 나와 중복 콘텐츠로 읽히지 않게 한다.
export function RegionStatStrip({
  stats,
  total,
  regionName,
}: {
  stats: { topGrade: number; graded: number; vacancy: number; avgCapacity: number | null };
  total: number;
  regionName: string;
}) {
  const items: { label: string; value: string }[] = [
    { label: "전체 시설", value: `${total.toLocaleString()}곳` },
  ];
  if (stats.graded > 0) {
    items.push({ label: "평가등급 공개", value: `${stats.graded.toLocaleString()}곳` });
    items.push({ label: "최고등급(1·A등급)", value: `${stats.topGrade.toLocaleString()}곳` });
  }
  if (stats.vacancy > 0) items.push({ label: "입소 가능", value: `${stats.vacancy.toLocaleString()}곳` });
  if (stats.avgCapacity) items.push({ label: "평균 정원", value: `${stats.avgCapacity}명` });

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-bold text-ink-900">{regionName} 요양시설 현황</h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-white p-3.5 text-center shadow-card">
            <dt className="text-[11px] leading-tight text-ink-300">{item.label}</dt>
            <dd className="mt-1 text-lg font-extrabold text-ink-900">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-ink-300">
        공공데이터 기준이며, 입소 가능 여부는 실제와 다를 수 있어 시설에 확인이 필요해요.
      </p>
    </section>
  );
}

// 검색엔진이 24곳 뒤의 시설도 따라갈 수 있게, 실제 링크가 있는 페이지네이션을 그린다.
export function RegionPagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  // 페이지가 많으면 현재 주변 + 처음/끝만 노출
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  return (
    <nav aria-label="페이지 이동" className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link
          href={page === 2 ? basePath : `${basePath}?page=${page - 1}`}
          rel="prev"
          className="flex min-h-[44px] items-center rounded-xl border border-ink-100 bg-white px-3.5 text-sm font-semibold text-ink-700 hover:bg-ink-100"
        >
          이전
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="text-xs text-ink-300">…</span>}
          {p === page ? (
            <span
              aria-current="page"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary-500 px-3 text-sm font-bold text-white"
            >
              {p}
            </span>
          ) : (
            <Link
              href={p === 1 ? basePath : `${basePath}?page=${p}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-ink-100 bg-white px-3 text-sm font-semibold text-ink-700 hover:bg-ink-100"
            >
              {p}
            </Link>
          )}
        </span>
      ))}
      {page < totalPages && (
        <Link
          href={`${basePath}?page=${page + 1}`}
          rel="next"
          className="flex min-h-[44px] items-center rounded-xl border border-ink-100 bg-white px-3.5 text-sm font-semibold text-ink-700 hover:bg-ink-100"
        >
          다음
        </Link>
      )}
    </nav>
  );
}

export function RegionFaq(ctx: RegionFaqContext = {}) {
  const faq = buildRegionFaq(ctx);
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <h2 className="mb-3 font-bold text-ink-900">자주 묻는 질문</h2>
      <dl className="space-y-4">
        {faq.map((item) => (
          <div key={item.q}>
            <dt className="mb-1 text-sm font-semibold text-ink-900">{item.q}</dt>
            <dd className="text-sm leading-relaxed text-ink-500">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function regionFaqJsonLd(ctx: RegionFaqContext = {}) {
  return {
    "@type": "FAQPage",
    mainEntity: buildRegionFaq(ctx).map((item) => ({
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
