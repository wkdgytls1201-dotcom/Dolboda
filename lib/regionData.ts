import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { REGION_SEO, type RegionSeo, sigunguOf, subLocalityOf } from "@/lib/regionSeo";
import type { FacilityType } from "@/lib/types";

// 데모용 시설(dataSource=mock)은 실재하지 않으므로 지역 페이지의 개수·통계·목록에서 뺀다.
// 목록·검색·사이트맵은 이미 제외하고 있었는데 지역 쪽만 빠져 있어서, "OO시 요양원 N곳"의
// N이 다른 화면과 어긋나고 목록에서 noindex인 상세 페이지로 링크가 나가고 있었다.
const NOT_MOCK = { dataSource: { not: "mock" } } as const;

function prefixWhere(region: RegionSeo) {
  return { OR: region.prefixes.map((p) => ({ address: { startsWith: p } })) };
}

// 시설이 1곳 이상 있는 지역 목록 — 푸터·sitemap에서 사용.
// 요청마다 DB를 때리지 않게 하루 단위 서버 캐시.
export const getActiveRegions = unstable_cache(
  async (): Promise<{ slug: string; label: string; count: number }[]> => {
    const rows = await prisma.$queryRaw<{ sido: string; count: bigint }[]>`
      SELECT split_part(address, ' ', 1) AS sido, COUNT(*) AS count
      FROM "Facility" WHERE "dataSource" != 'mock' GROUP BY 1
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
      WHERE "dataSource" != 'mock'
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
      where: { AND: [prefixWhere(region), { address: { contains: ` ${sigungu} ` } }, NOT_MOCK] },
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
        AND: [
          prefixWhere(region),
          { address: { contains: ` ${sigungu} ` } },
          { facilityType },
          NOT_MOCK,
        ],
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
    // null = 지역 무관 전국(전국 유형 허브용) — region.prefixes 조건을 그냥 뺀다
    region: RegionSeo | null,
    sigungu: string | null,
    take: number,
    facilityType?: FacilityType,
    skip = 0
  ) => {
    const conditions: object[] = [NOT_MOCK];
    if (region) conditions.push(prefixWhere(region));
    if (sigungu) conditions.push({ address: { contains: ` ${sigungu} ` } });
    if (facilityType) conditions.push({ facilityType });
    const rows = await prisma.facility.findMany({
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
        // 대표 사진 1장(공단 실사진 파이프라인이 채운 extra.photos[0])만 뽑아 쓴다.
        // extra 통짜는 서버-DB 사이에서만 오가고, 페이지엔 URL 한 줄만 실린다(SSG 일 1회).
        extra: true,
      },
    });
    return rows.map(({ extra, ...f }) => {
      const photos = (extra as { photos?: unknown } | null)?.photos;
      return {
        ...f,
        photo:
          Array.isArray(photos) && typeof photos[0] === "string" ? (photos[0] as string) : null,
      };
    });
  }
);

export interface NationwideTypeSummary {
  total: number;
  /** 시/도별 시설 수 (내림차순) — 시/도 랜딩으로 내려보내는 내부 링크 */
  bySido: { slug: string; label: string; count: number }[];
  /** 이 유형이 많은 시/군/구 (내림차순) — 지역+유형 페이지로 바로 내려보낸다 */
  topSigungu: { sidoSlug: string; sidoLabel: string; sigungu: string; count: number }[];
}

/**
 * 전국 유형 허브(/요양원 등)가 쓰는 요약.
 * 이미 하루 캐시된 getRegionIndex가 (시도·시군구·유형)별 개수를 전부 갖고 있어
 * DB를 추가로 치지 않는다 — 허브 페이지를 붙이는 데 드는 쿼리 비용이 0이다.
 */
export const getNationwideTypeSummary = cache(
  async (facilityType: FacilityType): Promise<NationwideTypeSummary> => {
    const index = await getRegionIndex();
    const sidoCounts = new Map<string, number>();
    const sigunguRows: NationwideTypeSummary["topSigungu"] = [];
    let total = 0;

    for (const row of index) {
      if (row.facilityType !== facilityType) continue;
      total += row.count;
      sidoCounts.set(row.sidoSlug, (sidoCounts.get(row.sidoSlug) ?? 0) + row.count);
      const region = REGION_SEO.find((r) => r.slug === row.sidoSlug);
      if (region) {
        sigunguRows.push({
          sidoSlug: row.sidoSlug,
          sidoLabel: region.label,
          sigungu: row.sigungu,
          count: row.count,
        });
      }
    }

    return {
      total,
      bySido: REGION_SEO.filter((r) => (sidoCounts.get(r.slug) ?? 0) > 0)
        .map((r) => ({ slug: r.slug, label: r.label, count: sidoCounts.get(r.slug)! }))
        .sort((a, b) => b.count - a.count),
      topSigungu: sigunguRows.sort((a, b) => b.count - a.count),
    };
  }
);

/**
 * 전국 단위 유형별 통계 — 지역 통계와 같은 기준(mock 제외)으로 센다.
 *
 * total을 여기서 같이 세는 이유: getRegionIndex는 주소에서 시/군/구를 뽑지 못한 시설
 * (전국 140곳)을 빼고 집계해서, 그 합을 그대로 쓰면 "전국 요양원 6,210곳"처럼 사이트의
 * 실제 집계(28,834곳)와 어긋난 숫자가 제목·설명에 박힌다. 허브의 대표 숫자는 DB 실집계다.
 */
export const getNationwideTypeStats = unstable_cache(
  async (
    facilityType: string
  ): Promise<
    RegionStats & { total: number; gradeCounts: { grade: number; count: number }[] }
  > => {
    const rows = await prisma.$queryRaw<
      {
        total: bigint;
        graded: bigint;
        vacancy: bigint;
        avg_capacity: number | null;
        g1: bigint;
        g2: bigint;
        g3: bigint;
        g4: bigint;
        g5: bigint;
      }[]
    >`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE grade IS NOT NULL) AS graded,
        COUNT(*) FILTER (WHERE grade = 1) AS g1,
        COUNT(*) FILTER (WHERE grade = 2) AS g2,
        COUNT(*) FILTER (WHERE grade = 3) AS g3,
        COUNT(*) FILTER (WHERE grade = 4) AS g4,
        COUNT(*) FILTER (WHERE grade = 5) AS g5,
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
      WHERE "dataSource" != 'mock' AND "facilityType"::text = ${facilityType}
    `;

    const row = rows[0];
    const n = (v: bigint | undefined) => Number(v ?? 0);
    return {
      total: n(row?.total),
      graded: n(row?.graded),
      topGrade: n(row?.g1),
      vacancy: n(row?.vacancy),
      avgCapacity: row?.avg_capacity != null ? Math.round(Number(row.avg_capacity)) : null,
      gradeCounts: [
        { grade: 1, count: n(row?.g1) },
        { grade: 2, count: n(row?.g2) },
        { grade: 3, count: n(row?.g3) },
        { grade: 4, count: n(row?.g4) },
        { grade: 5, count: n(row?.g5) },
      ],
    };
  },
  ["nationwide-type-stats"],
  { revalidate: 86400 }
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
      WHERE "dataSource" != 'mock'
        AND address LIKE ANY(${prefixes.map((p) => `${p}%`)}::text[])
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
