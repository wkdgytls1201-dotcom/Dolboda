import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findRegionBySlug } from "@/lib/regionSeo";
import { findTypeSeoBySlug, FACILITY_TYPE_SEO } from "@/lib/facilityTypeSeo";
import { getTypeSummary, getTopFacilities } from "@/lib/regionData";
import { FacilityLinkList, RegionFaq, regionFaqJsonLd } from "@/components/RegionSeoParts";
import { SITE_URL } from "@/lib/siteConfig";

export const revalidate = 86400;

function resolveParams(params: { sido: string; sigungu: string; type: string }) {
  const region = findRegionBySlug(decodeURIComponent(params.sido));
  const sigungu = decodeURIComponent(params.sigungu);
  const typeSeo = findTypeSeoBySlug(decodeURIComponent(params.type));
  const valid = /^[가-힣]{1,10}(시|군|구)$/.test(sigungu);
  return { region, sigungu: valid ? sigungu : null, typeSeo };
}

export async function generateMetadata({
  params,
}: {
  params: { sido: string; sigungu: string; type: string };
}): Promise<Metadata> {
  const { region, sigungu, typeSeo } = resolveParams(params);
  if (!region || !sigungu || !typeSeo) return {};
  const summary = await getTypeSummary(region, sigungu, typeSeo.type);
  if (summary.total === 0) return {};

  const title = `${sigungu} ${typeSeo.short} ${summary.total}곳 비교 — ${typeSeo.label} 찾기`;
  const subNames = summary.subLocalities.slice(0, 12).join(", ");
  const description = `${region.full} ${sigungu} ${typeSeo.label} ${summary.total}곳의 평가등급과 위치, 연락처를 한눈에 비교하세요. ${typeSeo.keywords
    .slice(0, 3)
    .join(", ")}를 찾는다면 확인해보세요.${subNames ? ` ${subNames} 지역 포함.` : ""}`;

  const path = `/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(
    sigungu
  )}/${encodeURIComponent(typeSeo.slug)}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: `${SITE_URL}${path}`, type: "website" },
  };
}

export default async function RegionTypePage({
  params,
}: {
  params: { sido: string; sigungu: string; type: string };
}) {
  const { region, sigungu, typeSeo } = resolveParams(params);
  if (!region || !sigungu || !typeSeo) notFound();

  const summary = await getTypeSummary(region, sigungu, typeSeo.type);
  if (summary.total === 0) notFound();

  const facilities = await getTopFacilities(region, sigungu, 24, typeSeo.type);

  const sidoUrl = `${SITE_URL}/region/${encodeURIComponent(region.slug)}`;
  const sigunguUrl = `${sidoUrl}/${encodeURIComponent(sigungu)}`;
  const pageUrl = `${sigunguUrl}/${encodeURIComponent(typeSeo.slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "돌보다", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: `${region.label} 요양시설`, item: sidoUrl },
          { "@type": "ListItem", position: 3, name: `${sigungu} 요양시설`, item: sigunguUrl },
          {
            "@type": "ListItem",
            position: 4,
            name: `${sigungu} ${typeSeo.short}`,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${sigungu} ${typeSeo.label} 목록`,
        numberOfItems: summary.total,
        itemListElement: facilities.map((f, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: f.name,
          url: `${SITE_URL}/facility/${f.id}`,
        })),
      },
      regionFaqJsonLd(),
    ],
  };

  // 같은 시/군/구의 다른 유형으로 이동하는 링크 (내부 링크 강화)
  const otherTypes = FACILITY_TYPE_SEO.filter((t) => t.slug !== typeSeo.slug);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="현재 위치" className="mb-3 text-xs text-ink-300">
        <Link href="/" className="hover:text-ink-500">
          홈
        </Link>
        <span className="mx-1">›</span>
        <Link href={`/region/${encodeURIComponent(region.slug)}`} className="hover:text-ink-500">
          {region.label}
        </Link>
        <span className="mx-1">›</span>
        <Link
          href={`/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(sigungu)}`}
          className="hover:text-ink-500"
        >
          {sigungu}
        </Link>
        <span className="mx-1">›</span>
        <span className="text-ink-500">{typeSeo.short}</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-ink-900">
        {sigungu} {typeSeo.label} 찾기·비교
      </h1>
      <p className="mb-3 text-sm leading-relaxed text-ink-500">
        {region.full} {sigungu}의 {typeSeo.label}{" "}
        <strong className="font-bold text-ink-700">{summary.total}곳</strong>을 평가등급·위치·연락처와
        함께 비교해보세요.
      </p>
      <p className="mb-4 rounded-xl bg-ivory-100 p-3.5 text-xs leading-relaxed text-ink-500">
        {typeSeo.intro}
      </p>

      {summary.subLocalities.length > 0 && (
        <p className="mb-6 text-xs leading-relaxed text-ink-300">
          {sigungu} {summary.subLocalities.join(" · ")} 지역의 {typeSeo.short} 정보를 확인할 수
          있어요.
        </p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-bold text-ink-900">
          {sigungu} {typeSeo.short} 목록 (평가등급순)
        </h2>
        <FacilityLinkList facilities={facilities} />
        {summary.total > facilities.length && (
          <p className="mt-2 text-center text-xs text-ink-300">
            {summary.total}곳 중 {facilities.length}곳 표시
          </p>
        )}
        <Link
          href={`/search?q=${encodeURIComponent(sigungu)}&type=${typeSeo.type}`}
          className="mt-3 block rounded-xl bg-primary-500 py-3 text-center text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600"
        >
          {sigungu} {typeSeo.short} 전체 보기
        </Link>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-bold text-ink-900">{sigungu}의 다른 돌봄 서비스</h2>
        <ul className="flex flex-wrap gap-2">
          {otherTypes.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(
                  sigungu
                )}/${encodeURIComponent(t.slug)}`}
                className="inline-block rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {sigungu} {t.short}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <RegionFaq />
    </main>
  );
}
