import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clover } from "lucide-react";
import { CareServicesHero } from "@/components/CareServicesHero";
import { ServicesShowcase } from "@/components/ServicesShowcase";
import { CARE_SERVICES, SERVICE_STEPS } from "@/lib/careServices";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "돌봄 서비스 — 병원 간병·집에서 돌봄·가사 돌봄·가족 간병",
  description:
    "어떤 돌봄이 필요하신가요? 병원 간병, 집에서 돌봄, 가사 돌봄, 가족 간병까지 상황에 맞는 돌봄 서비스를 비교해보고 바로 요청하세요. 어떤 도움을 받을 수 있는지, 무엇을 준비해야 하는지 정리했어요.",
  keywords: [
    "간병인 구하기",
    "병원 간병인",
    "재가 간병",
    "집에서 간병",
    "가사 돌봄",
    "가족요양보호사",
    "가족 간병 급여",
    "노인 돌봄 서비스",
    "간병인 비용",
  ],
  alternates: { canonical: "/services" },
  openGraph: {
    title: "돌봄 서비스 — 상황에 맞는 돌봄 찾기",
    description: "병원 간병, 집에서 돌봄, 가사 돌봄, 가족 간병을 한눈에 비교해보세요.",
    url: `${SITE_URL}/services`,
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "돌보다", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "돌봄 서비스", item: `${SITE_URL}/services` },
      ],
    },
    {
      "@type": "ItemList",
      name: "돌봄 서비스 종류",
      itemListElement: CARE_SERVICES.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.label,
        description: s.tagline,
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "병원 간병과 집에서 돌봄은 무엇이 다른가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "병원 간병은 입원 중인 병실에서 식사·이동·위생을 돕는 서비스이고, 집에서 돌봄은 자택에서 일상생활 전반을 돕는 서비스예요. 두 경우 모두 석션이나 경관영양 같은 의료행위는 의료법상 간병인이 할 수 없어요.",
          },
        },
        {
          "@type": "Question",
          name: "가족이 직접 돌봐도 급여를 받을 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "가족요양 제도를 통해 가능합니다. 가족이 요양보호사 자격을 취득하고 재가장기요양기관에 소속되어 활동하면 돌본 시간만큼 급여를 받을 수 있어요. 다만 어르신이 장기요양등급을 먼저 받으셔야 하고, 월 인정 시간에 한도가 있어요. 국민건강보험공단이 운영하는 제도입니다.",
          },
        },
        {
          "@type": "Question",
          name: "가사 돌봄은 어떻게 이용하나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "주 1~7회, 회당 2~8시간처럼 방문 주기를 정해 이용해요. 설거지·빨래·분리배출·식사 준비·복약 챙기기·말벗 등 필요한 항목만 골라 요청하실 수 있어요.",
          },
        },
      ],
    },
  ],
};

export default function ServicesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-2">
        <CareServicesHero />
      </div>

      <div className="relative mb-10 text-center">
        {/* 로고와 같은 코랄·피치 은은한 빛번짐 — 다른 화면의 진한 보라 배너와는 다른 톤 */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-32 w-52 -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-200/60 via-peach-200/50 to-transparent blur-2xl"
          aria-hidden
        />

        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-100 to-peach-100 px-3 py-1.5 text-xs font-bold text-primary-600">
          <Clover size={13} className="text-primary-500" />
          믿고 맡기는 돌봄
        </span>

        <h1 className="mb-3 text-[26px] font-bold leading-tight text-ink-900">
          어떤{" "}
          <span className="bg-gradient-to-r from-primary-500 to-peach-500 bg-clip-text text-transparent">
            돌봄
          </span>
          이 필요하세요?
        </h1>
        <p className="text-sm leading-relaxed text-ink-500">
          병원에서, 집에서, 정기 방문으로 — 상황에 따라 필요한 돌봄이 달라요.
          <br className="hidden sm:block" /> 각각 어떤 도움을 받을 수 있는지 정리했어요.
        </p>
      </div>

      <ServicesShowcase />

      <section className="mt-14 rounded-3xl border border-primary-100 bg-primary-50/60 p-6 text-center">
        <h2 className="mb-2 text-lg font-bold text-ink-900">어떤 걸 골라야 할지 모르겠다면</h2>
        <p className="mb-5 text-sm leading-relaxed text-ink-500">
          장기요양등급을 먼저 확인해보세요. 등급에 따라 이용할 수 있는 서비스와
          부담하시는 비용이 달라져요.
        </p>
        <Link
          href="/grade-test"
          className="mx-auto flex min-h-[52px] w-full max-w-[300px] items-center justify-center gap-2 rounded-2xl bg-royal-500 text-sm font-bold text-white shadow-royal transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-royal-600 active:translate-y-0 active:scale-[0.99]"
        >
          3분 등급 테스트 해보기
          <ArrowRight size={16} />
        </Link>
      </section>

      {/* 크롤러·AI가 읽는 정적 요약 (카드 내용은 펼쳐야 보이므로 따로 둔다) */}
      <section className="sr-only">
        <h2>돌봄 서비스 종류</h2>
        {CARE_SERVICES.map((s) => (
          <article key={s.slug}>
            <h3>{s.label}</h3>
            <p>{s.tagline}</p>
            <p>{s.includes.join(", ")}</p>
            <p>{s.note}</p>
          </article>
        ))}
        <h2>이용 절차</h2>
        <ol>
          {SERVICE_STEPS.map((s) => (
            <li key={s.title}>
              {s.title} — {s.desc}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
