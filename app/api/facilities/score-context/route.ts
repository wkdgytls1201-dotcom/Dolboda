import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rowToFacility } from "@/lib/facilityRepo";
import { calcDolbodaScore } from "@/lib/dolbodaScore";
import { haversineDistanceKm } from "@/lib/distance";
import type { Facility as FacilityRow } from "@prisma/client";

// 돌보다 공공데이터 기반 안심지수의 맥락 데이터 1회 조회:
// ① 같은 시군구·같은 유형 시설들의 안심지수 평균 (서버에서 동일 산식으로 계산)
// ② 최근접 요양병원 거리 (비병원 시설의 의료 접근성 신호)
// 상세페이지가 이 엔드포인트 하나만 부르면 되도록 묶어서 요청 수를 줄였다.

interface RegionAverage {
  regionName: string | null;
  regionAverage: number | null;
  regionCount: number;
}

// 좌표가 있는 요양병원 목록(약 1,500곳). "인근 요양병원 접근성" 신호를 낼 때
// 시설마다 SQL을 한 번씩 돌리는 대신, 이 목록 하나를 하루 캐시해두고 거리 계산은 JS에서 한다.
// 이래야 이 시설과 비교 대상 이웃 시설이 완전히 같은 방식으로 계산된다(아래 주석 참고).
const getHospitalPoints = unstable_cache(
  async (): Promise<[number, number][]> => {
    const rows = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT lat, lng FROM "Facility"
      WHERE "facilityType" = 'NURSING_HOSPITAL'
        AND "dataSource" <> 'mock'
        AND lat IS NOT NULL AND lng IS NOT NULL
    `;
    return rows.map((r) => [r.lat, r.lng]);
  },
  ["nursing-hospital-points"],
  { revalidate: 86400 }
);

function nearestHospitalOf(
  points: [number, number][],
  lat?: number | null,
  lng?: number | null
): number | null {
  if (lat == null || lng == null || points.length === 0) return null;
  let min = Infinity;
  for (const [hLat, hLng] of points) {
    const d = haversineDistanceKm(lat, lng, hLat, hLng);
    if (d < min) min = d;
  }
  return Number.isFinite(min) ? min : null;
}

// 시군구 평균은 시설 하나를 열 때마다 같은 800행을 다시 읽고 800번 점수를 계산하던 자리였다.
// (시도·유형)이 같으면 결과가 같고 데이터는 import 때만 바뀌므로 하루 캐시한다.
// 캐시 키에는 keyParts + 인자가 함께 들어가므로 (유형, 시군구) 조합별로 따로 저장된다.
//
// ⚠️ 이웃 시설도 각자의 최근접 요양병원 거리를 넣어 계산한다. 예전엔 표시 중인 시설만
// 그 신호를 갖고 평균 쪽은 빠져 있어서, 화면의 "평균 대비 +N점" 배지가 서로 다른 산식으로
// 계산된 두 숫자를 그냥 빼고 있었다(의료·간호 영역이 23%라 무시할 차이가 아니다).
const getRegionAverage = unstable_cache(
  async (facilityType: string, sigungu: string): Promise<RegionAverage> => {
    const [rows, hospitals] = await Promise.all([
      prisma.$queryRaw<FacilityRow[]>`
        SELECT * FROM "Facility"
        WHERE "facilityType"::text = ${facilityType}
          AND "dataSource" <> 'mock'
          AND split_part(btrim(address), ' ', 2) = ${sigungu}
        LIMIT 800
      `,
      getHospitalPoints(),
    ]);

    // 표시 중인 시설과 완전히 같은 산식 — 산출 보류(null)인 시설은 평균에서 제외
    const totals = rows
      .map((r) => {
        const facility = rowToFacility(r);
        return calcDolbodaScore(facility, {
          nearestHospitalKm: nearestHospitalOf(hospitals, facility.lat, facility.lng),
        }).total;
      })
      .filter((t): t is number => t != null);

    return {
      regionName: sigungu,
      regionCount: totals.length,
      regionAverage:
        totals.length >= 3
          ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
          : null,
    };
  },
  ["score-context-region-average"],
  { revalidate: 86400 }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id가 필요해요." }, { status: 400 });

  const target = await prisma.facility.findUnique({
    where: { id },
    select: { facilityType: true, address: true, lat: true, lng: true },
  });
  if (!target) return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });

  // 주소 두 번째 토큰이 시군구 (예: "서울특별시 중구 ...")
  const sigungu = target.address.trim().split(/\s+/)[1] ?? "";

  const [region, nearestHospitalKm] = await Promise.all([
    /(시|군|구)$/.test(sigungu)
      ? getRegionAverage(target.facilityType, sigungu)
      : Promise.resolve<RegionAverage>({
          regionName: null,
          regionAverage: null,
          regionCount: 0,
        }),
    // 최근접 요양병원 거리 — 비병원 시설 + 좌표 보유 시설만.
    // 위 지역 평균과 같은 병원 목록·같은 계산식을 쓴다.
    target.facilityType !== "NURSING_HOSPITAL" && target.lat != null && target.lng != null
      ? getHospitalPoints().then((points) =>
          nearestHospitalOf(points, target.lat, target.lng)
        )
      : Promise.resolve(null),
  ]);

  return NextResponse.json(
    { ...region, nearestHospitalKm },
    {
      // 같은 시설을 여러 사람이 볼 때 서버까지 오지 않게 CDN에서도 하루 재사용한다
      // (/api/facilities/stats와 같은 방식).
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
      },
    }
  );
}
