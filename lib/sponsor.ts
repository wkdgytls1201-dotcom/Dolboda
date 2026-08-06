import { unstable_cache } from "next/cache";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { SPONSOR_SLOTS_PER_SIGUNGU } from "./businessPlans";

/** 슬롯 카운트 함수들이 받는 클라이언트 — 기본은 전역 prisma, 트랜잭션 안에서
 * advisory lock을 건 뒤 재검사할 땐 tx를 넘긴다(같은 트랜잭션 스냅샷으로 봐야 한다). */
type Db = PrismaClient | Prisma.TransactionClient;

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

async function loadSponsors(
  scope: SponsorScope,
  regionKeys: string[],
): Promise<SponsorFacility[]> {
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
  regionKeys: string[],
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
    select: {
      id: true,
      name: true,
      facilityType: true,
      grade: true,
      address: true,
    },
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
  { revalidate: 300 },
);

/**
 * 남은 슬롯 수 — 관리자 화면에서 "더 팔아도 되는지" 판단에 쓴다.
 *
 * ⚠️ `active: true`로 세면 안 된다. 승인 시점의 슬롯은 **입금 대기라 active=false**로
 * 만들어지기 때문에, 그것만 세면 이미 판 자리가 "비어 있음"으로 보여 초과 판매가 된다.
 * 초과분은 노출 조회의 `take` 상한에 걸려 조용히 안 나가고, 그 시설은 **돈을 내고도
 * 노출 0**이 된다(월간 보고서에도 0으로 찍힌다).
 *
 * 자리를 비우는 것은 해지뿐이다(endsAt이 찍힌다). 일시중지는 잠깐 끄는 것이라 자리를 유지한다.
 */
export async function remainingSlots(
  scope: SponsorScope,
  regionKey: string,
  db: Db = prisma,
): Promise<number> {
  const used = await heldSlots(scope, regionKey, {}, db);
  return Math.max(0, SPONSOR_SLOTS_PER_SIGUNGU - used);
}

/**
 * 슬롯 카운트 옵션.
 * - `excludeFacilityId`: 자기 자신은 빼고 센다(재승인·활성화처럼 이미 자기 행이 있는 경우).
 * - `onlyActive`: true면 **지금 실제로 노출 중인 것만** 센다. 판매 가능 여부는 예약분까지
 *   세야 하고(false), 노출을 켜도 되는지는 실제 노출분만 세야 한다(true) — 기준이 다르다.
 */
interface SlotCountOptions {
  excludeFacilityId?: string;
  onlyActive?: boolean;
}

/** 자리를 잡고 있는 스폰서 슬롯 수(기본: 입금 대기·일시중지 포함, 해지·기간만료 제외). */
export async function heldSlots(
  scope: SponsorScope,
  regionKey: string,
  opts: SlotCountOptions = {},
  db: Db = prisma,
): Promise<number> {
  const now = new Date();
  return db.sponsorPlacement.count({
    where: {
      scope,
      regionKey,
      ...(opts.excludeFacilityId
        ? { facilityId: { not: opts.excludeFacilityId } }
        : {}),
      ...(opts.onlyActive ? { active: true } : {}),
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
}

/** 지역 배너도 같은 규칙 — 상한이 1이라 한 곳만 새어도 바로 약속이 깨진다. */
export async function heldBannerSlots(
  regionKey: string,
  opts: SlotCountOptions = {},
  db: Db = prisma,
): Promise<number> {
  const now = new Date();
  return db.facilityBanner.count({
    where: {
      regionKey,
      ...(opts.excludeFacilityId
        ? { facilityId: { not: opts.excludeFacilityId } }
        : {}),
      ...(opts.onlyActive ? { active: true } : {}),
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
}

// ---- 지역 배너 (지역 프리미엄 이상, 시·군·구당 1곳) ----
// 스폰서와 같은 regionKey 체계를 쓰지만 별도 테이블이다(lib/businessPlans.ts의
// BANNER_SLOTS_PER_SIGUNGU 참고 — 상한이 스폰서보다 훨씬 좁다).

export interface RegionBanner {
  facilityId: string;
  facilityName: string;
  imageUrl: string;
}

async function loadBannerUnsafe(
  regionKey: string,
): Promise<RegionBanner | null> {
  const now = new Date();
  const row = await prisma.facilityBanner.findFirst({
    // endsAt(해지 시각)을 함께 본다 — 스폰서와 같은 규칙이다. active만 보면
    // 해지 처리가 한 곳이라도 새는 순간 "해지했는데 광고가 계속 나간다"가 된다.
    where: {
      regionKey,
      active: true,
      imageUrl: { not: null },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!row || !row.imageUrl) return null;
  const facility = await prisma.facility.findUnique({
    where: { id: row.facilityId },
    select: { name: true },
  });
  if (!facility) return null;
  return {
    facilityId: row.facilityId,
    facilityName: facility.name,
    imageUrl: row.imageUrl,
  };
}

/** 지역 페이지에서 부른다. 계약 반영 지연을 감안해 스폰서와 같은 5분 캐시. */
export const getBannerForSigungu = unstable_cache(
  async (regionSlug: string, sigungu: string) => {
    try {
      return await loadBannerUnsafe(`${regionSlug} ${sigungu}`);
    } catch (e) {
      // 부가 기능 — 실패해도 지역 페이지 전체가 죽으면 안 된다
      console.error("배너 조회 실패:", e);
      return null;
    }
  },
  ["region-banner-sigungu"],
  { revalidate: 300 },
);
