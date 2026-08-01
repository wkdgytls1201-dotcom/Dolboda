import type { Metadata } from "next";
import { Sparkles, ArrowRight } from "lucide-react";
import { GradeTest } from "@/components/GradeTest";
import { TEST_AREAS, TOTAL_ITEMS, APPLY_STEPS } from "@/lib/gradeTest";
import { SITE_URL } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

export const metadata: Metadata = {
  title: "장기요양등급 예상 테스트 — 요양등급 자가진단",
  description: `노인장기요양보험 인정조사표 ${TOTAL_ITEMS}개 항목으로 우리 부모님 장기요양등급(1~5등급·인지지원등급)을 미리 가늠해보세요. 신체기능·인지기능·행동변화·간호처치·재활 5개 영역을 3분 만에 확인하고, 등급별 이용 가능한 서비스와 신청 절차까지 안내해드려요.`,
  keywords: [
    "장기요양등급 테스트",
    "요양등급 자가진단",
    "장기요양등급 판정기준",
    "노인장기요양보험 등급",
    "요양등급 신청방법",
    "치매 인지지원등급",
    "장기요양인정조사표",
  ],
  alternates: { canonical: "/grade-test" },
  openGraph: {
    title: "장기요양등급 예상 테스트 — 3분이면 확인",
    description: `인정조사표 ${TOTAL_ITEMS}개 항목으로 예상 등급과 이용 가능한 서비스를 확인하세요.`,
    url: `${SITE_URL}/grade-test`,
    type: "website",
  },
};

// 검색·AI가 이해하도록 테스트 성격과 자주 묻는 질문을 구조화 데이터로 제공한다.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "돌보다", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "장기요양등급 예상 테스트", item: `${SITE_URL}/grade-test` },
      ],
    },
    {
      "@type": "HowTo",
      name: "장기요양등급 신청 절차",
      step: APPLY_STEPS.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.desc,
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "장기요양등급은 어떻게 정해지나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `국민건강보험공단 직원이 댁을 방문해 신체기능·인지기능·행동변화·간호처치·재활 5개 영역 ${TOTAL_ITEMS}개 항목을 조사하고, 의사소견서와 함께 등급판정위원회가 심의해 1~5등급 또는 인지지원등급을 결정해요. 신청일로부터 보통 30일 이내에 결과가 나와요.`,
          },
        },
        {
          "@type": "Question",
          name: "장기요양등급 신청 자격은 어떻게 되나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "만 65세 이상이거나, 65세 미만이라도 치매·뇌혈관질환 등 노인성 질병이 있는 분이 신청할 수 있어요. 본인은 물론 가족이나 대리인이 대신 신청하는 것도 가능해요.",
          },
        },
        {
          "@type": "Question",
          name: "등급에 따라 어떤 서비스를 이용할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "1~2등급은 요양원 입소가 가능하고, 3~5등급은 방문요양·주야간보호 같은 재가급여를 주로 이용해요. 5등급과 인지지원등급은 치매 진단을 받은 분이 대상이며 치매전담 주야간보호를 이용할 수 있어요.",
          },
        },
      ],
    },
  ],
};

export default function GradeTestPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      <div className="mx-auto max-w-xl px-4 pt-4">
        <a
          href="/grade-helper"
          className="group relative flex min-h-[64px] items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-royal-600 via-royal-500 to-primary-500 px-4 py-3.5 shadow-royal transition-all hover:-translate-y-0.5 hover:shadow-royal-hover"
        >
          <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" />
          <span className="absolute -bottom-8 right-10 h-16 w-16 rounded-full bg-white/10" />

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Sparkles size={18} className="text-white" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
              시간 없으면 AI 도우미로 1분 컷
              <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-extrabold">
                NEW
              </span>
            </span>
            <span className="mt-0.5 block text-[11px] text-white/80">
              버튼 13번만 눌러도 예상 등급이 나와요
            </span>
          </span>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-royal-600 transition-transform group-hover:translate-x-0.5">
            <ArrowRight size={16} />
          </span>
        </a>
      </div>
      <GradeTest />

      {/* 검색엔진·AI가 읽는 정적 설명 (테스트는 클라이언트에서만 그려지므로 별도로 둔다) */}
      <section className="sr-only">
        <h2>장기요양등급 예상 테스트 안내</h2>
        <p>
          노인장기요양보험 장기요양인정조사표의 5개 영역 {TOTAL_ITEMS}개 항목을 기준으로 예상 등급을
          가늠해보는 자가진단입니다. 영역은 {TEST_AREAS.map((a) => a.title).join(", ")}으로
          구성됩니다. 실제 등급은 국민건강보험공단의 방문조사와 의사소견서를 바탕으로
          등급판정위원회가 결정합니다.
        </p>
      </section>
    </>
  );
}
