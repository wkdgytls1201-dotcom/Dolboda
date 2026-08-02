import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rowToFacility, toCardFacility } from "@/lib/facilityRepo";

// "총 N개"에 쓰는 건수는 좌표가 있는 시설 수라 사용자 위치와 무관하다 — 유형 조합에만
// 달려 있는데도 요청마다 28,000행을 세고 있었다. 유형 조합별로 하루 캐시한다.
const countByTypes = unstable_cache(
  async (types: string[]) =>
    prisma.facility.count({
      where: {
        lat: { not: null },
        lng: { not: null },
        dataSource: { not: "mock" },
        ...(types.length > 0 && { facilityType: { in: types as never } }),
      },
    }),
  ["facility-nearby-total"],
  { revalidate: 86400 }
);

// "내 주변 시설"은 /api/facilities의 200건 제한 목록 안에서 계산하면 그 200건이
// 우연히 어느 지역에 몰려있는지에 따라 전국 어디서든 같은 결과만 나온다.
// 여기서는 좌표가 있는 전체 시설(2만여 건)을 DB에서 직접 거리순 정렬해서 진짜 최근접을 찾는다.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const limit = Math.min(Number(searchParams.get("limit")) || 6, 300);
  // 시설 유형 필터(쉼표 구분) — 시설 찾기의 거리순 정렬에서 함께 쓰인다.
  const types = (searchParams.get("type") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => /^[A-Z_]+$/.test(t));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat, lng가 필요해요." }, { status: 400 });
  }

  const typeFilter = types.length > 0 ? Prisma.sql`AND "facilityType"::text = ANY(${types})` : Prisma.empty;

  // 좌표가 있어 거리 계산이 가능한 전체 건수 (목록 위 "총 N개" 표시에 사용).
  // items와 같은 조건이어야 한다 — mock 제외를 여기만 빼먹어서 "총 N개"가 항목 수와 어긋났다.
  // 최근접 조회와 서로 기다릴 이유가 없어 같이 출발시킨다.
  const totalPromise = countByTypes(types);

  const nearest = await prisma.$queryRaw<{ id: string; distanceKm: number }[]>`
    SELECT id,
      6371 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(${lat})) * cos(radians(lat)) * cos(radians(lng) - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(lat))
        ))
      ) AS "distanceKm"
    FROM "Facility"
    WHERE lat IS NOT NULL AND lng IS NOT NULL AND "dataSource" != 'mock' ${typeFilter}
    ORDER BY "distanceKm" ASC
    LIMIT ${limit}
  `;

  const rows = await prisma.facility.findMany({ where: { id: { in: nearest.map((n) => n.id) } } });
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const distanceById = new Map(nearest.map((n) => [n.id, n.distanceKm]));

  const items = nearest
    .map((n) => rowById.get(n.id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((row) => {
      const f = rowToFacility(row);
      const base = searchParams.get("view") === "card" ? toCardFacility(f) : f;
      return { ...base, distanceKm: distanceById.get(row.id) };
    });

  return NextResponse.json({ items, total: await totalPromise });
}
