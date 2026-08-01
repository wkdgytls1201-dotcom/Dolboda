import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rowToFacility, toCardFacility } from "@/lib/facilityRepo";
import { compareFacilities, rankAllIntents, type SimilarIntent } from "@/lib/similarity";
import type { Facility as FacilityRow } from "@prisma/client";

// 유사 시설 추천 — 2단계 검색.
//   1) 후보 생성: 같은 유형, 좌표가 있으면 거리순 상위 400곳
//   2) 정밀 채점: 후보만 특성 비교 후 의도별 재정렬
//
// 로딩이 길었던 이유는 DB가 아니라 그 뒤였다(실측 2026-08-01):
//   · 쿼리 실행 자체는 9.7ms — facilityType 인덱스 + top-N 정렬이라 이미 빠름
//   · 그런데 `SELECT *`로 400행을 받으면 1.56MB, 왕복 180~250ms
//   · extra 평균 2,445B 중 programs가 1,500~1,900B인데, 안심지수는 프로그램 "종류 수"만 쓴다
//   · 게다가 탭을 누를 때마다 이 전부를 처음부터 다시 했다
// 그래서 (1) programs를 종류만 남겨 행을 줄이고 (2) 5개 의도를 한 번에 계산해 (3) 캐시한다.
const CANDIDATE_LIMIT = 400;
const RESULT_LIMIT = 12;

interface SimilarPayload {
  facility: ReturnType<typeof toCardFacility>;
  distanceKm?: number;
  similarity: number;
  reasons: string[];
  deltas: { label: string; tone: "good" | "neutral" }[];
}

const getSimilar = unstable_cache(
  async (id: string): Promise<Record<SimilarIntent, SimilarPayload[]> | null> => {
    const baseRow = await prisma.facility.findUnique({ where: { id } });
    if (!baseRow) return null;
    const base = rowToFacility(baseRow);

    const sido = baseRow.address.trim().split(/\s+/)[0] ?? "";

    // 후보를 먼저 id로만 좁힌 뒤(정렬은 여기서 끝난다) 필요한 컬럼만 다시 읽는다.
    // programs는 종류(category)만 남긴다 — 원본 배열은 수백 개짜리도 있는데
    // 점수 계산에는 `new Set(programs.map(p => p.category)).size`만 쓰인다.
    const rows =
      baseRow.lat != null && baseRow.lng != null
        ? await prisma.$queryRaw<FacilityRow[]>`
            WITH nearest AS (
              SELECT id FROM "Facility"
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
            )
            SELECT
              f.id, f.name, f.address, f.phone, f.grade, f.lat, f.lng,
              f."establishedYear", f."facilityType", f."dataSource", f."gradeSource",
              f."sourceUpdatedAt", f.parking,
              (f.extra - 'programs') || jsonb_build_object('programs', COALESCE((
                SELECT jsonb_agg(DISTINCT jsonb_build_object('category', p->>'category'))
                FROM jsonb_array_elements(f.extra->'programs') p
              ), '[]'::jsonb)) AS extra
            FROM "Facility" f
            JOIN nearest n ON n.id = f.id
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
    const ranked = rankAllIntents(base, scored, RESULT_LIMIT);

    const toPayload = (r: (typeof scored)[number]): SimilarPayload => ({
      facility: toCardFacility(r.facility),
      distanceKm: r.distanceKm,
      similarity: r.similarity,
      reasons: r.reasons,
      deltas: r.deltas,
    });

    return Object.fromEntries(
      Object.entries(ranked).map(([intent, list]) => [intent, list.map(toPayload)])
    ) as Record<SimilarIntent, SimilarPayload[]>;
  },
  ["facility-similar"],
  { revalidate: 86400 }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id가 필요해요." }, { status: 400 });

  const all = await getSimilar(id);
  if (!all) return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });

  // intent를 지정하면 그 탭 것만 보낸다(≈13KB). 예전엔 intent가 있어도 intents(5개 전부,
  // ≈60KB)를 함께 실어 보내서, 처음 다른 탭을 누르는 순간 필요 없는 나머지 4개 탭
  // 데이터까지 받아오느라 그 탭 전환이 느리게 느껴졌다(2026-08-02 실측: 60KB→13KB).
  // intent가 없을 때만(시설 상세 서버 렌더링처럼 여러 탭을 한 번에 준비해두고 싶을 때)
  // 5개 전부를 보낸다.
  const intent = searchParams.get("intent") as SimilarIntent | null;
  const body = intent && all[intent] ? { items: all[intent] } : { intents: all };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
