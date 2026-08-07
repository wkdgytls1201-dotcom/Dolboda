import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { FACILITY_TYPE_SEO, findTypeSeoBySlug, type FacilityTypeSeo } from "@/lib/facilityTypeSeo";
import {
  getNationwideTypeSummary,
  getNationwideTypeStats,
  getRegionIndex,
  getTopFacilities,
} from "@/lib/regionData";
import { RegionFaq, regionFaqJsonLd, GuideLinkStrip } from "@/components/RegionSeoParts";
import { NHIS_GRADE_LETTER } from "@/components/GradeBadge";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "@/lib/siteConfig";
import { withParticle } from "@/lib/korean";
import { jsonLdHtml } from "@/lib/jsonLd";

// 전국 시설유형 허브 — /요양원 · /요양병원 · /주야간보호 · /방문요양 · /실버타운
//
// 그동안 "전국 요양원 찾아보기"는 /search?type=NURSING_HOME으로 갔는데, 그 주소는
// noindex라(검색 조건 조합이 무한해서) 상위 검색어를 담을 페이지가 아예 없었다.
// 여기가 "요양원 찾기"·"전국 요양원" 같은 상위 검색어를 받아, 이미 잘 만들어둔
// 지역+유형 페이지(/region/경남/김해시/요양원)로 검색 권한을 흘려보내는 자리다.
//
// URL은 한글을 쓴다 — 지역 페이지가 이미 /region/경남/김해시/요양원이라 표기를 맞췄다.
//
// ⚠️ 루트의 동적 세그먼트라 이론상 모든 미매칭 경로가 여기로 온다.
// dynamicParams = false로 아래 목록에 없는 값은 전부 404가 되게 막아둔다.
export const revalidate = 86400;
// dynamicParams = false는 쓰지 않는다. 한글 slug(요양원)는 generateStaticParams가 내는 값과
// 실제 요청 경로(%EC%9A%94...)의 표기가 달라 그 조합에서 다섯 페이지 전부 404가 났다(실측).
// 대신 아래 resolve()가 목록에 없는 값을 notFound()로 떨어뜨린다 —
// 지역 페이지가 이미 쓰는 방식이고, DB를 치기 전에 걸러서 비용도 들지 않는다.

export async function generateStaticParams() {
  // 시설이 한 곳도 없는 유형(현재 실버타운)은 페이지를 만들지 않는다 —
  // 내용이 텅 빈 페이지가 색인되면 사이트 전체 품질 평가에 오히려 손해다.
  const index = await getRegionIndex();
  const present = new Set(index.filter((r) => r.count > 0).map((r) => r.facilityType));
  return FACILITY_TYPE_SEO.filter((t) => present.has(t.type)).map((t) => ({ typeSlug: t.slug }));
}

function resolve(typeSlug: string): FacilityTypeSeo | undefined {
  return findTypeSeoBySlug(decodeURIComponent(typeSlug));
}

export async function generateMetadata({
  params,
}: {
  params: { typeSlug: string };
}): Promise<Metadata> {
  const typeSeo = resolve(params.typeSlug);
  if (!typeSeo) return {};
  // 대표 숫자는 DB 실집계를 쓴다 — 지역 인덱스 합계는 주소 파싱에서 빠지는 시설이 있어
  // 사이트의 다른 화면에 나오는 숫자와 어긋난다(regionData.ts 주석 참고)
  const { total } = await getNationwideTypeStats(typeSeo.type);
  if (total === 0) return {};

  const title = `전국 ${typeSeo.short} ${total.toLocaleString()}곳 찾기·비교`;
  const description = `국민건강보험공단·건강보험심사평가원 공공데이터로 전국 ${
    typeSeo.label
  } ${total.toLocaleString()}곳의 평가등급과 현황을 지역별로 비교하세요. ${typeSeo.keywords
    .slice(0, 3)
    .join(", ")}를 찾는다면 여기서 시작하세요.`;
  const path = `/${encodeURIComponent(typeSeo.slug)}`;

  // 지역 무관 전국 대표 12곳 중 실사진 있는 첫 곳 — 지역 페이지 3계층과 같은 방식
  // (region/[sido] 등, 2026-08-07). 이 페이지는 지역이 없어 region에 null을 넘긴다.
  const topFacilities = await getTopFacilities(null, null, 12, typeSeo.type);
  const topPhoto = topFacilities.find((f) => f.photo)?.photo;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      type: "website",
      images: topPhoto ? [topPhoto, OG_IMAGE] : [OG_IMAGE],
    },
  };
}

// 시/군/구 링크는 너무 많으면 페이지가 링크 덤프처럼 보인다 — 상위만 노출하고
// 나머지는 시/도 페이지가 이어받는다.
const TOP_SIGUNGU = 30;

export default async function FacilityTypeHubPage({ params }: { params: { typeSlug: string } }) {
  const typeSeo = resolve(params.typeSlug);
  if (!typeSeo) notFound();

  const stats = await getNationwideTypeStats(typeSeo.type);
  if (stats.total === 0) notFound();
  const summary = await getNationwideTypeSummary(typeSeo.type);
  const total = stats.total;

  // 시설이 0곳인 유형은 페이지가 아예 없다(generateStaticParams에서 뺐다).
  // 그런 유형까지 "다른 돌봄 서비스"에 링크하면 크롤러가 404를 만난다 —
  // 지역+유형 페이지에서 이미 한 번 겪은 함정이라 여기서도 같은 기준으로 거른다.
  const index = await getRegionIndex();
  const present = new Set(index.filter((r) => r.count > 0).map((r) => r.facilityType));
  const otherTypes = FACILITY_TYPE_SEO.filter(
    (t) => t.slug !== typeSeo.slug && present.has(t.type)
  );

  const path = `/${encodeURIComponent(typeSeo.slug)}`;
  const pageUrl = `${SITE_URL}${path}`;
  // 요양병원만 심평원(HIRA) 1~5등급이고, 나머지는 공단(NHIS) A~E등급이다
  const isHira = typeSeo.type === "NURSING_HOSPITAL";
  const gradeLabel = (grade: number) =>
    isHira ? `${grade}등급` : `${NHIS_GRADE_LETTER[grade - 1] ?? grade}등급`;
  const gradeAuthority = isHira ? "건강보험심사평가원" : "국민건강보험공단";

  const statItems: { label: string; value: string }[] = [
    { label: `전국 ${typeSeo.short}`, value: `${total.toLocaleString()}곳` },
  ];
  if (stats.graded > 0) {
    statItems.push({ label: "평가등급 공개", value: `${stats.graded.toLocaleString()}곳` });
    statItems.push({
      label: `최고등급(${gradeLabel(1)})`,
      value: `${stats.topGrade.toLocaleString()}곳`,
    });
  }
  if (stats.vacancy > 0)
    statItems.push({ label: "입소 가능", value: `${stats.vacancy.toLocaleString()}곳` });
  if (stats.avgCapacity)
    statItems.push({ label: "평균 정원", value: `${stats.avgCapacity}명` });

  const gradeMax = Math.max(...stats.gradeCounts.map((g) => g.count), 1);
  const faqCtx = { regionName: "전국", total, typeSeo };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: `전국 ${typeSeo.short}`, item: pageUrl },
        ],
      },
      {
        "@type": "CollectionPage",
        name: `전국 ${typeSeo.label} 찾기·비교`,
        url: pageUrl,
        description: typeSeo.intro,
        inLanguage: "ko",
      },
      regionFaqJsonLd(faqCtx),
    ],
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      <nav aria-label="현재 위치" className="mb-3 text-xs text-ink-300">
        <Link href="/" className="inline-block py-2 hover:text-ink-500">
          홈
        </Link>
        <span className="mx-1">›</span>
        <span className="text-ink-500">전국 {typeSeo.short}</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-ink-900">전국 {typeSeo.label} 찾기·비교</h1>
      <p className="mb-3 text-sm leading-relaxed text-ink-500">
        국민건강보험공단·건강보험심사평가원이 공개한 자료를 모아 전국 {typeSeo.label}{" "}
        <strong className="font-bold text-ink-700">{total.toLocaleString()}곳</strong>의 평가등급과
        현황을 한자리에서 비교할 수 있어요.
      </p>
      <p className="mb-6 rounded-xl bg-ivory-100 p-3.5 text-xs leading-relaxed text-ink-500">
        {typeSeo.intro}
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-ink-900">전국 {typeSeo.short} 현황</h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {statItems.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-3.5 text-center shadow-card">
              <dt className="text-[11px] leading-tight text-ink-300">{item.label}</dt>
              <dd className="mt-1 text-lg font-extrabold text-ink-900">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[11px] text-ink-300">
          공공데이터 기준이며, 입소 가능 여부는 실제와 다를 수 있어 시설에 확인이 필요해요.
        </p>
      </section>

      {stats.graded > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-bold text-ink-900">평가등급별 현황</h2>
          <dl className="space-y-1.5 rounded-2xl bg-white p-4 shadow-card">
            {stats.gradeCounts.map((g) => (
              <div key={g.grade} className="flex items-center gap-3">
                <dt className="w-14 shrink-0 text-xs font-semibold text-ink-700">
                  {gradeLabel(g.grade)}
                </dt>
                <dd className="flex min-w-0 flex-1 items-center gap-2">
                  {/* 막대는 자기 폭을 가진 래퍼 안에서 비율을 잡는다 —
                      dd에 바로 %를 주면 옆의 숫자까지 포함한 폭을 기준으로 잡혀 넘친다 */}
                  <span aria-hidden className="min-w-0 flex-1">
                    <span
                      className="block h-2 rounded-full bg-primary-300"
                      style={{ width: `${Math.round((g.count / gradeMax) * 100)}%` }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-ink-500">
                    {g.count.toLocaleString()}곳
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
            {gradeAuthority}이 정기적으로 매기는 공식 평가등급이에요. 평가를 받지 않았거나 결과가
            아직 공개되지 않은 시설은 집계에서 빠집니다.
          </p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-ink-900">시·도별 {typeSeo.short}</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {summary.bySido.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/region/${encodeURIComponent(s.slug)}`}
                className="flex min-h-[52px] items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white px-3.5 text-sm transition-colors duration-150 hover:border-primary-200 hover:bg-primary-50"
              >
                <span className="truncate font-semibold text-ink-700">{s.label}</span>
                <span className="shrink-0 text-xs font-bold text-primary-600">
                  {s.count.toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {/* 시/도별 합계가 위의 전체 수보다 조금 적을 수 있다 — 주소에 시/군/구가 표기되지
            않아 지역으로 분류하지 못한 시설이 전국에 100여 곳 있다. 숨기지 않고 밝힌다. */}
        <p className="mt-2 text-[11px] text-ink-300">
          주소에 시·군·구가 표기되지 않은 일부 시설은 지역 분류에서 빠져, 시·도별 합계가 위의
          전체 수보다 조금 적을 수 있어요.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-ink-900">
          {withParticle(typeSeo.short, "이", "가")} 많은 지역 바로가기
        </h2>
        <ul className="flex flex-wrap gap-2">
          {summary.topSigungu.slice(0, TOP_SIGUNGU).map((s) => (
            <li key={`${s.sidoSlug}-${s.sigungu}`}>
              <Link
                href={`/region/${encodeURIComponent(s.sidoSlug)}/${encodeURIComponent(
                  s.sigungu
                )}/${encodeURIComponent(typeSeo.slug)}`}
                className="inline-flex min-h-[44px] items-center rounded-full border border-ink-100 bg-white px-3.5 text-xs font-semibold text-ink-700 transition-colors duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {s.sidoLabel} {s.sigungu} {s.count.toLocaleString()}곳
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={`/search?type=${typeSeo.type}`}
          className="mt-4 flex min-h-[52px] items-center justify-center rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600"
        >
          지도·필터로 {typeSeo.short} 찾아보기
        </Link>
      </section>

      {otherTypes.length > 0 && (
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-ink-900">다른 돌봄 서비스도 비교해보세요</h2>
        <ul className="space-y-2">
          {otherTypes.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/${encodeURIComponent(t.slug)}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
              >
                전국 {t.label}
                <ChevronRight size={16} className="shrink-0 text-ink-300" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      )}

      <RegionFaq {...faqCtx} />
      <GuideLinkStrip facilityType={typeSeo.type} />
    </main>
  );
}
