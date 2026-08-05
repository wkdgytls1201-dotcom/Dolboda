import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ChevronDown, ChevronRight, Clock3, ListOrdered } from "lucide-react";
import { GUIDES, findGuide, guideReadMinutes } from "@/lib/guides";
import { GuideIllustration } from "@/components/GuideIllustration";
import { SITE_URL, OG_IMAGE } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

// 전부 정적 콘텐츠 — 빌드 때 생성해 온전한 HTML로 서빙한다
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = findGuide(decodeURIComponent(params.slug));
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guide/${guide.slug}` },
    openGraph: {
      images: [OG_IMAGE],
      title: guide.title,
      description: guide.description,
      url: `${SITE_URL}/guide/${guide.slug}`,
      type: "article",
    },
  };
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = findGuide(decodeURIComponent(params.slug));
  if (!guide) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        dateModified: guide.updated,
        author: { "@type": "Organization", name: "돌보다" },
        publisher: { "@type": "Organization", name: "돌보다", url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}/guide/${guide.slug}`,
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "요양 가이드", item: `${SITE_URL}/guide` },
          { "@type": "ListItem", position: 3, name: guide.shortTitle },
        ],
      },
    ],
  };

  const related = guide.related
    .map((slug) => findGuide(slug))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  const readMinutes = guideReadMinutes(guide);

  return (
    <main className="mx-auto max-w-2xl scroll-smooth px-4 pb-24 pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />

      {/* 읽기 진행 바 — CSS 스크롤 드리븐(배너와 같은 기법). JS 0바이트, 미지원
          브라우저에선 scaleX(0) 그대로라 아예 안 보인다. 긴 글에서 "얼마나 남았나"가
          이탈을 줄인다. */}
      <div className="guide-progress" aria-hidden />
      <style>{`
        html { scroll-behavior: smooth; }
        .guide-progress {
          position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 60;
          background: linear-gradient(90deg, #FF6250, #FFB86B);
          transform-origin: 0 50%; transform: scaleX(0);
          animation: guide-progress-grow linear both;
          animation-timeline: scroll(root);
        }
        @keyframes guide-progress-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @media print { .guide-progress { display: none; } }
      `}</style>

      {/* 빵부스러기 */}
      <nav aria-label="현재 위치" className="mb-5 flex items-center gap-1 text-xs text-ink-300">
        <Link href="/" className="hover:text-ink-500">홈</Link>
        <ChevronRight size={12} />
        <Link href="/guide" className="hover:text-ink-500">요양 가이드</Link>
        <ChevronRight size={12} />
        <span className="truncate text-ink-500">{guide.shortTitle}</span>
      </nav>

      <span className="mb-2 inline-block rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
        {guide.category}
      </span>
      <h1 className="mb-2.5 break-keep text-2xl font-bold leading-snug text-ink-900">
        {guide.title}
      </h1>
      <p className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-300">
        <span className="inline-flex items-center gap-1 font-semibold text-ink-500">
          <Clock3 size={12} aria-hidden />약 {readMinutes}분
        </span>
        <span aria-hidden>·</span>
        <span>{guide.updated} 기준</span>
        <span aria-hidden>·</span>
        <span>국민건강보험공단·보건복지부 고시 자료 기반</span>
      </p>

      {/* 카테고리별 일러스트 — 글만 이어지면 읽기 부담이 커서 시선을 쉬어가게 한다 */}
      <GuideIllustration category={guide.category} />

      {/* 3줄 요약 — 바쁜 보호자가 여기까지만 읽어도 답을 얻게 */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary-50 to-peach-100/60 p-5 ring-1 ring-primary-100/60">
        <p className="mb-2.5 text-xs font-bold text-primary-700">3줄 요약</p>
        <ul className="space-y-2.5">
          {guide.keyPoints.map((k) => (
            <li
              key={k}
              className="flex gap-2.5 break-keep text-[15px] font-semibold leading-[1.7] text-ink-900"
            >
              <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
                <Check size={11} strokeWidth={3} aria-hidden />
              </span>
              {k}
            </li>
          ))}
        </ul>
      </div>

      {/* 목차 — 긴 글에서 원하는 절로 바로 간다. 앵커는 섹션 h2의 id */}
      <nav
        aria-label="목차"
        className="mb-9 rounded-2xl border border-ink-100 bg-ivory-100/60 p-4"
      >
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-500">
          <ListOrdered size={13} aria-hidden />
          목차
        </p>
        <ol className="space-y-1">
          {guide.sections.map((s, i) => (
            <li key={s.heading}>
              <a
                href={`#sec-${i + 1}`}
                className="flex min-h-[36px] items-center gap-2 break-keep rounded-lg px-1.5 text-[13.5px] font-semibold leading-snug text-ink-700 transition-colors hover:bg-white hover:text-primary-700"
              >
                <span className="w-5 shrink-0 text-right text-[11px] font-extrabold tabular-nums text-primary-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="space-y-11">
        {guide.sections.map((s, i) => (
          <section key={s.heading} id={`sec-${i + 1}`} className="scroll-mt-20">
            {/* 번호를 원형 배지로 — 어디까지 읽었는지 감이 오고 목차와 짝이 맞는다 */}
            <h2 className="mb-4 flex items-start gap-2.5 break-keep text-[19px] font-bold leading-snug text-ink-900">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[12px] font-extrabold tabular-nums text-primary-600 ring-1 ring-primary-100">
                {i + 1}
              </span>
              {s.heading}
            </h2>
            {s.paragraphs.map((p) => (
              <p
                key={p.slice(0, 20)}
                className="mb-4 break-keep text-[16px] leading-[1.85] text-ink-700"
              >
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="space-y-3 rounded-2xl border border-ink-100/60 bg-white p-5 shadow-card">
                {s.list.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 break-keep text-[15px] leading-[1.75] text-ink-700"
                  >
                    <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-700">
                      <Check size={11} strokeWidth={3} aria-hidden />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section id="faq" className="scroll-mt-20">
          <h2 className="mb-3 text-lg font-bold text-ink-900">자주 묻는 질문</h2>
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            {guide.faq.map((f) => (
              <details
                key={f.q}
                className="group border-b border-ink-100/70 last:border-b-0 open:bg-ivory-100/40"
              >
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-bold text-ink-900 transition-colors hover:bg-ivory-100/60 [&::-webkit-details-marker]:hidden">
                  <span className="break-keep leading-relaxed">
                    <span className="mr-1.5 font-extrabold text-primary-500">Q.</span>
                    {f.q}
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className="shrink-0 text-ink-300 transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p className="break-keep px-4 pb-4 pl-9 text-sm leading-[1.8] text-ink-600">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </article>

      {/* CTA — 가이드에서 실제 검색·테스트로 연결 */}
      <div className="mt-10 space-y-2">
        {guide.cta.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            className={`flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all duration-200 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
              i === 0
                ? "bg-primary-500 text-white shadow-soft hover:bg-primary-600"
                : "border border-ink-100 bg-white text-ink-700 hover:bg-ink-100"
            }`}
          >
            {c.label}
            <ArrowRight size={16} />
          </Link>
        ))}
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-bold text-ink-300">함께 읽으면 좋아요</h2>
          <div className="space-y-2">
            {related.map((g) => (
              <Link
                key={g.slug}
                href={`/guide/${g.slug}`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 text-sm font-semibold text-ink-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="break-keep leading-snug">{g.shortTitle}</span>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-ink-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary-400"
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
