import { NextResponse } from "next/server";
import { Prisma, FacilityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rowToFacility, toCardFacility } from "@/lib/facilityRepo";
import { cardFacilitiesByIds } from "@/lib/facilityCardQuery";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

// 22,000건 넘는 전국 데이터를 매번 통째로 내려주면 응답이 20MB에 달해 브라우저가 멈춘다.
// q(이름/주소 검색)나 type으로 서버에서 먼저 좁히고, limit으로 상한을 둔다.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type");
  const ids = searchParams.get("ids");
  const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);

  // 시설 데이터는 공공데이터 갱신 스크립트가 돌 때만 바뀐다(하루 단위) — 개인화도 없다.
  // CDN(s-maxage)에 1시간 캐시해두면 같은 검색 조합의 반복 방문이 DB를 다시 훑지 않는다.
  const CACHE_HEADERS = {
    "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  };

  // ids가 있으면 특정 시설들을 정확히 지정해서 가져오는 것 — limit/필터 무시하고 그대로 반환
  // (비교하기·찜한시설처럼 기본 200건 안에 없을 수도 있는 특정 시설을 조회할 때 씀)
  // view=card는 여기서도 통한다 — 카드만 그리는 화면(홈 최근 본 시설)이 상세용 전체
  // 페이로드를 받을 이유가 없다. 비교함은 표에 전체 필드가 필요해 기본(전체)을 유지.
  const cardView = searchParams.get("view") === "card";

  if (ids) {
    const idList = ids.split(",").filter(Boolean);
    if (cardView) {
      const items = await cardFacilitiesByIds(idList);
      return NextResponse.json({ items, total: items.length }, { headers: CACHE_HEADERS });
    }
    const rows = await prisma.facility.findMany({ where: { id: { in: idList } } });
    const mapped = rows.map(rowToFacility);
    return NextResponse.json({ items: mapped, total: rows.length }, { headers: CACHE_HEADERS });
  }

  // 데모용 시설(dataSource=mock 10건)은 공개 목록에 섞이면 안 된다 — 실제로 없는 시설이
  // 검색·추천에 노출되면 신뢰 문제가 되고, 상세 URL이 색인되면 SEO에도 해가 된다.
  const where: Prisma.FacilityWhereInput = { dataSource: { not: "mock" } };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }
  if (type) {
    where.facilityType = { in: type.split(",") as FacilityType[] };
  }
  // 프로그램 태그 — 클라이언트에서 걸러내면 앞에서 받아온 300건 안에서만 찾게 돼서,
  // 원예처럼 전국에 300여 곳뿐인 태그는 결과가 비어버린다. 전체를 대상으로 서버에서 거른다.
  const programTags = searchParams.get("programTags")?.split(",").filter(Boolean);
  if (programTags?.length) {
    where.AND = programTags.map((tag) => ({
      extra: { path: ["programTags"], array_contains: [{ tag }] },
    })) as Prisma.FacilityWhereInput[];
  }

  // 목록 화면은 카드에 쓰는 몇 개 필드만 필요하다. 그래서 두 단계로 나눈다:
  // ① 필터·정렬은 Prisma로 그대로 두되 **id만** 받고(전송 7KB), ② 그 id들의 카드
  // 페이로드를 SQL에서 미리 추려 받는다(lib/facilityCardQuery.ts).
  //
  // 예전엔 한 번에 전체 컬럼을 받아 Node에서 버렸다 — 300건에 DB→서버 1,628KB·356ms였고,
  // 그 대부분이 카드가 안 쓰는 사진 목록·프로그램 원본·근속 상세였다(실측 2026-08-06).
  if (cardView) {
    const [idRows, total] = await Promise.all([
      prisma.facility.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: limit,
        select: { id: true },
      }),
      prisma.facility.count({ where }),
    ]);
    const items = await cardFacilitiesByIds(idRows.map((r) => r.id));
    return NextResponse.json({ items, total }, { headers: CACHE_HEADERS });
  }

  const [rows, total] = await Promise.all([
    prisma.facility.findMany({ where, orderBy: { createdAt: "asc" }, take: limit }),
    prisma.facility.count({ where }),
  ]);

  return NextResponse.json(
    { items: rows.map(rowToFacility), total },
    { headers: CACHE_HEADERS }
  );
}
