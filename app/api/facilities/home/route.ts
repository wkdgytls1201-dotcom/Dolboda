import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rowToFacility, toCardFacility } from "@/lib/facilityRepo";
import { PROMOTED_FACILITY_IDS } from "@/lib/promotedFacilities";

// 홈 화면 전용 경량 목록 — 예전에 홈은 "추천 시설" 6곳과 "가장 최근 설립" 대체 후보를
// 뽑으려고 전국 등록순 200건(약 150KB)을 통째로 받았다. 실제로 쓰는 건 아래 세 묶음
// 20여 건뿐이라, 서버에서 그 조각만 골라 내려준다.
//
// - promoted+grade1: "추천 시설" — 프리미엄 고정 노출(PROMOTED_FACILITY_IDS 순서 유지)
//   뒤에 평가 1등급 시설을 등록순으로 채운다(기존 화면과 같은 기준).
// - hospitals: "가장 최근 설립"에서 주변에 요양병원이 없을 때 쓰는 전국 대체 후보
//   (설립연도는 요양병원 데이터에만 있다).
// - others: 같은 화면에서 병원 외 유형이 모자랄 때 쓰는 등급순 대체 후보.

const SLOT = 6;

export async function GET() {
  const [promotedRows, grade1Rows, hospitalRows, otherRows] = await Promise.all([
    PROMOTED_FACILITY_IDS.length > 0
      ? prisma.facility.findMany({ where: { id: { in: PROMOTED_FACILITY_IDS } } })
      : Promise.resolve([]),
    prisma.facility.findMany({
      where: { grade: 1, dataSource: { not: "mock" }, id: { notIn: PROMOTED_FACILITY_IDS } },
      // createdAt은 대량 임포트라 동일 값이 수천 건 — id 2차 키가 없으면 동점 순서가
      // 쿼리 플랜 따라 흔들려 방문할 때마다 추천이 바뀔 수 있다(예전 로직의 잠복 문제)
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: SLOT,
    }),
    prisma.facility.findMany({
      where: {
        facilityType: "NURSING_HOSPITAL",
        dataSource: { not: "mock" },
        establishedYear: { not: null },
      },
      orderBy: { establishedYear: "desc" },
      take: SLOT,
    }),
    prisma.facility.findMany({
      where: {
        facilityType: { in: ["HOME_CARE", "NURSING_HOME", "DAY_NIGHT_CARE"] },
        dataSource: { not: "mock" },
        grade: { not: null },
      },
      orderBy: { grade: "asc" },
      take: SLOT,
    }),
  ]);

  // 고정 노출은 배열에 적힌 순서 그대로
  const promotedById = new Map(promotedRows.map((r) => [r.id, r]));
  const promoted = PROMOTED_FACILITY_IDS.map((id) => promotedById.get(id)).filter(
    (r): r is NonNullable<typeof r> => !!r
  );

  const card = (rows: typeof grade1Rows) => rows.map((r) => toCardFacility(rowToFacility(r)));

  return NextResponse.json(
    {
      recommended: card([...promoted, ...grade1Rows]).slice(0, SLOT),
      hospitals: card(hospitalRows),
      others: card(otherRows),
    },
    {
      // 시설 데이터는 하루 단위 갱신 — 목록 API와 같은 CDN 캐시 정책
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
