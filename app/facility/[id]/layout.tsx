import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { FACILITY_TYPE_LABEL, type FacilityType } from "@/lib/types";
import { SITE_URL } from "@/lib/siteConfig";

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
    },
  })
);

// "서울특별시 강남구 ..." → "서울특별시 강남구" 같은 지역 접두어
function regionOf(address: string) {
  return address.split(" ").slice(0, 2).join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const facility = await getFacility(params.id);
  if (!facility) return {};

  const typeLabel = FACILITY_TYPE_LABEL[facility.facilityType as FacilityType] ?? "요양시설";
  const region = regionOf(facility.address);
  const title = `${facility.name} — ${region} ${typeLabel} 정보`;
  const description = `${region} ${typeLabel} ${facility.name}의 평가등급, 비급여 비용, 인력 현황, 위치와 연락처를 확인하세요. 주소: ${facility.address}`;

  return {
    title,
    description,
    alternates: { canonical: `/facility/${facility.id}` },
    openGraph: {
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

  // 지역 검색 노출용 구조화 데이터 — 좌표(geo)가 있으면 함께 제공한다.
  const jsonLd = facility
    ? {
        "@context": "https://schema.org",
        "@type": facility.facilityType === "NURSING_HOSPITAL" ? "Hospital" : "LocalBusiness",
        name: facility.name,
        url: `${SITE_URL}/facility/${facility.id}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: facility.address,
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
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
