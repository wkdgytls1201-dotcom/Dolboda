import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 홈 화면 통계(등급/입소가능)는 /api/facilities의 200건 제한 목록으로 계산하면 안 됨 —
// 전체 22,000여 건을 대상으로 서버에서 직접 집계한다.
export async function GET() {
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

  return NextResponse.json({
    total,
    grade1Count,
    vacancyCount: Number(vacancyRows[0]?.vacancy ?? 0),
  });
}
