import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Megaphone, LineChart, Lock } from "lucide-react";
import { SIGNUP_STEPS } from "@/lib/businessPlans";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

// 기업회원용 입점 안내 (B2B).
//
// 앞단(이 페이지)은 **무료 인증의 혜택**만 말한다. 요금제·가격은 인증을 마친 담당자가
// 기업회원 콘솔(/business/console)에서 본다 — 아직 신뢰가 없는 첫 방문에서 가격표부터
// 내밀면 "결국 돈 내라는 거네"로 읽혀 신청 자체가 줄고, 무료 범위가 넓다는 사실이 묻힌다.
//
// 본문은 전부 서버 렌더다(폼만 클라이언트). "요양원 홍보"·"요양시설 마케팅" 같은
// 검색어로 들어오는 페이지라 크롤러가 내용을 그대로 읽어야 한다.

export const metadata: Metadata = {
  title: "기업회원 무료 등록 — 우리 시설을 찾는 보호자에게",
  description:
    "요양원·요양병원·주야간보호·방문요양 기업회원을 위한 돌보다 무료 인증 안내입니다. 시설 페이지 직접 관리, 상담 신청 수신, 방문 통계까지 무료로 시작하세요.",
  alternates: { canonical: "/business" },
  openGraph: {
    title: `${SITE_NAME} 기업회원 무료 등록`,
    description:
      "시설 페이지 직접 관리, 상담 신청 수신, 방문 통계까지 무료로 시작하세요.",
    url: `${SITE_URL}/business`,
    type: "website",
    images: [OG_IMAGE],
  },
};

const WHY = [
  {
    icon: ShieldCheck,
    title: "이미 우리 시설 페이지가 있습니다",
    desc: "국민건강보험공단·건강보험심사평가원 공개 자료로 전국 2만 8천여 곳이 이미 등록돼 있어요. 새로 만드는 게 아니라, 기업회원 인증을 하고 그 페이지를 직접 관리하시는 겁니다.",
  },
  {
    icon: LineChart,
    title: "보호자가 실제로 무엇을 보는지 알 수 있습니다",
    desc: "우리 시설 페이지를 몇 명이 봤는지, 어떤 검색어로 들어왔는지, 상담으로 얼마나 이어졌는지를 숫자로 확인하실 수 있어요.",
  },
  {
    icon: Megaphone,
    title: "찾고 있는 보호자에게 닿습니다",
    desc: "우리 시·군·구에서 시설을 알아보는 보호자가 매일 돌보다를 봅니다. 이미 입소를 고민 중인 가족에게 정확한 정보로 닿을 수 있어요.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "이미 등록돼 있다면 굳이 신청할 이유가 있나요?",
    a: "공공데이터에는 시설의 분위기, 프로그램, 최근 소식 같은 것이 없습니다. 인증을 하시면 소개글과 사진을 직접 올리고 잘못된 정보를 고칠 수 있어요.",
  },
  {
    q: "정말 무료인가요?",
    a: "네. 인증, 시설 페이지 관리(소개글·사진), 상담 신청 수신, 기본 통계까지 모두 무료입니다. 약정이나 자동 결제 같은 것도 없어요.",
  },
  {
    q: "돌보다 안심지수는 어떻게 정해지나요?",
    a: "공개된 데이터(평가등급·인력·현원 등)로 계산하고 계산식을 데이터 출처 페이지에 공개하고 있어요. 인력 현황처럼 원본 데이터가 실제와 다르면 정정해 드리고, 그 결과로 점수가 달라질 수 있습니다.",
  },
  {
    q: "시설 정보가 실제와 다르면 어떻게 하나요?",
    a: "정정 요청을 주시면 확인 후 반영해 드려요. 인증 전에도 요청하실 수 있습니다. 공공데이터 갱신 시점 때문에 생기는 차이라, 바로잡는 데 비용은 들지 않아요.",
  },
  {
    q: "인증에 무엇이 필요한가요?",
    a: "신청서에는 시설명·기관기호(또는 사업자등록번호)·담당자 연락처만 적으시면 됩니다. 이후 이메일로 장기요양기관 지정서 또는 사업자등록증 사본 한 건만 회신해 주시면 끝이에요. 전화 통화는 없습니다.",
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
        { "@type": "ListItem", position: 2, name: "기업회원 입점 안내", item: PAGE_URL },
      ],
    },
    {
      // 가격은 화면에서 뺐으므로 구조화 데이터에도 싣지 않는다 —
      // 화면에 없는 가격이 검색 결과에 뜨면 그게 곧 어긋남이다.
      "@type": "Service",
      name: `${SITE_NAME} 기업회원 서비스`,
      serviceType: "요양시설 페이지 관리·상담 연결",
      areaServed: "KR",
      provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      url: PAGE_URL,
      offers: { "@type": "Offer", name: "시설 무료 인증·페이지 관리", price: 0, priceCurrency: "KRW" },
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
        <span className="text-ink-500">기업회원 안내</span>
      </nav>

      <h1 className="mb-3 text-2xl font-bold leading-snug text-ink-900 sm:text-3xl">
        우리 시설을 찾고 있는 보호자에게
        <br />
        정확한 정보로 닿으세요
      </h1>
      <p className="mb-6 text-[15px] leading-[1.8] text-ink-700">
        돌보다에는 전국 2만 8천여 곳의 요양시설이 공공데이터 기준으로 이미 등록돼 있습니다.
        기업회원 인증을 하시면 그 페이지를 직접 관리하실 수 있어요.{" "}
        <strong className="font-bold text-ink-900">인증과 정보 관리는 무료입니다.</strong>
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/business/apply"
          className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600"
        >
          무료로 시설 인증 신청하기
        </Link>
        <a
          href="#benefits"
          className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl border border-ink-100 bg-white text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
        >
          어떤 혜택이 있나요
        </a>
      </div>
      {/* 이미 인증한 담당자의 재방문 동선 — 이 페이지가 콘솔의 유일한 공식 입구다 */}
      <p className="mb-12 text-center text-[13px] text-ink-300">
        이미 인증하셨나요?{" "}
        <Link href="/business/console" className="font-semibold text-primary-600 hover:underline">
          기업회원 콘솔 열기
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
          전 과정이 비대면입니다 — 전화 통화 없이 이메일로만 진행되고, 준비하실 서류는 한
          건이면 충분해요.
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
            파기합니다. 담당자 개인정보의 수집 항목·보유 기간(2년)·파기 방법은 신청
            페이지의 안내에 전부 적어두었어요.
          </span>
        </p>
      </section>

      {/* 무료 혜택 — 요금제 대신 이 페이지의 중심. 가격은 인증 후 콘솔에서 안내한다. */}
      <section id="benefits" className="mb-12 scroll-mt-20">
        <h2 className="mb-1.5 text-lg font-bold text-ink-900">인증하면 무료로 받는 것들</h2>
        <p className="mb-4 text-sm text-ink-500">
          전부 무료이고, 약정도 없습니다. 인증만 하시면 바로 시작돼요.
        </p>

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <ul className="space-y-3">
            {[
              {
                t: "시설 페이지 직접 관리",
                d: "소개글과 시설 사진을 직접 올려, 공공데이터만으로는 전할 수 없는 우리 시설의 분위기를 보여줄 수 있어요.",
              },
              {
                t: "상담 신청 수신",
                d: "보호자가 우리 시설에 남긴 상담 신청이 시설 이메일로 바로 전달돼요. 전화를 놓쳐도 문의가 사라지지 않습니다.",
              },
              {
                t: "우리 시설을 찾는 보호자 통계",
                d: "몇 명이 페이지를 봤고 상담으로 얼마나 이어졌는지 콘솔에서 숫자로 확인할 수 있어요.",
              },
              {
                t: "잘못된 정보 정정 우선 처리",
                d: "공공데이터가 실제와 다르면 인증 시설의 정정 요청을 먼저 확인해 반영해 드려요.",
              },
            ].map((b) => (
              <li key={b.t} className="flex gap-2.5">
                <Check size={17} className="mt-0.5 shrink-0 text-mint-600" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-ink-900">{b.t}</span>
                  <span className="block text-sm leading-[1.7] text-ink-500">{b.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/business/apply"
          className="mt-4 flex min-h-[52px] items-center justify-center rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600"
        >
          무료로 시작하기
        </Link>
      </section>

      {/* 기업회원 콘솔 미리보기 — 스크린샷 이미지 대신 CSS 목업(전송량 0, 다크·라이트 무관).
          "가입하면 이 화면을 갖게 된다"가 어떤 설명보다 잘 전달된다. */}
      <section className="mb-12">
        <h2 className="mb-1.5 text-lg font-bold text-ink-900">인증하면 이런 화면이 열려요</h2>
        <p className="mb-4 text-sm leading-relaxed text-ink-500">
          기업회원 콘솔에서 소개글과 사진을 직접 올리고, 우리 시설로 들어온 상담 신청을 숫자로
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
            <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-bold text-mint-700">
              인증 시설
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

      {/* 신청은 전용 페이지(/business/apply)에서 — 동의 문서까지 한 호흡으로 받는다.
          여기는 큰 진입 버튼만 둔다(사용자 결정). */}
      <section id="apply" className="scroll-mt-20 rounded-3xl bg-gradient-to-br from-primary-500 to-peach-500 p-6 text-center shadow-soft sm:p-8">
        <h2 className="mb-1.5 text-xl font-extrabold text-white">
          지금 무료로 시설 인증을 시작하세요
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-white/85">
          신청 2분, 서류 1건. 전화 없이 이메일로만 진행돼요.
        </p>
        <Link
          href="/business/apply"
          className="inline-flex min-h-[56px] w-full max-w-sm items-center justify-center rounded-xl bg-white text-base font-extrabold text-primary-600 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
        >
          입점 신청하러 가기
        </Link>
        <p className="mt-4 text-[13px] text-white/70">이메일 문의 wkdgytls1201@gmail.com</p>
      </section>
    </main>
  );
}
