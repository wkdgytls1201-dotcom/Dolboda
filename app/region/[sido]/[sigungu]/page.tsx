import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findRegionBySlug } from "@/lib/regionSeo";
import { getSigunguSummary, getTopFacilities, getRegionStats } from "@/lib/regionData";
import { FACILITY_TYPE_SEO } from "@/lib/facilityTypeSeo";
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
import { getSponsorsForSigungu, getBannerForSigungu } from "@/lib/sponsor";
import { SponsorSlots } from "@/components/SponsorSlots";
import { RegionBanner } from "@/components/RegionBanner";

export const revalidate = 86400;

// 빌드 때 182개 시군구 페이지를 미리 생성한다. 동적 렌더(스트리밍)로 두면 검색봇이 읽는
// HTML에서 푸터가 본문보다 먼저 나와(out-of-order streaming) 문서 구조가 이상하게 읽힌다 —
// 사전 생성된 페이지는 header→main→footer 순서의 온전한 HTML로 서빙된다.
export async function generateStaticParams() {
  const { getRegionIndex } = await import("@/lib/regionData");
  const index = await getRegionIndex();
  const seen = new Set<string>();
  const params: { sido: string; sigungu: string }[] = [];
  for (const row of index) {
    const key = `${row.sidoSlug}|${row.sigungu}`;
    if (seen.has(key)) continue;
    seen.add(key);
    params.push({ sido: row.sidoSlug, sigungu: row.sigungu });
  }
  return params;
}

function resolveParams(params: { sido: string; sigungu: string }) {
  const region = findRegionBySlug(decodeURIComponent(params.sido));
  const sigungu = decodeURIComponent(params.sigungu);
  // 주소 토큰에서 온 값만 유효 (시/군/구로 끝나는 한글 지명)
  const valid = /^[가-힣]{1,10}(시|군|구)$/.test(sigungu);
  return { region, sigungu: valid ? sigungu : null };
}

export async function generateMetadata({
  params,
}: {
  params: { sido: string; sigungu: string };
}): Promise<Metadata> {
  const { region, sigungu } = resolveParams(params);
  if (!region || !sigungu) return {};
  const summary = await getSigunguSummary(region, sigungu);
  if (summary.total === 0) return {};

  const title = `${sigungu} 요양병원·요양시설 비교 (${summary.total}곳)`;
  const subNames = summary.subLocalities.slice(0, 10).join(", ");
  const description = `${region.full} ${sigungu} 요양병원, 요양원, 주야간보호, 방문요양 ${summary.total}곳의 평가등급과 비급여 비용을 비교하세요.${
    subNames ? ` ${subNames} 등 ${sigungu} 전 지역의 요양시설 정보를 제공합니다.` : ""
  }`;

  const path = `/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(sigungu)}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: `${SITE_URL}${path}`, type: "website", images: [OG_IMAGE] },
  };
}

export default async function RegionSigunguPage({
  params,
}: {
  params: { sido: string; sigungu: string };
}) {
  const { region, sigungu } = resolveParams(params);
  if (!region || !sigungu) notFound();

  const summary = await getSigunguSummary(region, sigungu);
  const stats = await getRegionStats(region, sigungu);
  const sponsors = await getSponsorsForSigungu(region.slug, sigungu);
  const banner = await getBannerForSigungu(region.slug, sigungu);
  if (summary.total === 0) notFound();

  const topFacilities = await getTopFacilities(region, sigungu, 20);
  const sidoUrl = `${SITE_URL}/region/${encodeURIComponent(region.slug)}`;
  const pageUrl = `${sidoUrl}/${encodeURIComponent(sigungu)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "돌보다", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: `${region.label} 요양시설`, item: sidoUrl },
          { "@type": "ListItem", position: 3, name: `${sigungu} 요양시설`, item: pageUrl },
        ],
      },
      {
        "@type": "ItemList",
        name: `${sigungu} 요양병원·요양시설 목록`,
        itemListElement: topFacilities.map((f, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: f.name,
          url: `${SITE_URL}/facility/${f.id}`,
        })),
      },
      regionFaqJsonLd({ regionName: sigungu, total: summary.total, typeCounts: summary.typeCounts }),
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
        <Link href={`/region/${encodeURIComponent(region.slug)}`} className="inline-block py-2 hover:text-ink-500">
          {region.label} 요양시설
        </Link>
        <span className="mx-1">›</span>
        <span className="text-ink-500">{sigungu} 요양시설</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-ink-900">{sigungu} 요양병원·요양시설 비교</h1>
      <p className="mb-4 text-sm leading-relaxed text-ink-500">
        {region.full} {sigungu}의 요양병원, 요양원, 주야간보호센터, 방문요양센터{" "}
        <strong className="font-bold text-ink-700">{summary.total}곳</strong>의 평가등급과 비급여
        비용, 인력 현황을 비교해볼 수 있어요.
      </p>

      <RegionBanner banner={banner} />

      <div className="mb-4">
        <TypeCountChips typeCounts={summary.typeCounts} />
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold text-ink-900">서비스 종류별로 보기</h2>
        <ul className="flex flex-wrap gap-2">
          {FACILITY_TYPE_SEO.filter((t) => (summary.typeCounts[t.type] ?? 0) > 0).map((t) => (
            <li key={t.slug}>
              <Link
                href={`/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(
                  sigungu
                )}/${encodeURIComponent(t.slug)}`}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-ink-100 bg-white px-3.5 text-xs font-semibold text-ink-700 transition-colors duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {sigungu} {t.short}
                <span className="font-normal text-ink-300">{summary.typeCounts[t.type]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {summary.subLocalities.length > 0 && (
        <p className="mb-6 rounded-xl bg-ink-100/40 p-3.5 text-xs leading-relaxed text-ink-500">
          {sigungu} 내 {summary.subLocalities.join(" · ")} 지역의 요양시설 정보를 확인할 수 있어요.
        </p>
      )}
      <RegionStatStrip stats={stats} total={summary.total} regionName={sigungu} />


      {/* 스폰서(광고)는 일반 목록과 분리된 자리에만 — 아래 목록의 정렬에는 관여하지 않는다 */}
      <SponsorSlots facilities={sponsors} regionLabel={sigungu} />

      <section className="mb-8">
        <h2 className="mb-3 font-bold text-ink-900">{sigungu} 시설 목록 (평가등급순)</h2>
        <FacilityLinkList facilities={topFacilities} />
        <Link
          href={`/search?q=${encodeURIComponent(sigungu)}`}
          className="mt-3 block rounded-xl bg-primary-500 py-3 text-center text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600"
        >
          {sigungu} 시설 전체 검색·비교하기
        </Link>
      </section>

      <GuideLinkStrip />
      <RegionFaq regionName={sigungu} total={summary.total} typeCounts={summary.typeCounts} />
    </main>
  );
}
