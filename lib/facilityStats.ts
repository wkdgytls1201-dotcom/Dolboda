import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export interface FacilityStatsData {
  total: number;
  grade1Count: number;
  vacancyCount: number;
}

// 전체 28,000여 건 집계 — 홈 페이지(서버)와 /api/facilities/stats가 같은 캐시를 공유한다.
// 예전엔 양쪽이 각각 전체 스캔 3번을 돌려 방문마다 0.6초 넘게 썼다.
// 데이터는 import 스크립트를 돌릴 때만 바뀌므로 하루 캐시로 충분하다.
export const getFacilityStats = unstable_cache(
  async (): Promise<FacilityStatsData> => {
    const rows = await prisma.$queryRaw<{ total: bigint; grade1: bigint; vacancy: bigint }[]>`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE grade = 1) AS grade1,
        COUNT(*) FILTER (
          WHERE "facilityType" != 'NURSING_HOSPITAL'
            AND extra ? 'currentOccupancy'
            AND (extra->>'capacity')::numeric > 0
            AND (extra->>'capacity')::numeric - (extra->>'currentOccupancy')::numeric > 0
        ) AS vacancy
      FROM "Facility"
      WHERE "dataSource" != 'mock'
    `;
    const row = rows[0];
    return {
      total: Number(row?.total ?? 0),
      grade1Count: Number(row?.grade1 ?? 0),
      vacancyCount: Number(row?.vacancy ?? 0),
    };
  },
  ["facility-stats"],
  { revalidate: 86400 }
);

// 히어로 배너 슬라이드 — 유형·지역이 겹치지 않게 1등급 실제 시설을 골라온다.
// DISTINCT ON + 정렬이라 매번 돌리기엔 무거워 같이 캐시한다.
export const getHeroSlides = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<
      { id: string; name: string; address: string; facilityType: string; grade: number | null }[]
    >`
      SELECT DISTINCT ON ("facilityType", split_part(btrim(address), ' ', 1))
        id, name, address, "facilityType"::text AS "facilityType", grade
      FROM "Facility"
      WHERE grade = 1
        AND "dataSource" != 'mock'
        AND lat IS NOT NULL
      ORDER BY "facilityType", split_part(btrim(address), ' ', 1), name
      LIMIT 7
    `;
    return rows;
  },
  ["hero-slides"],
  { revalidate: 86400 }
);
