import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { REGION_SEO } from "@/lib/regionSeo";

// localStorage에 있던 찜·알림설정을 서버로 옮긴다. 로그인 직후 한 번만 호출된다.
//
// ⚠️ **병합만 하고 삭제는 하지 않는다.**
// 로컬을 정답으로 삼아 동기화하면, 새 기기에서 처음 로그인했을 때 빈 localStorage가
// 서버에 쌓인 찜 목록을 통째로 지운다. 되돌릴 수 없는 손실이라 "합치기만" 한다.
// (docs/favorite-alert-spec.md §3)

const MAX_ITEMS = 300;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const userId = session.user.id;

  const body = (await req.json().catch(() => ({}))) as {
    favoriteIds?: unknown;
    prefs?: unknown;
    regions?: unknown;
  };

  const favoriteIds = Array.isArray(body.favoriteIds)
    ? [...new Set(body.favoriteIds.filter((v): v is string => typeof v === "string" && !!v))].slice(
        0,
        MAX_ITEMS
      )
    : [];
  const regions = Array.isArray(body.regions)
    ? [...new Set(body.regions.filter((v): v is string => typeof v === "string"))]
        .filter((r) => REGION_SEO.some((x) => x.slug === r))
        .slice(0, 30)
    : [];

  // prefs: { [facilityId]: { vacancy: boolean, gradeChange: boolean } }
  const prefs =
    body.prefs && typeof body.prefs === "object" && !Array.isArray(body.prefs)
      ? (body.prefs as Record<string, { vacancy?: unknown; gradeChange?: unknown }>)
      : {};

  // 알림만 켜져 있고 찜 목록엔 없는 시설도 함께 가져온다(옛 데이터에 그런 경우가 있다)
  const allIds = [...new Set([...favoriteIds, ...Object.keys(prefs)])].slice(0, MAX_ITEMS);

  if (allIds.length === 0 && regions.length === 0) {
    return NextResponse.json({ imported: 0, regions: 0 });
  }

  // 실재하는 시설만 남긴다 — 없는 id가 쌓이면 나중에 알림 발송 대상을 못 찾는다
  const existing = await prisma.facility.findMany({
    where: { id: { in: allIds } },
    select: { id: true },
  });
  const validIds = new Set(existing.map((f) => f.id));

  let imported = 0;
  for (const facilityId of allIds) {
    if (!validIds.has(facilityId)) continue;
    const p = prefs[facilityId];
    const vacancyAlert = p?.vacancy === true;
    const gradeChangeAlert = p?.gradeChange === true;

    // update를 비워두는 게 핵심 — 이미 서버에 있으면 손대지 않는다.
    // 다른 기기에서 켜둔 알림 설정을 이 기기의 값으로 덮어쓰지 않기 위함이다.
    await prisma.facilityFavorite.upsert({
      where: { userId_facilityId: { userId, facilityId } },
      create: { userId, facilityId, vacancyAlert, gradeChangeAlert },
      update: {},
    });
    imported++;
  }

  for (const region of regions) {
    await prisma.regionInterest.upsert({
      where: { userId_region: { userId, region } },
      create: { userId, region },
      update: {},
    });
  }

  return NextResponse.json({ imported, regions: regions.length });
}
