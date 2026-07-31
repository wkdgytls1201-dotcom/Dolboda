import { prisma } from "@/lib/prisma";
import HomeClient from "./HomeClient";
import type { HeroSlide } from "@/components/HeroBanner";

// 통계는 서버에서 미리 집계해 넘긴다. 클라이언트에서만 불러오면 검색봇과 첫 화면이
// "등록된 시설 0곳"을 보게 되는데, 실제로는 28,000여 곳이라 신뢰에 그대로 타격이 된다.
async function getStats() {
  const [total, grade1Count, vacancyRows] = await Promise.all([
    prisma.facility.count({ where: { dataSource: { not: "mock" } } }),
    prisma.facility.count({ where: { grade: 1, dataSource: { not: "mock" } } }),
    prisma.$queryRaw<{ vacancy: bigint }[]>`
      SELECT COUNT(*) AS vacancy
      FROM "Facility"
      WHERE "facilityType" != 'NURSING_HOSPITAL'
        AND "dataSource" != 'mock'
        AND extra ? 'currentOccupancy'
        AND (extra->>'capacity')::numeric > 0
        AND (extra->>'capacity')::numeric - (extra->>'currentOccupancy')::numeric > 0
    `,
  ]);
  return { total, grade1Count, vacancyCount: Number(vacancyRows[0]?.vacancy ?? 0) };
}

// 히어로 배너 슬라이드 — 유형별로 1등급 실제 시설을 한 곳씩 골라 다양하게 보여준다.
// 예전엔 코드에 박아둔 데모 시설(서울행복요양병원 등)이라 실재하지 않는 이름이 메인에 떴다.
async function getHeroSlides() {
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
  return rows as HeroSlide[];
}

// 통계는 자주 바뀌지 않으니 1시간 캐시 — 홈 방문마다 집계 쿼리를 돌릴 이유가 없다
export const revalidate = 3600;

export default async function HomePage() {
  const [initialStats, heroSlides] = await Promise.all([getStats(), getHeroSlides()]);
  return <HomeClient initialStats={initialStats} heroSlides={heroSlides} />;
}
