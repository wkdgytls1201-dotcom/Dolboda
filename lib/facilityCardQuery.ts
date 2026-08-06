import { Prisma } from "@prisma/client";
import type { Facility as FacilityRow } from "@prisma/client";
import { prisma } from "./prisma";
import { rowToFacility, toCardFacility } from "./facilityRepo";
import type { Facility as FacilityDTO } from "./types";

// 목록(카드) 화면 전용 조회.
//
// 왜 따로 만들었나 — `findMany`는 `extra`(jsonb)를 통째로 가져오는데, 카드가 쓰는 건
// 그 일부뿐이다. 나머지는 Node에서 파싱한 뒤 `toCardFacility`가 버린다.
// 300건 기준 실측(2026-08-06): DB→서버 전송 **1,628KB / 356ms**.
//
// 그렇다고 `extra`를 아예 뺄 수는 없다. 안심지수(`calcDolbodaScore`)가 인력·평가·시설현황
// 등을 재료로 쓰기 때문이다. 그래서 **점수 계산에 필요한 만큼만 SQL에서 남긴다**:
//
//   - `photos`·`photoItems` → 첫 장만 (카드는 썸네일 1장과 그 캡션만 쓴다)
//   - `programs`     → 카테고리 **종류만** (점수는 `new Set(...).size`만 본다)
//   - `tenure`       → 직군별 행을 **합계 한 줄로** (점수는 total·over2y 합만 본다)
//   - `institutionInfo` → 점수가 보는 5개 필드만
//   - `facilityRooms`   → 침실 구성과 rehabRoom만
//
// 결과(실측): **741KB / 169ms** — 절반 이하, 2.1배 빠르다.
// 점수는 **한 자리도 달라지지 않는다**(scripts/verify-card-projection.mjs가 전수 대조).
//
// ⚠️ `lib/dolbodaScore.ts`가 새로운 `extra` 항목을 보게 되면 여기도 같이 열어야 한다.
//    안 그러면 그 항목이 없는 채로 계산돼 목록과 상세의 점수가 어긋난다.
//    점수 로직을 고칠 때 이 파일과 위 검증 스크립트를 같이 돌릴 것.
const CARD_EXTRA = Prisma.raw(`
  (extra - 'photos' - 'photoItems' - 'facilityRooms' - 'programs' - 'tenure' - 'institutionInfo' - 'programTags')
  || jsonb_strip_nulls(jsonb_build_object(
    'photos',
      CASE WHEN extra->'photos'->0 IS NULL THEN NULL
           ELSE jsonb_build_array(extra->'photos'->0) END,
    'photoItems',
      CASE WHEN extra->'photoItems'->0 IS NULL THEN NULL
           ELSE jsonb_build_array(extra->'photoItems'->0) END,
    'facilityRooms',
      CASE WHEN extra ? 'facilityRooms' THEN jsonb_build_object(
        'bedrooms', extra->'facilityRooms'->'bedrooms',
        'medical', jsonb_build_object('rehabRoom', extra->'facilityRooms'->'medical'->'rehabRoom')
      ) ELSE NULL END,
    'programs',
      CASE WHEN jsonb_typeof(extra->'programs') = 'array' THEN (
        SELECT jsonb_agg(jsonb_build_object('category', d.cat))
        FROM (SELECT DISTINCT (p->>'category') AS cat
              FROM jsonb_array_elements(extra->'programs') p) d
      ) ELSE NULL END,
    'tenure',
      CASE WHEN jsonb_typeof(extra->'tenure') = 'array' THEN (
        SELECT jsonb_build_array(jsonb_build_object(
          'total',  COALESCE(sum(COALESCE((t->>'total')::numeric, 0)), 0),
          'over2y', COALESCE(sum(COALESCE((t->>'over2y')::numeric, 0)), 0)))
        FROM jsonb_array_elements(extra->'tenure') t
      ) ELSE NULL END,
    'institutionInfo',
      CASE WHEN extra ? 'institutionInfo' THEN jsonb_build_object(
        'homepage',           extra->'institutionInfo'->'homepage',
        'operatingHours',     extra->'institutionInfo'->'operatingHours',
        'transport',          extra->'institutionInfo'->'transport',
        'parkingInfo',        extra->'institutionInfo'->'parkingInfo',
        'liabilityInsurance', extra->'institutionInfo'->'liabilityInsurance'
      ) ELSE NULL END,
    -- samples(프로그램 이름 3개씩)는 시설 상세에서만 쓴다. 목록 카드는 tag만 보고,
    -- 그런데도 응답의 32%(300건 70KB)를 이게 차지하고 있었다(실측 2026-08-06).
    -- ⚠️ 순서를 반드시 보존한다 — 카드가 앞 2개만 보여주는데, 이 배열은
    --    lib/programTaxonomy.ts가 "주당 횟수 많은 순"으로 정렬해 넣은 것이다.
    'programTags',
      CASE WHEN jsonb_typeof(extra->'programTags') = 'array' THEN (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'tag',     a.t->'tag',
                   'count',   a.t->'count',
                   'weekly',  a.t->'weekly',
                   'samples', '[]'::jsonb)
                 ORDER BY a.ord)
        FROM jsonb_array_elements(extra->'programTags') WITH ORDINALITY AS a(t, ord)
      ) ELSE NULL END
  ))
`);

/**
 * 검색 첫 화면이 서버에서 그릴 카드 몇 장.
 *
 * 왜: 목록이 "번들 → 하이드레이션 → 그제서야 요청" 순서라, 첫 방문은 JS가 다 뜬 뒤에야
 * 카드가 보인다. 서버가 첫 화면 분량만 들고 내려오면 그 왕복이 통째로 빠진다.
 *
 * **첫 페이지 분량(기본 30장)만** 보낸다 — 300건을 HTML에 실으면 190KB가 붙는다.
 * 클라이언트는 평소대로 300건을 따로 받아 필터·정렬에 쓰고, 도착하면 이 목록을 대체한다.
 *
 * 조건 없는 기본 목록만 만든다(검색어·필터가 있으면 서버가 그걸 알 수 없고,
 * 알아도 조합이 무한이라 캐시가 의미 없다).
 */
export async function defaultFirstPageCards(take: number): Promise<FacilityDTO[]> {
  const idRows = await prisma.facility.findMany({
    where: { dataSource: { not: "mock" } },
    orderBy: { createdAt: "asc" },
    take,
    select: { id: true },
  });
  return cardFacilitiesByIds(idRows.map((r) => r.id));
}

/**
 * 주어진 id들의 카드 페이로드를 가져온다. **호출자가 준 id 순서를 그대로 지킨다** —
 * 정렬(등록순·거리순)은 이미 앞 단계에서 정해졌고, 여기서 순서가 흐트러지면
 * 화면의 정렬이 조용히 무너진다.
 */
export async function cardFacilitiesByIds(ids: string[]): Promise<FacilityDTO[]> {
  if (ids.length === 0) return [];

  const rows = await prisma.$queryRaw<FacilityRow[]>`
    SELECT id, name, "facilityType", "dataSource", "gradeSource", grade, address,
           lat, lng, phone, "establishedYear", "sourceUpdatedAt", parking,
           ${CARD_EXTRA} AS extra
    FROM "Facility"
    WHERE id = ANY(${ids})
  `;

  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is FacilityRow => !!r)
    .map((r) => toCardFacility(rowToFacility(r)));
}
