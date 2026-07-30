import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { REGION_SEO, type RegionSeo, sigunguOf, subLocalityOf } from "@/lib/regionSeo";
import type { FacilityType } from "@/lib/types";

function prefixWhere(region: RegionSeo) {
  return { OR: region.prefixes.map((p) => ({ address: { startsWith: p } })) };
}

// 시설이 1곳 이상 있는 지역 목록 — 푸터·sitemap에서 사용.
// 요청마다 DB를 때리지 않게 하루 단위 서버 캐시.
export const getActiveRegions = unstable_cache(
  async (): Promise<{ slug: string; label: string; count: number }[]> => {
    const rows = await prisma.$queryRaw<{ sido: string; count: bigint }[]>`
      SELECT split_part(address, ' ', 1) AS sido, COUNT(*) AS count
      FROM "Facility" GROUP BY 1
    `;
    const counts = new Map<string, number>();
    for (const row of rows) {
      const region = REGION_SEO.find((r) => r.prefixes.some((p) => row.sido.startsWith(p)));
      if (region) counts.set(region.slug, (counts.get(region.slug) ?? 0) + Number(row.count));
    }
    return REGION_SEO.filter((r) => (counts.get(r.slug) ?? 0) > 0).map((r) => ({
      slug: r.slug,
      label: r.label,
      count: counts.get(r.slug)!,
    }));
  },
  ["active-regions"],
  { revalidate: 86400 }
);

export interface RegionSummary {
  total: number;
  typeCounts: Partial<Record<FacilityType, number>>;
  // 시/군/구별 시설 수 (내림차순)
  sigunguList: { name: string; count: number }[];
}

// 시/도 단위 요약 — 지역 랜딩 페이지와 sitemap이 공유. ISR(하루)로 재생성.
export const getRegionSummary = cache(async (region: RegionSeo): Promise<RegionSummary> => {
  const rows = await prisma.facility.findMany({
    where: prefixWhere(region),
    select: { facilityType: true, address: true },
  });

  const typeCounts: Partial<Record<FacilityType, number>> = {};
  const sigunguCounts = new Map<string, number>();
  for (const row of rows) {
    const t = row.facilityType as FacilityType;
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    const sg = sigunguOf(row.address);
    if (sg) sigunguCounts.set(sg, (sigunguCounts.get(sg) ?? 0) + 1);
  }

  return {
    total: rows.length,
    typeCounts,
    sigunguList: [...sigunguCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
});

export interface SigunguSummary {
  total: number;
  typeCounts: Partial<Record<FacilityType, number>>;
  // 이 시/군/구 안의 읍/면/동 지명 (가나다순)
  subLocalities: string[];
}

export const getSigunguSummary = cache(
  async (region: RegionSeo, sigungu: string): Promise<SigunguSummary> => {
    const rows = await prisma.facility.findMany({
      where: { AND: [prefixWhere(region), { address: { contains: ` ${sigungu} ` } }] },
      select: { facilityType: true, address: true },
    });

    const typeCounts: Partial<Record<FacilityType, number>> = {};
    const subs = new Set<string>();
    for (const row of rows) {
      const t = row.facilityType as FacilityType;
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
      const sub = subLocalityOf(row.address);
      if (sub) subs.add(sub);
    }

    return {
      total: rows.length,
      typeCounts,
      subLocalities: [...subs].sort((a, b) => a.localeCompare(b, "ko")),
    };
  }
);

// 등급 좋은 순 대표 시설 — sigungu를 주면 그 시/군/구로 좁힌다.
export const getTopFacilities = cache(
  async (region: RegionSeo, sigungu: string | null, take: number) => {
    return prisma.facility.findMany({
      where: sigungu
        ? { AND: [prefixWhere(region), { address: { contains: ` ${sigungu} ` } }] }
        : prefixWhere(region),
      orderBy: [{ grade: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      take,
      select: {
        id: true,
        name: true,
        facilityType: true,
        grade: true,
        address: true,
      },
    });
  }
);
