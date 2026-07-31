import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rowToFacility } from "@/lib/facilityRepo";
import { calcDolbodaScore } from "@/lib/dolbodaScore";
import type { Facility as FacilityRow } from "@prisma/client";

// 돌보다 AI기반 안심지수의 맥락 데이터 1회 조회:
// ① 같은 시군구·같은 유형 시설들의 안심지수 평균 (서버에서 동일 산식으로 계산)
// ② 최근접 요양병원 거리 (비병원 시설의 의료 접근성 신호)
// 상세페이지가 이 엔드포인트 하나만 부르면 되도록 묶어서 요청 수를 줄였다.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id가 필요해요." }, { status: 400 });

  const target = await prisma.facility.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });

  // 주소 두 번째 토큰이 시군구 (예: "서울특별시 중구 ...")
  const sigungu = target.address.trim().split(/\s+/)[1] ?? "";
  let regionName: string | null = null;
  let regionAverage: number | null = null;
  let regionCount = 0;

  if (/(시|군|구)$/.test(sigungu)) {
    const rows = await prisma.$queryRaw<FacilityRow[]>`
      SELECT * FROM "Facility"
      WHERE "facilityType"::text = ${target.facilityType}
        AND split_part(btrim(address), ' ', 2) = ${sigungu}
      LIMIT 800
    `;
    // 표시 중인 시설과 완전히 같은 산식 — 산출 보류(null)인 시설은 평균에서 제외
    const totals = rows
      .map((r) => calcDolbodaScore(rowToFacility(r)).total)
      .filter((t): t is number => t != null);
    regionName = sigungu;
    regionCount = totals.length;
    if (totals.length >= 3) {
      regionAverage = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    }
  }

  // 최근접 요양병원 거리 — 비병원 시설 + 좌표 보유 시설만
  let nearestHospitalKm: number | null = null;
  if (target.facilityType !== "NURSING_HOSPITAL" && target.lat != null && target.lng != null) {
    const nearest = await prisma.$queryRaw<{ km: number }[]>`
      SELECT 6371 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(${target.lat})) * cos(radians(lat)) * cos(radians(lng) - radians(${target.lng}))
          + sin(radians(${target.lat})) * sin(radians(lat))
        ))
      ) AS km
      FROM "Facility"
      WHERE "facilityType" = 'NURSING_HOSPITAL' AND lat IS NOT NULL AND lng IS NOT NULL
      ORDER BY km ASC
      LIMIT 1
    `;
    nearestHospitalKm = nearest[0]?.km ?? null;
  }

  return NextResponse.json({ regionName, regionAverage, regionCount, nearestHospitalKm });
}
