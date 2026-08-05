import { prisma } from "./prisma";
import { careRequestSummary } from "./careLocationTypes";

// 돌봄일지 계열 API(일지·빠른 알림·사진)가 공유하는 "이 사람의 돌봄 건" 찾기.
//
// 왜 한곳에 모았나: 세 라우트가 각자 같은 조회를 복붙해 두고 있었는데, 그 사본들이
// 전부 같은 결함을 갖고 있었다 — `orderBy createdAt desc`로 최신 한 건만 집는다.
// 매니저가 A(진행 중, 먼저 확정)와 B(이미 완료, 나중 확정)를 갖고 있으면 최신인 B가
// 잡혀서, 오늘 A의 일지를 쓰려던 기록이 완료된 B에 들어간다.
//
// 여러 건 지원(2026-08-06): 보호자는 진행 중 1건 제한(advisory lock)이지만 **매니저
// 쪽엔 상한이 없어** 동시에 여러 가정을 맡을 수 있고, 보호자도 지난 돌봄이 쌓이면
// 여러 건을 갖게 된다. 그래서 목록을 그대로 내려보내고 `requestId`로 고르게 한다.
// 고르지 않으면 진행 중(매칭확정/MATCHED)을 먼저, 그 안에서 최신을 쓴다.

const ACTIVE_APP_STATUSES = ["매칭확정", "돌봄완료"] as const;

const APP_INCLUDE = {
  sitterProfile: { select: { id: true, nickname: true, userId: true } },
  careRequest: true,
} as const;

export type CareContextRole = "sitter" | "guardian" | "family";

export interface CareContext {
  request: Awaited<ReturnType<typeof prisma.careRequest.findFirstOrThrow>>;
  application: {
    id: string;
    status: string;
    proposedAmount: number | null;
    proposedUnit: string | null;
    sitterProfile: { id: string; nickname: string; userId: string };
  };
  viewer: CareContextRole;
}

/** 화면의 돌봄 건 전환 칩이 쓰는 최소 정보 */
export interface CareContextOption {
  id: string;
  summary: string;
  status: string;
  ongoing: boolean;
}

function toOption(c: CareContext): CareContextOption {
  return {
    id: c.request.id,
    summary: careRequestSummary(c.request),
    status: c.request.status,
    ongoing: c.request.status === "MATCHED",
  };
}

/** 진행 중을 앞으로, 같은 등급 안에서는 최신 확정 순 */
function sortByOngoingThenRecent(list: CareContext[]): CareContext[] {
  return [...list].sort((a, b) => {
    const ao = a.request.status === "MATCHED" ? 0 : 1;
    const bo = b.request.status === "MATCHED" ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return b.request.createdAt.getTime() - a.request.createdAt.getTime();
  });
}

export async function listSitterContexts(userId: string): Promise<CareContext[]> {
  const profile = await prisma.sitterProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return [];

  const apps = await prisma.careRequestApplication.findMany({
    where: { sitterProfileId: profile.id, status: { in: [...ACTIVE_APP_STATUSES] } },
    include: APP_INCLUDE,
  });
  // 취소된 요청에 매달린 지원은 뺀다 — 취소 시 지원도 "요청취소"가 되지만,
  // 부분 실패로 어긋난 행이 남아 있어도 여기서 한 번 더 걸러진다.
  return sortByOngoingThenRecent(
    apps
      .filter((a) => a.careRequest.status !== "CANCELLED")
      .map((a) => ({ request: a.careRequest, application: a, viewer: "sitter" as const }))
  );
}

export async function listGuardianContexts(userId: string): Promise<CareContext[]> {
  const requests = await prisma.careRequest.findMany({
    where: { guardianId: userId, status: { in: ["MATCHED", "COMPLETED"] } },
    include: {
      applications: {
        where: { status: { in: [...ACTIVE_APP_STATUSES] } },
        include: { sitterProfile: { select: { id: true, nickname: true, userId: true } } },
      },
    },
  });
  return sortByOngoingThenRecent(
    requests
      .filter((r) => r.applications[0])
      .map((r) => {
        const { applications, ...request } = r;
        return { request, application: applications[0], viewer: "guardian" as const };
      })
  );
}

/**
 * 가족 열람(care-log-spec §9-5) — 보호자가 초대하고 수락한 사람의 읽기 전용 접근.
 * 보호자·매니저 컨텍스트가 둘 다 없을 때만 쓴다(당사자에겐 각자의 화면이 우선).
 */
export async function listFamilyContexts(userId: string): Promise<CareContext[]> {
  const accesses = await prisma.careLogFamilyAccess.findMany({
    where: { userId, acceptedAt: { not: null }, revokedAt: null },
    select: { careRequestId: true },
  });
  if (accesses.length === 0) return [];

  const requests = await prisma.careRequest.findMany({
    where: {
      id: { in: accesses.map((a) => a.careRequestId) },
      status: { in: ["MATCHED", "COMPLETED"] },
    },
    include: {
      applications: {
        where: { status: { in: [...ACTIVE_APP_STATUSES] } },
        include: { sitterProfile: { select: { id: true, nickname: true, userId: true } } },
      },
    },
  });
  return sortByOngoingThenRecent(
    requests
      .filter((r) => r.applications[0])
      .map((r) => {
        const { applications, ...request } = r;
        return { request, application: applications[0], viewer: "family" as const };
      })
  );
}

/** 목록에서 요청 하나를 고른다 — requestId가 없거나 목록에 없으면 기본(진행 중 우선) */
export function pickContext(list: CareContext[], requestId?: string | null): CareContext | null {
  if (list.length === 0) return null;
  if (requestId) {
    const found = list.find((c) => c.request.id === requestId);
    if (found) return found;
  }
  return list[0];
}

/**
 * 매니저 컨텍스트 단건 — 쓰기 라우트(일지 작성·빠른 알림·사진)가 쓴다.
 * requestId를 주면 그 건이 정말 이 매니저의 것인지 확인한 뒤 돌려주고,
 * 남의 건 id를 넣으면 null이 되어 403/404로 떨어진다.
 */
export async function findSitterCareContext(userId: string, requestId?: string | null) {
  const list = await listSitterContexts(userId);
  // requestId를 명시했는데 내 목록에 없으면 "기본값으로 조용히 대체"하면 안 된다 —
  // 엉뚱한 건에 기록이 들어가는 것이 바로 이 파일이 고치려던 문제다.
  if (requestId && !list.some((c) => c.request.id === requestId)) return null;
  const ctx = pickContext(list, requestId);
  if (!ctx) return null;
  return {
    ...ctx,
    /** 진행 중(MATCHED) 건 수 — 화면이 전환 칩을 띄울지 판단한다 */
    activeCount: list.filter((c) => c.request.status === "MATCHED").length,
    options: list.map(toOption),
  };
}

export { toOption as careContextOption };
