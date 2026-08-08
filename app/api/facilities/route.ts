import { NextResponse } from "next/server";
import { Prisma, FacilityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rowToFacility, toCardFacility } from "@/lib/facilityRepo";
import { cardFacilitiesByIds } from "@/lib/facilityCardQuery";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

// ids= 한 번에 조회할 수 있는 시설 수 상한.
//
// 상한이 없던 시절, 이 경로는 limit을 통째로 무시하고 넘긴 id를 전부 돌려줬다.
// 실측(2026-08-08): id 400개 → **2.05MB를 0.27초**에. 이 응답은 카드용 축약본이 아니라
// 비급여 비용·인력·근속·프로그램·정원/대기·좌표·사진 URL이 전부 담긴 전체 레코드라
// 시설당 약 6KB다. 전국 28,000여 곳이면 175MB이고, 400개씩이면 72번이면 끝난다.
// 우리가 돈과 시간을 들여 쌓은 자리 추이·근속·사진을 통째로 퍼가는 통로였다.
//
// 200이면 실제 화면은 전부 여유롭게 들어간다(비교함 3, 최근 본 시설 12, 찜은 상한이
// 없지만 그 이상 담는 사용자는 useFacilitiesByIds가 200개씩 나눠 보낸다).
const MAX_IDS = 200;

// 22,000건 넘는 전국 데이터를 매번 통째로 내려주면 응답이 20MB에 달해 브라우저가 멈춘다.
// q(이름/주소 검색)나 type으로 서버에서 먼저 좁히고, limit으로 상한을 둔다.
export async function GET(req: Request) {
  // 대량 수집 방어. 이 API는 CDN에 1시간 캐시되므로(아래 CACHE_HEADERS) 같은 조건을
  // 반복해 보는 정상 사용자는 대부분 캐시에서 끝나 여기까지 오지도 않는다.
  // 반대로 매번 새로운 id 조합·검색어를 던지는 스크래퍼는 전부 캐시 미스라 원본에 닿는다
  // — 즉 이 상한은 실사용자에게는 사실상 보이지 않고 수집기에만 걸린다.
  // 화면 하나가 여러 조회를 함께 던지는 경우(홈: 목록+최근본+근처)를 감안해 넉넉히 잡았다.
  const limited = rateLimit(`facilities:${clientIp(req)}`, 120, 60_000);
  if (!limited.ok) {
    return tooManyRequests("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", limited.retryAfter);
  }

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
    const idList = ids.split(",").filter(Boolean).slice(0, MAX_IDS);
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
