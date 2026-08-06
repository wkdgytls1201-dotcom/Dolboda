import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { FACILITY_TYPE_LABEL, type FacilityType } from "@/lib/types";
import { SITE_URL, OG_IMAGE } from "@/lib/siteConfig";
import { findRegionByAddress, sigunguOf } from "@/lib/regionSeo";
import { jsonLdHtml } from "@/lib/jsonLd";
import { missingLongEnough } from "@/lib/facilityPresence";

// generateMetadata와 레이아웃 렌더가 같은 요청 안에서 한 번만 조회하도록 캐시.
const getFacility = cache((id: string) =>
  prisma.facility.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      facilityType: true,
      address: true,
      lat: true,
      lng: true,
      phone: true,
      dataSource: true,
      missingSince: true,
      // 실사진 URL — 구조화 데이터(image)와 공유 카드(OG)에 쓴다.
      // extra 통째로가 아니라 필요한 두 키만 뽑는다(비급여·인력 등 큰 덩어리를 안 싣는다).
      extra: true,
    },
  })
);

/** extra에서 실사진 URL만 꺼낸다(최대 n장). 없으면 빈 배열. */
function photoUrlsOf(extra: unknown, n = 6): string[] {
  const photos = (extra as { photos?: unknown })?.photos;
  return Array.isArray(photos) ? photos.filter((p): p is string => typeof p === "string").slice(0, n) : [];
}

// "서울특별시 강남구 ..." → "서울특별시 강남구" 같은 지역 접두어.
//
// 공단 원본에 시/도가 통째로 빠진 주소가 37건 있다(예: 강진군노인전문요양원의 주소가
// "(강진읍)"뿐이다 — Institution 마스터도 같은 상태라 코드로는 복구할 수 없다).
// 그걸 그대로 쓰면 제목이 "강진군노인전문요양원 — (강진읍) 요양시설 정보"가 되고
// 설명도 "(강진읍) 요양원 ..."이 된다. 지역을 못 알아보면 아예 빼는 편이 낫다.
function regionOf(address: string): string | null {
  const region = findRegionByAddress(address);
  if (!region) return null;
  return address.split(" ").slice(0, 2).join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const facility = await getFacility(params.id);
  if (!facility) return {};

  // 데모 시설은 실재하지 않으니 색인 금지 — 검색결과에 나오면 신뢰 문제가 된다
  if (facility.dataSource === "mock") {
    return { robots: { index: false, follow: false } };
  }

  const typeLabel = FACILITY_TYPE_LABEL[facility.facilityType as FacilityType] ?? "요양시설";
  const region = regionOf(facility.address);
  // 지역을 못 알아본 주소(공단 원본 결손 37건)에서는 지역 부분을 통째로 뺀다
  const title = region
    ? `${facility.name} — ${region} ${typeLabel} 정보`
    : `${facility.name} — ${typeLabel} 정보`;
  const description = `${region ? `${region} ` : ""}${typeLabel} ${facility.name}의 평가등급, 비급여 비용, 인력 현황, 위치와 연락처를 확인하세요. 주소: ${facility.address}`;

  return {
    title,
    description,
    alternates: { canonical: `/facility/${facility.id}` },
    // 공단 파일에서 7일+ 사라진 시설(폐업 추정)은 색인에서 뺀다 — 검색결과에 폐업 시설이
    // 나오면 신뢰 문제. 링크는 따라가게 follow 유지, 데이터·페이지는 보존(lib/facilityPresence.ts)
    ...(missingLongEnough(facility.missingSince) && {
      robots: { index: false, follow: true },
    }),
    openGraph: {
      // 실사진이 있으면 그 시설의 사진을 공유 카드에 쓴다 — 지금까지는 2만 8천 개
      // 상세를 어디에 공유하든 똑같은 로고 카드가 나갔다. 카톡으로 "여기 어때?"를
      // 주고받는 것이 이 서비스의 실제 사용 패턴이라 차이가 크다.
      // 사진이 없는 시설은 기존 OG 이미지로 떨어진다.
      images: [...photoUrlsOf(facility.extra, 1), OG_IMAGE],
      title,
      description,
      url: `${SITE_URL}/facility/${facility.id}`,
      type: "website",
    },
  };
}

export default async function FacilityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const facility = await getFacility(params.id);

  // 지역 검색 노출용 구조화 데이터 — 좌표(geo)와 시/도·시/군/구를 함께 제공한다.
  let jsonLd: object | null = null;
  if (facility) {
    const region = findRegionByAddress(facility.address);
    const sigungu = sigunguOf(facility.address);
    const facilityUrl = `${SITE_URL}/facility/${facility.id}`;

    // 실사진을 구조화 데이터에 싣는다 — 리치 결과·AI 검색이 읽는 가장 좋은 재료인데
    // 그동안 공용 OG 이미지만 들어가고 정작 그 시설의 사진은 빠져 있었다.
    // 지역 페이지의 ItemList에는 이미 넣어 뒀는데(2026-08-06) 상세만 비어 있었다.
    // 6장까지만 — schema.org는 개수 제한이 없지만 JSON-LD가 커지면 HTML이 무거워진다.
    const photoUrls = photoUrlsOf(facility.extra, 6);

    const place = {
      "@type": facility.facilityType === "NURSING_HOSPITAL" ? "Hospital" : "LocalBusiness",
      name: facility.name,
      url: facilityUrl,
      ...(photoUrls.length > 0 && { image: photoUrls }),
      address: {
        "@type": "PostalAddress",
        streetAddress: facility.address,
        ...(region && { addressRegion: region.full }),
        ...(sigungu && { addressLocality: sigungu }),
        addressCountry: "KR",
      },
      ...(facility.phone && { telephone: facility.phone }),
      ...(facility.lat != null &&
        facility.lng != null && {
          geo: {
            "@type": "GeoCoordinates",
            latitude: facility.lat,
            longitude: facility.lng,
          },
        }),
    };

    // 홈 → 시/도 → 시/군/구 → 시설 (지역 랜딩 페이지로 연결되는 크롤 경로)
    const crumbs: { name: string; item: string }[] = [{ name: "돌보다", item: SITE_URL }];
    if (region) {
      const sidoUrl = `${SITE_URL}/region/${encodeURIComponent(region.slug)}`;
      crumbs.push({ name: `${region.label} 요양시설`, item: sidoUrl });
      if (sigungu) {
        crumbs.push({ name: `${sigungu} 요양시설`, item: `${sidoUrl}/${encodeURIComponent(sigungu)}` });
      }
    }
    crumbs.push({ name: facility.name, item: facilityUrl });

    jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        place,
        {
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: c.item,
          })),
        },
      ],
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
      )}
      {/* 폐업 추정 안내 — "확인되지 않음"까지만 말한다(상호 변경·이전일 수도 있어 폐업 단정 금지) */}
      {facility && missingLongEnough(facility.missingSince) && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <p
            role="status"
            className="break-keep rounded-2xl bg-amber-50 px-4 py-3.5 text-sm font-semibold leading-relaxed text-amber-900 ring-1 ring-amber-200"
          >
            이 시설은 최근 국민건강보험공단 공개 자료에서 확인되지 않아요. 폐업했거나 상호·주소가
            바뀌었을 수 있으니, 방문 전에 전화로 확인해 주세요.
          </p>
        </div>
      )}
      {children}
    </>
  );
}
