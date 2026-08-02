import { auth } from "@/auth";
import { prisma } from "./prisma";
import { findPlan, type BusinessPlan } from "./businessPlans";

// 시설 소유권·구독 조회 (서버 전용).
//
// "이 사람이 이 시설을 고칠 수 있는가"의 판단은 전부 여기를 지난다.
// 화면에서 버튼을 숨기는 것만으로는 막히지 않는다는 규칙을 그대로 따른다.

export interface OwnedFacility {
  facilityId: string;
  facilityName: string;
  managerName: string;
  /** 활성 구독의 plan (없으면 "free") */
  plan: string;
}

/** 로그인한 사용자가 소유(인증)한 시설 목록. 없으면 빈 배열. */
export async function myFacilities(): Promise<OwnedFacility[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  // 테이블 미생성(db push 전)·일시 장애가 콘솔 진입 자체를 500으로 만들지 않게 한다 —
  // 이 경우 "연결된 시설 없음" 안내가 뜨는 쪽이 맞다.
  const owners = await prisma.facilityOwner
    .findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
    .catch(() => []);
  if (owners.length === 0) return [];

  const ids = owners.map((o) => o.facilityId);
  const [facilities, subs] = await Promise.all([
    prisma.facility.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    activeSubscriptionsFor(ids),
  ]);
  const nameById = new Map(facilities.map((f) => [f.id, f.name]));

  return owners.map((o) => ({
    facilityId: o.facilityId,
    // 시설이 재적재로 사라졌을 수도 있다 — 그래도 콘솔 자체는 떠야 한다
    facilityName: nameById.get(o.facilityId) ?? "(시설 정보를 찾을 수 없어요)",
    managerName: o.managerName,
    plan: subs.get(o.facilityId) ?? "free",
  }));
}

/**
 * 특정 시설의 소유자인지 확인한다. 아니면 null.
 * 시설 정보를 바꾸는 API는 반드시 이 함수를 먼저 통과시킬 것.
 */
export async function requireFacilityOwner(
  facilityId: string
): Promise<{ userId: string } | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !facilityId) return null;
  const owner = await prisma.facilityOwner.findUnique({
    where: { facilityId_userId: { facilityId, userId } },
    select: { id: true },
  });
  return owner ? { userId } : null;
}

/** 시설 id들의 현재 활성 구독 plan을 뽑는다. 여러 개면 가장 상위 상품이 이긴다. */
export async function activeSubscriptionsFor(
  facilityIds: string[]
): Promise<Map<string, string>> {
  if (facilityIds.length === 0) return new Map();
  const now = new Date();
  const rows = await prisma.facilitySubscription.findMany({
    where: {
      facilityId: { in: facilityIds },
      status: "active",
      startedAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    select: { facilityId: true, plan: true },
  });

  // 같은 시설에 여러 구독이 있으면 더 비싼(=상위) 상품을 쓴다
  const best = new Map<string, string>();
  for (const row of rows) {
    const cur = best.get(row.facilityId);
    if (!cur || planRank(row.plan) > planRank(cur)) best.set(row.facilityId, row.plan);
  }
  return best;
}

function planRank(id: string): number {
  return findPlan(id)?.monthly ?? 0;
}

/** 구독 plan이 주는 기능 상한. 화면·API가 같은 값을 본다. */
export interface PlanCapability {
  plan: BusinessPlan | undefined;
  /** 올릴 수 있는 사진 수 */
  photoLimit: number;
  canPostNews: boolean;
  canUseVideo: boolean;
  hasStats: boolean;
  hasReport: boolean;
}

export function capabilityOf(planId: string): PlanCapability {
  const plan = findPlan(planId);
  // 무료도 사진 몇 장은 올릴 수 있어야 페이지가 빈 껍데기가 되지 않는다.
  // 유료로 넘어가는 이유가 "아예 못 한다"가 아니라 "더 많이·더 잘"이어야 한다.
  const paid = planId !== "free";
  const premium = planId === "premium" || planId === "silvertown";
  return {
    plan,
    photoLimit: planId === "free" ? 5 : 30,
    canPostNews: paid,
    canUseVideo: paid,
    hasStats: paid,
    hasReport: premium,
  };
}
