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

// 시/도 단위 요약 — 지역 랜딩 페이지와 sitemap이 공유.
// 예전엔 시/도별로 수천 행을 통째로 읽어 JS에서 셌는데(서울 5,000행+), 이미 하루 캐시된
// getRegionIndex가 (시도·시군구·유형)별 개수를 모두 갖고 있어 DB를 다시 칠 이유가 없다.
export const getRegionSummary = cache(async (region: RegionSeo): Promise<RegionSummary> => {
  const index = await getRegionIndex();
  const rows = index.filter((r) => r.sidoSlug === region.slug);

  const typeCounts: Partial<Record<FacilityType, number>> = {};
  const sigunguCounts = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    typeCounts[row.facilityType] = (typeCounts[row.facilityType] ?? 0) + row.count;
    sigunguCounts.set(row.sigungu, (sigunguCounts.get(row.sigungu) ?? 0) + row.count);
    total += row.count;
  }

  return {
    total,
    typeCounts,
    sigunguList: [...sigunguCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
});

export interface RegionIndexRow {
  sidoSlug: string;
  sigungu: string;
  facilityType: FacilityType;
  count: number;
}

/**
 * (시/도, 시/군/구, 시설유형)별 시설 수 — 한 번의 집계 쿼리로 전체를 가져온다.
 * sitemap이 지역·유형 페이지 수천 개를 만들 때 쿼리를 반복하지 않기 위한 인덱스.
 */
export const getRegionIndex = unstable_cache(
  async (): Promise<RegionIndexRow[]> => {
    const rows = await prisma.$queryRaw<
      { sido: string; sigungu: string; facility_type: string; count: bigint }[]
    >`
      SELECT split_part(address, ' ', 1) AS sido,
             split_part(address, ' ', 2) AS sigungu,
             "facilityType"::text AS facility_type,
             COUNT(*) AS count
      FROM "Facility"
      GROUP BY 1, 2, 3
    `;

    const out: RegionIndexRow[] = [];
    for (const row of rows) {
      if (!/^[가-힣]{1,10}(시|군|구)$/.test(row.sigungu)) continue;
      const region = REGION_SEO.find((r) => r.prefixes.some((p) => row.sido.startsWith(p)));
      if (!region) continue;
      out.push({
        sidoSlug: region.slug,
        sigungu: row.sigungu,
        facilityType: row.facility_type as FacilityType,
        count: Number(row.count),
      });
    }
    return out;
  },
  ["region-index"],
  { revalidate: 86400 }
);

export interface SigunguSummary {
  total: number;
  typeCounts: Partial<Record<FacilityType, number>>;
  // 이 시/군/구 안의 읍/면/동 지명 (가나다순)
  subLocalities: string[];
}

export const getSigunguSummary = cache(
  async (region: RegionSeo, sigungu: string): Promise<SigunguSummary> => {
    // 개수는 캐시된 인덱스에서, 읍면동 목록만 주소 컬럼으로 좁혀 조회한다
    const index = await getRegionIndex();
    const typeCounts: Partial<Record<FacilityType, number>> = {};
    let total = 0;
    for (const row of index) {
      if (row.sidoSlug !== region.slug || row.sigungu !== sigungu) continue;
      typeCounts[row.facilityType] = (typeCounts[row.facilityType] ?? 0) + row.count;
      total += row.count;
    }

    const rows = await prisma.facility.findMany({
      where: { AND: [prefixWhere(region), { address: { contains: ` ${sigungu} ` } }] },
      select: { address: true },
    });
    const subs = new Set<string>();
    for (const row of rows) {
      const sub = subLocalityOf(row.address);
      if (sub) subs.add(sub);
    }

    return {
      total,
      typeCounts,
      subLocalities: [...subs].sort((a, b) => a.localeCompare(b, "ko")),
    };
  }
);

// 지역+유형 조합(예: 김해시 방문요양) 요약
export const getTypeSummary = cache(
  async (
    region: RegionSeo,
    sigungu: string,
    facilityType: FacilityType
  ): Promise<{ total: number; subLocalities: string[] }> => {
    const rows = await prisma.facility.findMany({
      where: {
        AND: [prefixWhere(region), { address: { contains: ` ${sigungu} ` } }, { facilityType }],
      },
      select: { address: true },
    });
    const subs = new Set<string>();
    for (const row of rows) {
      const sub = subLocalityOf(row.address);
      if (sub) subs.add(sub);
    }
    return {
      total: rows.length,
      subLocalities: [...subs].sort((a, b) => a.localeCompare(b, "ko")),
    };
  }
);

// 등급 좋은 순 대표 시설 — sigungu/facilityType을 주면 그만큼 좁힌다.
// skip을 주면 페이지네이션(2페이지 이후)에 쓴다.
export const getTopFacilities = cache(
  async (
    region: RegionSeo,
    sigungu: string | null,
    take: number,
    facilityType?: FacilityType,
    skip = 0
  ) => {
    const conditions: object[] = [prefixWhere(region)];
    if (sigungu) conditions.push({ address: { contains: ` ${sigungu} ` } });
    if (facilityType) conditions.push({ facilityType });
    return prisma.facility.findMany({
      where: { AND: conditions },
      orderBy: [{ grade: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      take,
      skip,
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

export interface RegionStats {
  /** 평가등급 1등급(A등급) 시설 수 */
  topGrade: number;
  /** 평가등급이 공개된 시설 수 */
  graded: number;
  /** 입소 가능(정원 > 현원) 시설 수 — 입소형만 집계 */
  vacancy: number;
  /** 입소형 시설의 평균 정원 (없으면 null) */
  avgCapacity: number | null;
}

// 지역 페이지에 넣을 고유 통계. 지역마다 다른 숫자가 나와야 페이지가 서로 구별된다.
// 행을 전부 읽어 JS에서 세면 extra(jsonb) 전체가 딸려와 무거우므로 DB에서 집계만 받아온다.
export const getRegionStats = cache(
  async (
    region: RegionSeo,
    sigungu: string | null,
    facilityType?: FacilityType
  ): Promise<RegionStats> => {
    const prefixes = region.prefixes;
    const sigunguPattern = sigungu ? `% ${sigungu} %` : null;

    const rows = await prisma.$queryRaw<
      { graded: bigint; top_grade: bigint; vacancy: bigint; avg_capacity: number | null }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE grade IS NOT NULL) AS graded,
        COUNT(*) FILTER (WHERE grade = 1) AS top_grade,
        COUNT(*) FILTER (
          WHERE "facilityType" != 'HOME_CARE'
            AND extra ? 'currentOccupancy'
            AND (extra->>'capacity')::numeric > 0
            AND (extra->>'capacity')::numeric - (extra->>'currentOccupancy')::numeric > 0
        ) AS vacancy,
        AVG((extra->>'capacity')::numeric) FILTER (
          WHERE "facilityType" != 'HOME_CARE' AND (extra->>'capacity')::numeric > 0
        ) AS avg_capacity
      FROM "Facility"
      WHERE address LIKE ANY(${prefixes.map((p) => `${p}%`)}::text[])
        AND (${sigunguPattern}::text IS NULL OR address LIKE ${sigunguPattern})
        AND (${facilityType ?? null}::text IS NULL OR "facilityType"::text = ${facilityType ?? null})
    `;

    const row = rows[0];
    return {
      topGrade: Number(row?.top_grade ?? 0),
      graded: Number(row?.graded ?? 0),
      vacancy: Number(row?.vacancy ?? 0),
      avgCapacity: row?.avg_capacity != null ? Math.round(Number(row.avg_capacity)) : null,
    };
  }
);
