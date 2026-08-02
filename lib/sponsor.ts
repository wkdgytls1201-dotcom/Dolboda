import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { SPONSOR_SLOTS_PER_SIGUNGU } from "./businessPlans";

// 지역 스폰서 노출 조회 (서버 전용).
//
// 설계에서 가장 중요한 점: 스폰서는 **일반 목록에 섞지 않는다.**
// 별도 배열로 돌려주고, 화면은 '광고' 라벨이 붙은 분리된 자리(SponsorSlots)에 그린다.
// 일반 목록의 정렬 로직에는 손대지 않는다.
//
// 반환은 카드 전체가 아니라 링크 목록에 필요한 최소 필드다 — 노출 지면이
// 지역 SEO 페이지(서버 렌더)라, 무거운 카드 데이터·클라이언트 번들을 얹지 않는다.

export type SponsorScope = "sigungu" | "sido" | "national";

export interface SponsorFacility {
  id: string;
  name: string;
  facilityType: string;
  grade: number | null;
  address: string;
}

// regionKey는 lib/regionSeo.ts의 canonicalRegionKey()가 만드는 "시도slug 시군구"
// (예: "경남 김해시") 하나만 쓴다 — 저장(관리자 승인)과 조회(지역 페이지)가 같은 함수를 쓴다.

async function loadSponsors(scope: SponsorScope, regionKeys: string[]): Promise<SponsorFacility[]> {
  if (regionKeys.length === 0) return [];
  try {
    return await loadSponsorsUnsafe(scope, regionKeys);
  } catch (e) {
    // 스폰서는 부가 기능이다 — 테이블 미생성(db push 전)·일시 장애로 지역 페이지
    // 전체가 500이 되면 안 된다. 조용히 빈 목록으로 떨어진다.
    console.error("스폰서 조회 실패:", e);
    return [];
  }
}

async function loadSponsorsUnsafe(
  scope: SponsorScope,
  regionKeys: string[]
): Promise<SponsorFacility[]> {
  const now = new Date();
  const placements = await prisma.sponsorPlacement.findMany({
    where: {
      scope,
      regionKey: { in: regionKeys },
      active: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    // 먼저 계약한 시설이 앞 — 노출 순서를 따로 팔지 않는다
    orderBy: { startsAt: "asc" },
    take: SPONSOR_SLOTS_PER_SIGUNGU,
    select: { facilityId: true },
  });
  if (placements.length === 0) return [];

  const ids = placements.map((p) => p.facilityId);
  const rows = await prisma.facility.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, facilityType: true, grade: true, address: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ ...r, facilityType: String(r.facilityType) }));
}

/**
 * 지역 페이지에서 부른다. regionSlug는 REGION_SEO의 slug("경남"), sigungu는 "김해시".
 *
 * 캐시 5분: 계약 시작·종료가 몇 분 늦는 건 괜찮지만 하루씩 늦으면
 * "돈 냈는데 안 나온다/해지했는데 나온다"가 되어 분쟁이다.
 */
export const getSponsorsForSigungu = unstable_cache(
  async (regionSlug: string, sigungu: string) =>
    loadSponsors("sigungu", [`${regionSlug} ${sigungu}`]),
  ["sponsor-placements-sigungu"],
  { revalidate: 300 }
);

/** 남은 슬롯 수 — 관리자 화면에서 "더 팔아도 되는지" 판단에 쓴다. */
export async function remainingSlots(scope: SponsorScope, regionKey: string): Promise<number> {
  const now = new Date();
  const used = await prisma.sponsorPlacement.count({
    where: {
      scope,
      regionKey,
      active: true,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
  return Math.max(0, SPONSOR_SLOTS_PER_SIGUNGU - used);
}
