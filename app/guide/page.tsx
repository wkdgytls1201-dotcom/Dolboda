import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { GUIDES } from "@/lib/guides";
import { GuideListHero } from "@/components/GuideIllustration";
import { SITE_URL } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

// 카테고리 구분용 점 색 — 목록에서 분류가 한눈에 들어오게
const CATEGORY_DOT: Record<string, string> = {
  "시설 선택": "bg-primary-400",
  비용: "bg-accent-400",
  제도: "bg-royal-400",
};

export const metadata: Metadata = {
  title: "요양 가이드 — 보호자가 가장 많이 묻는 질문들",
  description:
    "요양원과 요양병원 차이, 한 달 비용, 장기요양등급 신청 방법, 좋은 요양원 고르는 법까지 — 부모님 돌봄을 준비하는 보호자를 위한 가이드 모음입니다.",
  alternates: { canonical: "/guide" },
};

const CATEGORY_ORDER = ["시설 선택", "비용", "제도"] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "돌보다 요양 가이드",
  itemListElement: GUIDES.map((g, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: g.title,
    url: `${SITE_URL}/guide/${g.slug}`,
  })),
};

export default function GuideListPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />

      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5 text-xs font-bold text-primary-700">
          <BookOpen size={13} />
          요양 가이드
        </span>
        <h1 className="mb-3 text-[26px] font-bold leading-tight text-ink-900">
          부모님 돌봄, 궁금한 것부터
          <br />
          하나씩 정리해 드릴게요
        </h1>
        <p className="text-[15px] leading-relaxed text-ink-500">
          보호자들이 가장 많이 묻는 질문을 공공데이터와 제도 기준으로 정리했어요.
        </p>
      </div>

      <GuideListHero />

      {CATEGORY_ORDER.map((category) => {
        const list = GUIDES.filter((g) => g.category === category);
        if (list.length === 0) return null;
        return (
          <section key={category} className="mb-9">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-500">
              <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[category]}`} aria-hidden />
              {category}
              <span className="font-medium text-ink-300">{list.length}편</span>
            </h2>
            <div className="space-y-2.5">
              {list.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guide/${g.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:shadow-card active:translate-y-0 active:scale-[0.98]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 block text-[17px] font-bold leading-snug text-ink-900">
                      {g.shortTitle}
                    </span>
                    <span className="line-clamp-2 block text-[13px] leading-relaxed text-ink-500">
                      {g.description}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-ink-300" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
