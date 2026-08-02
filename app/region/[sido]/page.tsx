import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { REGION_SEO, findRegionBySlug } from "@/lib/regionSeo";
import { getRegionSummary, getTopFacilities, getRegionStats } from "@/lib/regionData";
import {
  TypeCountChips,
  FacilityLinkList,
  RegionFaq,
  RegionStatStrip,
  GuideLinkStrip,
  regionFaqJsonLd,
} from "@/components/RegionSeoParts";
import { SITE_URL, OG_IMAGE } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

// 지역별 시설 수는 자주 안 바뀌므로 하루 단위로 재생성(ISR)
export const revalidate = 86400;

export function generateStaticParams() {
  return REGION_SEO.map((r) => ({ sido: r.slug }));
}

function resolveRegion(sidoParam: string) {
  return findRegionBySlug(decodeURIComponent(sidoParam));
}

export async function generateMetadata({
  params,
}: {
  params: { sido: string };
}): Promise<Metadata> {
  const region = resolveRegion(params.sido);
  if (!region) return {};
  const summary = await getRegionSummary(region);
  if (summary.total === 0) return {};

  const title = `${region.label} 요양병원·요양시설 찾기·비교 (${summary.total}곳)`;
  const description = `${region.full} 요양병원, 요양원, 주야간보호센터, 방문요양센터 ${summary.total}곳의 평가등급·비급여 비용·인력 현황을 한눈에 비교하세요. ${summary.sigunguList
    .slice(0, 8)
    .map((s) => s.name)
    .join(", ")} 등 시·군·구별 요양시설 정보를 제공합니다.`;

  return {
    title,
    description,
    alternates: { canonical: `/region/${encodeURIComponent(region.slug)}` },
    openGraph: {
      images: [OG_IMAGE],
      title,
      description,
      url: `${SITE_URL}/region/${encodeURIComponent(region.slug)}`,
      type: "website",
    },
  };
}

export default async function RegionSidoPage({ params }: { params: { sido: string } }) {
  const region = resolveRegion(params.sido);
  if (!region) notFound();

  const summary = await getRegionSummary(region);
  const stats = await getRegionStats(region, null);
  if (summary.total === 0) notFound();

  const topFacilities = await getTopFacilities(region, null, 12);
  const regionUrl = `${SITE_URL}/region/${encodeURIComponent(region.slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "돌보다", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: `${region.label} 요양시설`, item: regionUrl },
        ],
      },
      {
        "@type": "ItemList",
        name: `${region.label} 요양병원·요양시설 추천 목록`,
        itemListElement: topFacilities.map((f, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: f.name,
          url: `${SITE_URL}/facility/${f.id}`,
        })),
      },
      regionFaqJsonLd({ regionName: region.label, total: summary.total, typeCounts: summary.typeCounts }),
    ],
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />

      <nav aria-label="현재 위치" className="mb-3 text-xs text-ink-300">
        <Link href="/" className="inline-block py-2 hover:text-ink-500">
          홈
        </Link>
        <span className="mx-1">›</span>
        <span className="text-ink-500">{region.label} 요양시설</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-ink-900">
        {region.label} 요양병원·요양시설 찾기
      </h1>
      <p className="mb-4 text-sm leading-relaxed text-ink-500">
        {region.full}의 요양병원, 요양원, 주야간보호센터, 방문요양센터{" "}
        <strong className="font-bold text-ink-700">{summary.total}곳</strong>을 평가등급과 비급여
        비용, 인력 현황까지 비교해볼 수 있어요. 시·군·구를 선택하면 동네 단위로 더 좁혀서 확인할
        수 있어요.
      </p>

      <div className="mb-6">
        <TypeCountChips typeCounts={summary.typeCounts} />
      </div>

      <RegionStatStrip stats={stats} total={summary.total} regionName={region.label} />

      {summary.sigunguList.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-bold text-ink-900">시·군·구별 요양시설</h2>
          <ul className="flex flex-wrap gap-2">
            {summary.sigunguList.map((s) => (
              <li key={s.name}>
                <Link
                  href={`/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(s.name)}`}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-ink-100 bg-white px-3.5 text-xs font-semibold text-ink-700 transition-colors duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                >
                  {s.name}
                  <span className="font-normal text-ink-300">{s.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-bold text-ink-900">{region.label} 평가등급 우수 시설</h2>
        <FacilityLinkList facilities={topFacilities} />
        <Link
          href={`/search?q=${encodeURIComponent(region.label)}`}
          className="mt-3 block rounded-xl bg-primary-500 py-3 text-center text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600"
        >
          {region.label} 시설 전체 검색·비교하기
        </Link>
      </section>

      <GuideLinkStrip />
      <RegionFaq regionName={region.label} total={summary.total} typeCounts={summary.typeCounts} />
    </main>
  );
}
