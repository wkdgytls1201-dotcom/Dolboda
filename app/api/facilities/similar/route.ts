import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rowToFacility, toCardFacility } from "@/lib/facilityRepo";
import { compareFacilities, rankByIntent, type SimilarIntent } from "@/lib/similarity";
import type { Facility as FacilityRow } from "@prisma/client";

// 유사 시설 추천 — 2단계 검색.
//   1) 후보 생성: 같은 유형 + 같은 시/도(주소 첫 토큰), 최대 400곳
//   2) 정밀 채점: 후보만 특성 비교 후 의도별 재정렬
// 28,860곳을 매번 전부 비교하면 응답이 몇 초씩 걸려 대안 탐색 흐름이 끊긴다.
const CANDIDATE_LIMIT = 400;
const RESULT_LIMIT = 12;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const intent = (searchParams.get("intent") ?? "similar") as SimilarIntent;
  if (!id) return NextResponse.json({ error: "id가 필요해요." }, { status: 400 });

  const baseRow = await prisma.facility.findUnique({ where: { id } });
  if (!baseRow) return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });
  const base = rowToFacility(baseRow);

  const sido = baseRow.address.trim().split(/\s+/)[0] ?? "";

  // 좌표가 있으면 거리순으로 후보를 좁힌다(가까운 대안이 실제로 의미 있는 대안이라서).
  // 없으면 같은 시/도 안에서 등급순으로 채운다.
  const rows =
    baseRow.lat != null && baseRow.lng != null
      ? await prisma.$queryRaw<FacilityRow[]>`
          SELECT * FROM "Facility"
          WHERE id <> ${id}
            AND "facilityType" = ${baseRow.facilityType}::"FacilityType"
            AND "dataSource" <> 'mock'
            AND lat IS NOT NULL AND lng IS NOT NULL
          ORDER BY (
            6371 * acos(LEAST(1, GREATEST(-1,
              cos(radians(${baseRow.lat})) * cos(radians(lat)) * cos(radians(lng) - radians(${baseRow.lng}))
              + sin(radians(${baseRow.lat})) * sin(radians(lat))
            )))
          ) ASC
          LIMIT ${CANDIDATE_LIMIT}
        `
      : await prisma.facility.findMany({
          where: {
            id: { not: id },
            facilityType: baseRow.facilityType,
            dataSource: { not: "mock" },
            address: { startsWith: sido },
          },
          orderBy: { grade: { sort: "asc", nulls: "last" } },
          take: CANDIDATE_LIMIT,
        });

  const scored = rows.map((row) => compareFacilities(base, rowToFacility(row)));
  const ranked = rankByIntent(base, scored, intent).slice(0, RESULT_LIMIT);

  return NextResponse.json({
    items: ranked.map((r) => ({
      facility: toCardFacility(r.facility),
      distanceKm: r.distanceKm,
      similarity: r.similarity,
      reasons: r.reasons,
      deltas: r.deltas,
    })),
  });
}
