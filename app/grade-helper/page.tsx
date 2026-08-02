import type { Metadata } from "next";
import { GradeHelperChat } from "@/components/GradeHelperChat";
import { SITE_URL, OG_IMAGE } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

export const metadata: Metadata = {
  title: "AI 장기요양등급 도우미 — 1분 대화로 예상 등급 확인",
  description:
    "버튼만 눌러 답하는 13개 질문으로 부모님의 장기요양등급 예상 범위(1~5등급·인지지원등급)를 1분 만에 확인하세요. 결과에 따라 복지용구, 등급 신청 방법, 우리 동네 요양시설까지 바로 이어드려요.",
  keywords: [
    "장기요양등급 확인",
    "요양등급 챗봇",
    "장기요양등급 간단 테스트",
    "노인장기요양보험 등급",
    "요양등급 몇등급",
    "치매 등급 신청",
  ],
  alternates: { canonical: "/grade-helper" },
  openGraph: {
    images: [OG_IMAGE],
    title: "AI 장기요양등급 도우미 — 1분 대화로 확인",
    description: "버튼만 눌러 답하는 13개 질문으로 예상 등급 범위를 확인하세요.",
    url: `${SITE_URL}/grade-helper`,
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "돌보다 AI 장기요양등급 도우미",
      url: `${SITE_URL}/grade-helper`,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
      description:
        "13개 버튼형 질문으로 장기요양등급 예상 범위를 안내하는 무료 도우미입니다. 실제 등급은 국민건강보험공단 방문조사와 등급판정위원회가 결정합니다.",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "장기요양등급은 어떻게 확인하나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "국민건강보험공단에 인정 신청을 하면 방문조사와 의사소견서, 등급판정위원회 심의를 거쳐 결정됩니다. 신청 전에 돌보다 AI 도우미로 예상 범위를 미리 가늠해볼 수 있어요.",
          },
        },
        {
          "@type": "Question",
          name: "몇 개 질문에 답하면 되나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "13개 안팎의 버튼형 질문에 답하면 예상 등급 범위가 나와요. 공단 인정조사표 52개 항목을 핵심만 추린 간단 스크리닝이에요.",
          },
        },
        {
          "@type": "Question",
          name: "결과가 실제 등급과 같나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "참고용 예상 범위예요. 실제 등급은 공단 직원의 방문조사(52개 항목)와 의사소견서를 바탕으로 등급판정위원회가 결정합니다.",
          },
        },
      ],
    },
  ],
};

export default function GradeHelperPage() {
  return (
    <main className="min-h-[85vh] bg-ivory-50 px-4 py-8 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      <div className="mx-auto max-w-xl">
        <h1 className="text-xl font-extrabold text-ink-900">AI 장기요양등급 도우미</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          버튼만 눌러 답하면 1분 안에 예상 등급 범위를 알려드려요.
          <br />
          <span className="text-ink-300">
            정식 테스트는{" "}
            <a href="/grade-test" className="font-semibold text-royal-600 underline">
              등급 예상 테스트
            </a>
            에서 할 수 있어요.
          </span>
        </p>
        <div className="mt-6">
          <GradeHelperChat />
        </div>
      </div>
    </main>
  );
}
