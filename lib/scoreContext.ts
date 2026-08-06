import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { rowToFacility } from "./facilityRepo";
import { calcDolbodaScore } from "./dolbodaScore";
import { haversineDistanceKm } from "./distance";
import type { Facility as FacilityRow } from "@prisma/client";

// 돌보다 공공데이터 기반 안심지수의 맥락 데이터:
// ① 같은 시군구·같은 유형 시설들의 안심지수 평균 (서버에서 동일 산식으로 계산)
// ② 최근접 요양병원 거리 (비병원 시설의 의료 접근성 신호)
//
// app/api/facilities/score-context/route.ts(외부 호출용 API)와 시설 상세 페이지의
// 서버 스트리밍 슬롯(ScoreContextSection)이 이 함수 하나를 함께 쓴다. 원래는 상세
// 페이지가 이 API를 클라이언트에서 fetch했는데, 그러면 28,000여 상세페이지가 매번
// 마운트 후 왕복 하나씩을 더 기다렸다(2026-08-07 감사) — 비슷한 시설·자리추이처럼
// 서버에서 직접 계산해 <Suspense>로 흘려보내면 그 왕복이 사라진다.

export interface RegionAverage {
  regionName: string | null;
  regionAverage: number | null;
  regionCount: number;
}

export interface ScoreContext extends RegionAverage {
  nearestHospitalKm: number | null;
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
        totals.length >= 3 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
    };
  },
  ["score-context-region-average"],
  { revalidate: 86400 }
);

/** 시설 하나의 안심지수 맥락(지역 평균·최근접 요양병원 거리)을 계산한다. */
export async function getScoreContext(target: {
  facilityType: string;
  address: string;
  lat: number | null;
  lng: number | null;
}): Promise<ScoreContext> {
  // 주소 두 번째 토큰이 시군구 (예: "서울특별시 중구 ...")
  const sigungu = target.address.trim().split(/\s+/)[1] ?? "";

  const [region, nearestHospitalKm] = await Promise.all([
    /(시|군|구)$/.test(sigungu)
      ? getRegionAverage(target.facilityType, sigungu)
      : Promise.resolve<RegionAverage>({ regionName: null, regionAverage: null, regionCount: 0 }),
    // 최근접 요양병원 거리 — 비병원 시설 + 좌표 보유 시설만.
    // 위 지역 평균과 같은 병원 목록·같은 계산식을 쓴다.
    target.facilityType !== "NURSING_HOSPITAL" && target.lat != null && target.lng != null
      ? getHospitalPoints().then((points) => nearestHospitalOf(points, target.lat, target.lng))
      : Promise.resolve(null),
  ]);

  return { ...region, nearestHospitalKm };
}
