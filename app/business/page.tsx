import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Megaphone, LineChart, Lock } from "lucide-react";
import {
  BUSINESS_PLANS,
  SIGNUP_STEPS,
  VAT_NOTE,
  formatPlanPrice,
} from "@/lib/businessPlans";
import { BusinessInquiryForm } from "./BusinessInquiryForm";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

// 시설 운영자용 입점 안내 (B2B).
//
// 보호자용 화면과 톤이 달라야 한다 — 여기 오는 사람은 "우리 시설을 어떻게 알릴까"를
// 이미 결정하고 온 사무국장·원장이다. 감성적인 설명보다 조건·가격·절차가 먼저다.
//
// 본문은 전부 서버 렌더다(폼만 클라이언트). "요양원 홍보"·"요양시설 마케팅" 같은
// 검색어로 들어오는 페이지라 크롤러가 내용을 그대로 읽어야 한다.

export const metadata: Metadata = {
  title: "시설 운영자 입점 안내 — 우리 시설을 찾는 보호자에게",
  description:
    "요양원·요양병원·주야간보호·방문요양 운영자를 위한 돌보다 입점 안내입니다. 시설 페이지 무료 인증부터 비즈니스 플러스(월 49,000원), 지역 스폰서(월 149,000원), 지역 프리미엄(월 299,000원)까지 요금과 절차를 안내합니다.",
  alternates: { canonical: "/business" },
  openGraph: {
    title: `${SITE_NAME} 시설 운영자 입점 안내`,
    description:
      "시설 페이지 무료 인증부터 지역 스폰서·프리미엄까지. 스폰서 노출은 '광고'로 표시해 운영합니다.",
    url: `${SITE_URL}/business`,
    type: "website",
    images: [OG_IMAGE],
  },
};

const WHY = [
  {
    icon: ShieldCheck,
    title: "이미 우리 시설 페이지가 있습니다",
    desc: "국민건강보험공단·건강보험심사평가원 공개 자료로 전국 2만 8천여 곳이 이미 등록돼 있어요. 새로 만드는 게 아니라, 운영자 인증을 하고 그 페이지를 직접 관리하시는 겁니다.",
  },
  {
    icon: LineChart,
    title: "보호자가 실제로 무엇을 보는지 알 수 있습니다",
    desc: "우리 시설 페이지를 몇 명이 봤는지, 어떤 검색어로 들어왔는지, 상담으로 얼마나 이어졌는지를 숫자로 확인하실 수 있어요.",
  },
  {
    icon: Megaphone,
    title: "찾고 있는 보호자에게만 닿습니다",
    desc: "우리 시·군·구에서 시설을 알아보는 사람에게 노출됩니다. 불특정 다수에게 뿌리는 광고와 달리, 이미 입소를 고민 중인 보호자예요.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "이미 등록돼 있다면 굳이 신청할 이유가 있나요?",
    a: "공공데이터에는 시설의 분위기, 프로그램, 최근 소식 같은 것이 없습니다. 인증을 하시면 소개글과 사진을 직접 올리고 잘못된 정보를 고칠 수 있어요. 여기까지는 무료이고, 유료 상품은 그다음 선택입니다.",
  },
  {
    q: "스폰서 노출은 어디에 보이나요?",
    a: "해당 지역에서 시설을 찾는 보호자의 화면 상단 전용 자리에 노출됩니다. 노출수·클릭수는 매월 리포트로 확인하실 수 있어요.",
  },
  {
    q: "돌보다 안심지수는 어떻게 정해지나요?",
    a: "공개된 데이터(평가등급·인력·현원 등)로 계산하고 계산식을 데이터 출처 페이지에 공개하고 있어요. 인력 현황처럼 원본 데이터가 실제와 다르면 정정해 드리고, 그 결과로 점수가 달라질 수 있습니다.",
  },
  {
    q: "약정 기간이 있나요?",
    a: "월 단위이며 최소 약정이 없습니다. 다음 달 결제 전에 알려주시면 중단됩니다. 지역 스폰서는 슬롯 제한이 있어 중단하시면 대기 중인 시설에 자리가 넘어가요.",
  },
  {
    q: "지역 스폰서는 왜 지역당 3곳뿐인가요?",
    a: "광고 자리가 많아질수록 한 곳 한 곳의 주목도가 낮아지기 때문이에요. 자리가 차면 추가로 팔지 않고 대기로 안내드립니다.",
  },
  {
    q: "시설 정보가 실제와 다릅니다. 고치려면 유료인가요?",
    a: "아닙니다. 정보 정정은 언제나 무료이고 인증 전에도 요청하실 수 있어요. 공공데이터 갱신 시점 때문에 생기는 차이라 저희가 확인 후 반영합니다.",
  },
  {
    q: "세금계산서 발행되나요?",
    a: "발행됩니다. 표시된 금액은 모두 부가세 별도이며, 신청 시 사업자등록증을 확인한 뒤 매월 발행해 드립니다.",
  },
];

const PAGE_URL = `${SITE_URL}/business`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "시설 운영자 입점 안내", item: PAGE_URL },
      ],
    },
    {
      "@type": "Service",
      name: `${SITE_NAME} 시설 운영자 서비스`,
      serviceType: "요양시설 온라인 노출·페이지 관리",
      areaServed: "KR",
      provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      url: PAGE_URL,
      offers: BUSINESS_PLANS.map((p) => ({
        "@type": "Offer",
        name: p.name,
        description: p.tagline,
        ...(p.monthly !== null && {
          price: p.monthly,
          priceCurrency: "KRW",
          // 부가세 별도임을 구조화 데이터에도 남긴다 — 화면 표기와 어긋나면 안 된다
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: p.monthly,
            priceCurrency: "KRW",
            valueAddedTaxIncluded: false,
            unitCode: "MON",
          },
        }),
      })),
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

export default function BusinessPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      <nav aria-label="현재 위치" className="mb-3 text-xs text-ink-300">
        <Link href="/" className="inline-block py-2 hover:text-ink-500">
          홈
        </Link>
        <span className="mx-1">›</span>
        <span className="text-ink-500">시설 운영자 안내</span>
      </nav>

      <h1 className="mb-3 text-2xl font-bold leading-snug text-ink-900 sm:text-3xl">
        우리 시설을 찾고 있는 보호자에게
        <br />
        정확한 정보로 닿으세요
      </h1>
      <p className="mb-6 text-[15px] leading-[1.8] text-ink-700">
        돌보다에는 전국 2만 8천여 곳의 요양시설이 공공데이터 기준으로 이미 등록돼 있습니다.
        운영자 인증을 하시면 그 페이지를 직접 관리하실 수 있어요.{" "}
        <strong className="font-bold text-ink-900">인증과 정보 관리는 무료입니다.</strong>
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <a
          href="#apply"
          className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600"
        >
          무료로 시설 인증 신청하기
        </a>
        <a
          href="#plans"
          className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl border border-ink-100 bg-white text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
        >
          요금제 먼저 보기
        </a>
      </div>
      {/* 이미 인증한 담당자의 재방문 동선 — 이 페이지가 콘솔의 유일한 공식 입구다 */}
      <p className="mb-12 text-center text-[13px] text-ink-300">
        이미 인증하셨나요?{" "}
        <Link href="/business/console" className="font-semibold text-primary-600 hover:underline">
          시설 콘솔 열기
        </Link>
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-bold text-ink-900">왜 돌보다인가요</h2>
        <div className="space-y-3">
          {WHY.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-white p-5 shadow-card">
              <p className="mb-2 flex items-center gap-2 text-[15px] font-bold text-ink-900">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Icon size={16} />
                </span>
                {title}
              </p>
              <p className="text-[15px] leading-[1.75] text-ink-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-1.5 text-lg font-bold text-ink-900">인증 절차</h2>
        <p className="mb-4 text-sm leading-relaxed text-ink-500">
          서류를 여러 건 받는 대신, 공단에 공개된 시설 대표번호로 직접 확인 전화를 드립니다.
          그래서 준비하실 서류는 한 건이면 충분해요.
        </p>
        <ol className="space-y-3">
          {SIGNUP_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3.5 rounded-2xl bg-white p-5 shadow-card">
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white"
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold text-ink-900">{step.title}</span>
                  <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-bold text-mint-700">
                    {step.badge}
                  </span>
                </span>
                <span className="block text-[15px] leading-[1.75] text-ink-500">{step.desc}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex gap-2 rounded-2xl bg-ink-100/40 p-4 text-[13px] leading-relaxed text-ink-500">
          <Lock size={15} className="mt-0.5 shrink-0 text-ink-300" />
          <span>
            받은 서류는 시설 실재와 운영 주체를 확인하는 용도로만 쓰고 확인 후 지체 없이
            파기합니다. 담당자 개인정보는 상담 목적으로만 보관하며, 신청이 마무리되지 않으면
            6개월 뒤 파기합니다.
          </span>
        </p>
      </section>

      <section id="plans" className="mb-12 scroll-mt-20">
        <h2 className="mb-1.5 text-lg font-bold text-ink-900">요금제</h2>
        <p className="mb-4 text-sm text-ink-500">
          표시 금액은 모두 <strong className="font-semibold text-ink-700">{VAT_NOTE}</strong>이며,
          최소 약정 없이 월 단위로 이용하실 수 있어요.
        </p>

        <div className="space-y-3">
          {BUSINESS_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl bg-white p-5 shadow-card ${
                plan.highlight ? "border-2 border-primary-300" : "border border-transparent"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-bold text-ink-900">{plan.name}</span>
                  {plan.highlight && (
                    <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[11px] font-bold text-white">
                      가장 많이 선택
                    </span>
                  )}
                </span>
                <span className="text-right">
                  <span className="text-lg font-extrabold text-ink-900">
                    {formatPlanPrice(plan)}
                  </span>
                  {plan.priceNote && (
                    <span className="ml-1 text-xs text-ink-300">{plan.priceNote}</span>
                  )}
                </span>
              </div>

              <p className="mb-1 text-sm leading-relaxed text-ink-700">{plan.tagline}</p>
              <p className="mb-3 text-xs text-ink-300">{plan.audience}</p>

              {plan.includesPrevious && (
                <p className="mb-2.5 rounded-xl bg-ivory-100 px-3 py-2 text-xs font-semibold text-ink-500">
                  + {plan.includesPrevious} 포함
                </p>
              )}

              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm leading-relaxed text-ink-500">
                    <Check size={15} className="mt-1 shrink-0 text-mint-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <a
          href="#apply"
          className="mt-4 flex min-h-[52px] items-center justify-center rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600"
        >
          신청하고 상담받기
        </a>
      </section>

      {/* 시설 콘솔 미리보기 — 스크린샷 이미지 대신 CSS 목업(전송량 0, 다크·라이트 무관).
          "가입하면 이 화면을 갖게 된다"가 어떤 설명보다 잘 전달된다. */}
      <section className="mb-12">
        <h2 className="mb-1.5 text-lg font-bold text-ink-900">인증하면 이런 화면이 열려요</h2>
        <p className="mb-4 text-sm leading-relaxed text-ink-500">
          시설 콘솔에서 소개글과 사진을 직접 올리고, 우리 시설로 들어온 상담 신청을 숫자로
          확인할 수 있어요. 폰에서도 똑같이 됩니다.
        </p>

        <div
          aria-hidden
          className="select-none rounded-2xl border border-ink-100 bg-white p-4 shadow-card"
        >
          {/* 창 상단 바 */}
          <div className="mb-3 flex items-center gap-1.5 border-b border-ink-100 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-primary-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-mint-300" />
            <span className="ml-2 text-[11px] font-semibold text-ink-300">
              dolboda.kr/business/console
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-ink-900">햇살요양원</span>
            <span className="rounded-full bg-royal-50 px-2 py-0.5 text-[10px] font-bold text-royal-700">
              비즈니스 플러스
            </span>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-ivory-100 p-3 text-center">
              <p className="text-[10px] text-ink-300">최근 30일 상담</p>
              <p className="text-lg font-extrabold text-ink-900">12건</p>
            </div>
            <div className="rounded-xl bg-ivory-100 p-3 text-center">
              <p className="text-[10px] text-ink-300">전체 상담</p>
              <p className="text-lg font-extrabold text-ink-900">47건</p>
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-ink-100 p-3">
            <p className="mb-1.5 text-[11px] font-bold text-ink-700">시설 소개글</p>
            <div className="space-y-1.5">
              <span className="block h-2 w-11/12 rounded bg-ink-100" />
              <span className="block h-2 w-full rounded bg-ink-100" />
              <span className="block h-2 w-2/3 rounded bg-ink-100" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <span className="aspect-square rounded-lg bg-peach-100" />
            <span className="aspect-square rounded-lg bg-mint-100" />
            <span className="aspect-square rounded-lg bg-royal-100" />
            <span className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-ink-100 text-[10px] font-bold text-ink-300">
              +
            </span>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-ink-300">
          여기서 쓴 소개글과 사진은 보호자가 보는 시설 상세 페이지에 &lsquo;시설 제공&rsquo;
          표시와 함께 실려요. 안심지수 계산식과 데이터 출처는{" "}
          <Link href="/data-policy" className="font-semibold text-primary-600 hover:underline">
            데이터 출처 페이지
          </Link>
          에 공개돼 있습니다.
        </p>
      </section>

      <section className="mb-12">
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

      <section id="apply" className="scroll-mt-20">
        <h2 className="mb-1.5 text-lg font-bold text-ink-900">입점 신청</h2>
        <p className="mb-4 text-sm leading-relaxed text-ink-500">
          아래 정보만 남겨주시면 1영업일 안에 시설 대표번호로 연락드립니다. 서류와 결제는 통화
          이후에 진행하니, 지금은 결정하지 않으셔도 괜찮아요.
        </p>
        <BusinessInquiryForm defaultPlan="free" />
        <p className="mt-3 text-center text-[13px] text-ink-300">
          전화 문의 010-2222-9943 · 이메일 wkdgytls1201@gmail.com
        </p>
      </section>
    </main>
  );
}
