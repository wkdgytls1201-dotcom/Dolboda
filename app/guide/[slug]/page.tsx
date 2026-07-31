import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { GUIDES, findGuide } from "@/lib/guides";
import { SITE_URL } from "@/lib/siteConfig";

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

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
      <h1 className="mb-2 text-2xl font-bold leading-snug text-ink-900">{guide.title}</h1>
      <p className="mb-5 text-xs text-ink-300">
        돌보다 요양 가이드 · {guide.updated} 기준 · 국민건강보험공단·보건복지부 고시 자료 기반
      </p>

      {/* 3줄 요약 — 바쁜 보호자가 여기까지만 읽어도 답을 얻게 */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-primary-50 to-peach-100/60 p-4">
        <p className="mb-2 text-xs font-bold text-primary-700">3줄 요약</p>
        <ul className="space-y-1.5">
          {guide.keyPoints.map((k) => (
            <li key={k} className="flex gap-2 text-sm font-semibold leading-relaxed text-ink-900">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
              {k}
            </li>
          ))}
        </ul>
      </div>

      <article className="space-y-8">
        {guide.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="mb-3 text-lg font-bold text-ink-900">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 20)} className="mb-3 text-[15px] leading-relaxed text-ink-700">
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
                {s.list.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink-700">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-400" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section>
          <h2 className="mb-3 text-lg font-bold text-ink-900">자주 묻는 질문</h2>
          <div className="space-y-2.5">
            {guide.faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-ink-100 bg-white p-4">
                <summary className="cursor-pointer list-none text-sm font-bold text-ink-900">
                  Q. {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.a}</p>
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
            className={`flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 ${
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
                className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white px-4 py-3.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
              >
                {g.shortTitle}
                <ChevronRight size={16} className="shrink-0 text-ink-300" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
