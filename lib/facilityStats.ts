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
//
// 실사진(extra.photos, R2 파이프라인이 채움)이 있는 시설을 두 겹으로 우선한다:
// ① 같은 유형×지역 안에서 사진 있는 시설을 뽑고 ② 뽑힌 후보 중 사진 있는 지역부터
// 7자리를 채운다. 사진이 한 지역(경기도)뿐인 동안에도 배너에 실사진이 실제로 걸리고,
// 없는 시설은 스톡 사진 폴백이라 지역이 늘 때마다 저절로 실사진 비중이 올라간다.
// 키를 v2로 올린 이유: 반환 모양이 바뀌었는데 unstable_cache는 배포를 넘어 살아남을
// 수 있어, 옛 캐시(photo 없는 모양)가 새 코드에 물리면 안 된다.
export const getHeroSlides = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        address: string;
        facilityType: string;
        grade: number | null;
        photo: string | null;
      }[]
    >`
      SELECT id, name, address, "facilityType", grade, photo
      FROM (
        SELECT DISTINCT ON ("facilityType", split_part(btrim(address), ' ', 1))
          id, name, address, "facilityType"::text AS "facilityType", grade,
          extra->'photos'->>0 AS photo
        FROM "Facility"
        WHERE grade = 1
          AND "dataSource" != 'mock'
          AND lat IS NOT NULL
        ORDER BY "facilityType", split_part(btrim(address), ' ', 1),
          (extra->'photos'->>0 IS NOT NULL) DESC,
          -- 따옴표·기호로 시작하는 이름("(A+)"튼튼한…)이 가나다 정렬을 타고 메인 대표로
          -- 걸리는 걸 막는다 — 배너는 서비스의 얼굴이라 정상 표기 시설을 우선한다.
          (name ~ '^[가-힣A-Za-z0-9]') DESC, name
      ) t
      ORDER BY (photo IS NOT NULL) DESC, "facilityType"
      LIMIT 7
    `;
    return rows;
  },
  ["hero-slides-v2"],
  { revalidate: 86400 }
);
