import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findRegionBySlug } from "@/lib/regionSeo";
import { findTypeSeoBySlug, FACILITY_TYPE_SEO } from "@/lib/facilityTypeSeo";
import { getTypeSummary, getTopFacilities, getRegionStats, getRegionIndex } from "@/lib/regionData";
import {
  FacilityLinkList,
  RegionFaq,
  GuideLinkStrip,
  RegionPagination,
  RegionStatStrip,
  regionFaqJsonLd,
} from "@/components/RegionSeoParts";
import { SITE_URL, OG_IMAGE } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";
import { getSponsorsForSigungu } from "@/lib/sponsor";
import { SponsorSlots } from "@/components/SponsorSlots";

export const revalidate = 86400;

// 시군구 페이지와 같은 이유(스트리밍 시 푸터가 본문보다 먼저 나오는 문제)로 빌드 때 사전 생성
export async function generateStaticParams() {
  const { getRegionIndex } = await import("@/lib/regionData");
  const { findTypeSeoByType } = await import("@/lib/facilityTypeSeo");
  const index = await getRegionIndex();
  const params: { sido: string; sigungu: string; type: string }[] = [];
  for (const row of index) {
    const typeSeo = findTypeSeoByType(row.facilityType);
    if (!typeSeo) continue;
    params.push({ sido: row.sidoSlug, sigungu: row.sigungu, type: typeSeo.slug });
  }
  return params;
}

function resolveParams(params: { sido: string; sigungu: string; type: string }) {
  const region = findRegionBySlug(decodeURIComponent(params.sido));
  const sigungu = decodeURIComponent(params.sigungu);
  const typeSeo = findTypeSeoBySlug(decodeURIComponent(params.type));
  const valid = /^[가-힣]{1,10}(시|군|구)$/.test(sigungu);
  return { region, sigungu: valid ? sigungu : null, typeSeo };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { sido: string; sigungu: string; type: string };
  searchParams?: { page?: string };
}): Promise<Metadata> {
  const { region, sigungu, typeSeo } = resolveParams(params);
  if (!region || !sigungu || !typeSeo) return {};
  const summary = await getTypeSummary(region, sigungu, typeSeo.type);
  if (summary.total === 0) return {};

  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const pageSuffix = page > 1 ? ` (${page}페이지)` : "";
  const title = `${sigungu} ${typeSeo.short} ${summary.total}곳 비교 — ${typeSeo.label} 찾기${pageSuffix}`;
  const subNames = summary.subLocalities.slice(0, 12).join(", ");
  const description = `${region.full} ${sigungu} ${typeSeo.label} ${summary.total}곳의 평가등급과 위치, 연락처를 한눈에 비교하세요. ${typeSeo.keywords
    .slice(0, 3)
    .join(", ")}를 찾는다면 확인해보세요.${subNames ? ` ${subNames} 지역 포함.` : ""}`;

  const path = `/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(
    sigungu
  )}/${encodeURIComponent(typeSeo.slug)}`;

  // getTopFacilities는 cache()로 감싸져 있어 페이지 본문의 같은 호출과 중복되지 않는다.
  const topFacilities = await getTopFacilities(region, sigungu, 12, typeSeo.type);
  const topPhoto = topFacilities.find((f) => f.photo)?.photo;

  return {
    title,
    description,
    // 페이지별 self-canonical — 2페이지를 1페이지로 몰면 뒤쪽 시설이 색인되지 않는다
    alternates: { canonical: page > 1 ? `${path}?page=${page}` : path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      type: "website",
      images: topPhoto ? [topPhoto, OG_IMAGE] : [OG_IMAGE],
    },
  };
}

const PER_PAGE = 24;

export default async function RegionTypePage({
  params,
  searchParams,
}: {
  params: { sido: string; sigungu: string; type: string };
  searchParams?: { page?: string };
}) {
  const { region, sigungu, typeSeo } = resolveParams(params);
  if (!region || !sigungu || !typeSeo) notFound();

  const summary = await getTypeSummary(region, sigungu, typeSeo.type);
  if (summary.total === 0) notFound();

  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const totalPages = Math.max(1, Math.ceil(summary.total / PER_PAGE));
  const facilities = await getTopFacilities(
    region,
    sigungu,
    PER_PAGE,
    typeSeo.type,
    (page - 1) * PER_PAGE
  );
  const stats = await getRegionStats(region, sigungu, typeSeo.type);
  // 스폰서는 유형 페이지에서도 그 시·군·구 계약분을 그대로 보여준다(유형별로 따로 팔지 않는다 —
  // 지역당 3곳 상한을 유형까지 쪼개면 상한의 의미가 없어진다). 해당 유형만 거른다.
  const sponsors = (await getSponsorsForSigungu(region.slug, sigungu)).filter(
    (s) => s.facilityType === typeSeo.type
  );

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
          // 실사진이 있으면 구조화 데이터에도 싣는다 — 리치 결과·AI 검색(GEO)의 재료
          ...(f.photo ? { image: f.photo } : {}),
        })),
      },
      // total은 이 유형의 시설 수다 — typeSeo를 함께 넘겨야 질문도 그 유형으로 나온다.
      // FAQ는 1페이지에만 싣는다 — 2페이지 이후까지 같은 FAQ가 반복되면 페이지마다
      // 내용이 같은 중복 블록이 되어 색인 품질을 깎는다(본문 렌더도 같은 조건).
      ...(page === 1 ? [regionFaqJsonLd({ regionName: sigungu, total: summary.total, typeSeo })] : []),
    ],
  };

  // 같은 시/군/구의 다른 유형으로 이동하는 링크 (내부 링크 강화).
  // 시설이 0곳인 유형은 그 페이지가 notFound()라, 링크를 그대로 뿌리면 크롤러가 404를 만난다
  // (군 지역엔 요양병원·실버타운이 아예 없는 곳이 많다). 이미 캐시된 지역 인덱스로 걸러낸다.
  const index = await getRegionIndex();
  const typesWithFacilities = new Set(
    index
      .filter((r) => r.sidoSlug === region.slug && r.sigungu === sigungu && r.count > 0)
      .map((r) => r.facilityType)
  );
  const otherTypes = FACILITY_TYPE_SEO.filter(
    (t) => t.slug !== typeSeo.slug && typesWithFacilities.has(t.type)
  );

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
          {region.label}
        </Link>
        <span className="mx-1">›</span>
        <Link
          href={`/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(sigungu)}`}
          className="inline-block py-2 hover:text-ink-500"
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

      <RegionStatStrip stats={stats} total={summary.total} regionName={`${sigungu} ${typeSeo.short}`} />

      <SponsorSlots facilities={sponsors} regionLabel={`${sigungu} ${typeSeo.short}`} />

      <section className="mb-8">
        <h2 className="mb-3 font-bold text-ink-900">
          {sigungu} {typeSeo.short} 목록 (평가등급순)
        </h2>
        <FacilityLinkList facilities={facilities} />
        {totalPages > 1 && (
          <p className="mt-2 text-center text-xs text-ink-300">
            전체 {summary.total}곳 중 {(page - 1) * PER_PAGE + 1}~
            {Math.min(page * PER_PAGE, summary.total)}번째 · {page}/{totalPages} 페이지
          </p>
        )}
        <RegionPagination
          basePath={`/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(
            sigungu
          )}/${encodeURIComponent(typeSeo.slug)}`}
          page={page}
          totalPages={totalPages}
        />
        <Link
          href={`/search?q=${encodeURIComponent(sigungu)}&type=${typeSeo.type}`}
          className="mt-3 block rounded-xl bg-primary-500 py-3 text-center text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600"
        >
          {sigungu} {typeSeo.short} 전체 보기
        </Link>
      </section>

      {otherTypes.length > 0 && (
      <section className="mb-8">
        <h2 className="mb-3 font-bold text-ink-900">{sigungu}의 다른 돌봄 서비스</h2>
        <ul className="flex flex-wrap gap-2">
          {otherTypes.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/region/${encodeURIComponent(region.slug)}/${encodeURIComponent(
                  sigungu
                )}/${encodeURIComponent(t.slug)}`}
                className="inline-flex min-h-[44px] items-center rounded-full border border-ink-100 bg-white px-3.5 text-xs font-semibold text-ink-700 transition-colors duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {sigungu} {t.short}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      )}

      {/* 전국 허브로 올려보내는 링크 — 지역 페이지가 수천 개라 여기서 모이는 신호가 크다.
          보호자에게도 "이 동네 말고 전체는 어떤가"를 볼 통로가 된다. */}
      <Link
        href={`/${encodeURIComponent(typeSeo.slug)}`}
        className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
      >
        전국 {typeSeo.label} 현황 한눈에 보기
        <span aria-hidden className="shrink-0 text-ink-300">
          ›
        </span>
      </Link>

      {page === 1 && <RegionFaq regionName={sigungu} total={summary.total} typeSeo={typeSeo} />}
      {/* 지역+유형 897페이지 중 이 자리엔 GuideLinkStrip이 아예 없었다(2026-08-07 감사) —
          2페이지 이후는 FAQ와 같은 이유로 생략(중복 억제). */}
      {page === 1 && <GuideLinkStrip facilityType={typeSeo.type} />}
    </main>
  );
}
