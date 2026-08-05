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
//
// ★ 이 파일은 원래 app/api/facilities/similar/route.ts 안에만 있었다. 그런데 시설 상세
//   페이지(app/facility/[id]/page.tsx)가 같은 목적의 조회를 **따로 하나 더** 갖고 있었고,
//   그쪽은 위의 교훈이 하나도 반영돼 있지 않았다(`address contains 시군구` + `SELECT *`).
//   실측(2026-08-04)으로 요양원 상세에서 60행 250KB를 받느라 105ms — DB 실행 시간은
//   0.8ms였으니 전부 페이로드 전송 비용이었다. 게다가 후보를 같은 시군구로만 좁혀서
//   시군구에 동종 시설이 적으면 "비슷한 곳"이 2~7곳밖에 안 나왔고, 탭을 눌러 API를 타면
//   전국 최근접 400곳에서 뽑은 12곳이 나와 **같은 화면 안에서 결과가 서로 달랐다.**
//   그래서 조회를 여기 하나로 합치고 양쪽이 같은 캐시를 쓰게 했다.
const CANDIDATE_LIMIT = 400;
const RESULT_LIMIT = 12;

export interface SimilarPayload {
  facility: ReturnType<typeof toCardFacility>;
  distanceKm?: number;
  similarity: number;
  reasons: string[];
  deltas: { label: string; tone: "good" | "neutral" }[];
}

/**
 * 시설 하나의 5개 의도별 유사 시설을 계산한다. 하루 캐시라 상세 페이지 서버 렌더링과
 * 탭 전환 API가 같은 결과를 공유한다 — 상세를 한 번 연 시설은 탭을 눌러도 DB를 다시 안 탄다.
 */
export const getSimilar = unstable_cache(
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
