import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rowToFacility } from "@/lib/facilityRepo";

// "내 주변 시설"은 /api/facilities의 200건 제한 목록 안에서 계산하면 그 200건이
// 우연히 어느 지역에 몰려있는지에 따라 전국 어디서든 같은 결과만 나온다.
// 여기서는 좌표가 있는 전체 시설(2만여 건)을 DB에서 직접 거리순 정렬해서 진짜 최근접을 찾는다.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const limit = Math.min(Number(searchParams.get("limit")) || 6, 50);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat, lng가 필요해요." }, { status: 400 });
  }

  const nearest = await prisma.$queryRaw<{ id: string; distanceKm: number }[]>`
    SELECT id,
      6371 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(${lat})) * cos(radians(lat)) * cos(radians(lng) - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(lat))
        ))
      ) AS "distanceKm"
    FROM "Facility"
    WHERE lat IS NOT NULL AND lng IS NOT NULL
    ORDER BY "distanceKm" ASC
    LIMIT ${limit}
  `;

  const rows = await prisma.facility.findMany({ where: { id: { in: nearest.map((n) => n.id) } } });
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const distanceById = new Map(nearest.map((n) => [n.id, n.distanceKm]));

  const items = nearest
    .map((n) => rowById.get(n.id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((row) => ({ ...rowToFacility(row), distanceKm: distanceById.get(row.id) }));

  return NextResponse.json({ items });
}
