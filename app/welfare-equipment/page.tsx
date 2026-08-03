import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PhoneCall, ShieldCheck } from "lucide-react";
import {
  ANNUAL_LIMIT,
  BASE_YEAR,
  FAQ,
  PURCHASE_ITEMS,
  RENTAL_ITEMS,
  STEPS,
} from "@/lib/welfareEquipment";
import { CountUpNumber, CopayCompareBars } from "@/components/WelfareBenefitVisuals";
import { WelfareItemTabs } from "@/components/WelfareItemTabs";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

// 복지용구 혜택 안내 — 공개 랜딩페이지.
//
// 여기서는 "이런 혜택이 있다"만 설명하고 신청·등록은 하지 않는다(로그인 뒤
// /mypage/welfare-benefit로 넘긴다). 가격·비교 그래픽으로 "우리 얘기다"를 느끼게 하는
// 것이 이 페이지의 유일한 역할 — 실제 등록 폼을 여기 두면 검색으로 들어온 사람도
// 로그인부터 하라고 막는 셈이라 이탈이 커진다.

export const metadata: Metadata = {
  title: "복지용구 혜택 — 연 160만원 한도로 85~100% 지원",
  description:
    "장기요양등급이 있으면 이동변기·전동침대·수동휠체어 같은 복지용구를 연 160만원 한도로 85~100% 지원받아 구입·대여할 수 있어요. 대상자별 본인부담금과 신청 절차를 확인하세요.",
  alternates: { canonical: "/welfare-equipment" },
  openGraph: {
    title: `복지용구 혜택 안내 | ${SITE_NAME}`,
    description: "장기요양등급이 있다면 연 160만원 한도로 복지용구를 지원받으세요.",
    url: `${SITE_URL}/welfare-equipment`,
    type: "website",
    images: [OG_IMAGE],
  },
};

const PAGE_URL = `${SITE_URL}/welfare-equipment`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "복지용구 혜택", item: PAGE_URL },
      ],
    },
    {
      "@type": "Service",
      name: "복지용구 급여 안내",
      serviceType: "장기요양 기타재가급여(복지용구) 정보 안내",
      areaServed: "KR",
      provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      url: PAGE_URL,
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function WelfareEquipmentPage() {
  return (
    <main className="pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      {/* 히어로 — 그라데이션 배경 + 카운트업 숫자로 "얼마나 큰 혜택인지"를 체감시킨다 */}
      <section className="relative overflow-hidden bg-hero-gradient px-4 pb-14 pt-10 sm:pt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-300/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-royal-300/25 blur-3xl"
        />
        <div className="relative mx-auto max-w-lg text-center">
          <span className="animate-pop mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-1.5 text-[13px] font-bold text-primary-700 shadow-soft backdrop-blur">
            <ShieldCheck size={14} />
            국민건강보험공단 장기요양급여
          </span>
          <h1 className="mb-3 text-[26px] font-extrabold leading-snug text-ink-900 sm:text-3xl">
            부모님이 아직
            <br />
            못 받으신 지원금이 있어요
          </h1>
          <p className="mb-7 text-[15px] leading-relaxed text-ink-500">
            장기요양등급이 있다면 이동변기·전동침대 같은 복지용구를{" "}
            <strong className="font-bold text-ink-700">85~100%</strong> 지원받아 구입·대여할 수
            있어요.
          </p>

          <div className="mx-auto mb-7 max-w-xs rounded-3xl bg-white/90 p-6 shadow-card backdrop-blur">
            <p className="mb-1 text-[13px] font-semibold text-ink-400">{BASE_YEAR}년 연간 한도</p>
            <p className="text-4xl font-extrabold text-primary-600">
              <CountUpNumber value={ANNUAL_LIMIT} suffix="원" />
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">
              쓰지 않으면 그해가 지나며 사라져요
            </p>
          </div>

          <Link
            href="/mypage/welfare-benefit"
            className="animate-shimmer group relative inline-flex min-h-[56px] w-full max-w-xs items-center justify-center gap-1.5 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 to-peach-500 px-6 text-[15px] font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
          >
            로그인하고 우리 어르신 혜택 확인하기
            <ArrowRight size={16} className="animate-nudge-x" />
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-lg px-4">
        {/* 본인부담금 비교 — 실제로 얼마 내는지가 가장 궁금한 숫자다 */}
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-bold text-ink-900">
            100만원어치 복지용구를 살 때
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-ink-500">
            대상자 구분에 따라 실제로 내는 돈이 이렇게 달라져요.
          </p>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <CopayCompareBars />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
            시점·품목에 따라 실제 지원 내용은 다를 수 있어요. 대상자 구분은 건강보험료
            순위·의료급여 여부로 정해지며, 정확한 구분은 공단에서 확인하실 수 있어요.
          </p>
        </section>

        {/* 품목 소개 */}
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-bold text-ink-900">어떤 걸 받을 수 있나요</h2>
          <p className="mb-4 text-sm leading-relaxed text-ink-500">
            위생상 남이 쓰던 걸 쓰기 어려운 품목은 구입, 비싸고 오래 쓰는 장비는 대여로
            나뉘어요.
          </p>
          <WelfareItemTabs purchase={PURCHASE_ITEMS} rental={RENTAL_ITEMS} />
        </section>

        {/* 이용 절차 */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-ink-900">어떻게 받나요</h2>
          <ol className="relative space-y-5 border-l-2 border-primary-100 pl-6">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="animate-fade-up relative"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="absolute -left-[31px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold text-white shadow-soft">
                  {i + 1}
                </span>
                <p className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[15px] font-bold text-ink-900">{step.title}</span>
                  <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-bold text-mint-700">
                    {step.badge}
                  </span>
                </p>
                <p className="text-sm leading-relaxed text-ink-500">{step.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-ink-900">자주 묻는 질문</h2>
          <dl className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="mb-1 text-sm font-bold text-ink-900">{f.q}</dt>
                <dd className="text-sm leading-[1.75] text-ink-500">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 마무리 CTA */}
        <section className="mt-10 rounded-3xl bg-gradient-to-br from-royal-500 to-royal-600 p-6 text-center shadow-royal">
          <p className="mb-1.5 text-lg font-extrabold text-white">
            우리 어르신은 얼마나 받을 수 있을까요?
          </p>
          <p className="mb-5 text-[13px] leading-relaxed text-white/80">
            로그인하고 요양인정번호를 등록하면 마이페이지에서 바로 확인할 수 있어요.
          </p>
          <Link
            href="/mypage/welfare-benefit"
            className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-bold text-royal-700 shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            로그인하고 확인하기
            <ArrowRight size={15} />
          </Link>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-white/70">
            <PhoneCall size={12} />
            바로 상담하고 싶다면 가까운 복지용구 사업소로 전화 문의도 가능해요
          </p>
        </section>
      </div>
    </main>
  );
}
