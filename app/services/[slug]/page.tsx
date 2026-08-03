import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SERVICE_LANDINGS, findServiceLanding } from "@/lib/serviceLanding";
import { CARE_SERVICES } from "@/lib/careServices";
import { findGuide } from "@/lib/guides";
import { SITE_URL, OG_IMAGE } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

// 서비스별 독립 랜딩 — /services 종합 페이지는 그대로 두고, "병원 간병" "가사 돌봄" 같은
// 검색어를 각각 노리는 정적 페이지를 추가한다. 전부 SSG.
export function generateStaticParams() {
  return SERVICE_LANDINGS.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const landing = findServiceLanding(decodeURIComponent(params.slug));
  if (!landing) return {};
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: `/services/${landing.slug}` },
    openGraph: {
      images: [OG_IMAGE],
      title: landing.metaTitle,
      description: landing.metaDescription,
      url: `${SITE_URL}/services/${landing.slug}`,
      type: "website",
    },
  };
}

export default function ServiceLandingPage({ params }: { params: { slug: string } }) {
  const landing = findServiceLanding(decodeURIComponent(params.slug));
  if (!landing) notFound();

  const service = CARE_SERVICES.find((s) => s.slug === landing.slug);
  if (!service) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: service.label,
        description: landing.metaDescription,
        provider: { "@type": "Organization", name: "돌보다", url: SITE_URL },
        areaServed: "대한민국",
      },
      {
        "@type": "FAQPage",
        mainEntity: landing.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "돌봄 서비스", item: `${SITE_URL}/services` },
          { "@type": "ListItem", position: 3, name: service.label },
        ],
      },
    ],
  };

  const guides = landing.relatedGuides
    .map((slug) => findGuide(slug))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  const primaryCta: { href: string; label: string; external?: boolean } =
    service.action.kind === "request"
      ? { href: `/care-request?type=${service.action.locationType}`, label: service.action.label }
      : { href: "https://www.longtermcare.or.kr", label: service.action.label, external: true };

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />

      <nav aria-label="현재 위치" className="mb-5 flex items-center gap-1 text-xs text-ink-300">
        <Link href="/" className="hover:text-ink-500">홈</Link>
        <ChevronRight size={12} />
        <Link href="/services" className="hover:text-ink-500">돌봄 서비스</Link>
        <ChevronRight size={12} />
        <span className="text-ink-500">{service.label}</span>
      </nav>

      <span className={`mb-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${service.accent.badge}`}>
        {service.label}
      </span>
      <h1 className="mb-4 text-2xl font-bold leading-snug text-ink-900">{landing.h1}</h1>

      {landing.intro.map((p) => (
        <p key={p.slice(0, 20)} className="mb-3 text-[15px] leading-relaxed text-ink-700">
          {p}
        </p>
      ))}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-ink-900">이런 분께 맞아요</h2>
        <ul className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
          {service.fitFor.map((t) => (
            <li key={t} className="flex gap-2 text-sm leading-relaxed text-ink-700">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-400" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-ink-900">
          {service.action.kind === "guide" ? "어떻게 진행되나요" : "이런 걸 도와드려요"}
        </h2>
        <ul className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
          {service.includes.map((t) => (
            <li key={t} className="flex gap-2 text-sm leading-relaxed text-ink-700">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-mint-500" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-ink-900">이용 절차</h2>
        <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-4 before:h-[calc(100%-2rem)] before:w-px before:bg-ink-100">
          {landing.steps.map((step, i) => (
            <li key={step.title} className="relative flex gap-3">
              <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white shadow-soft">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 rounded-2xl border border-ink-100 bg-white p-3.5">
                <p className="text-sm font-bold text-ink-900">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 rounded-2xl bg-ink-100/40 p-4 text-xs leading-relaxed text-ink-500">
        {service.note}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-ink-900">자주 묻는 질문</h2>
        <div className="space-y-2.5">
          {landing.faq.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-ink-100 bg-white p-4">
              <summary className="cursor-pointer list-none text-sm font-bold text-ink-900">
                Q. {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10 space-y-2">
        {primaryCta.external ? (
          <a
            href={primaryCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 active:translate-y-0 active:scale-[0.98]"
          >
            {primaryCta.label}
            <ArrowRight size={16} />
          </a>
        ) : (
          <Link
            href={primaryCta.href}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 active:translate-y-0 active:scale-[0.98]"
          >
            {primaryCta.label}
            <ArrowRight size={16} />
          </Link>
        )}
        <Link
          href="/services"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-ink-100 bg-white text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
        >
          다른 돌봄 서비스도 비교해 보기
        </Link>
      </div>

      {guides.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-bold text-ink-300">함께 읽으면 좋아요</h2>
          <div className="space-y-2">
            {guides.map((g) => (
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
