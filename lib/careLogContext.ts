import { prisma } from "./prisma";

// 돌봄일지 계열 API(일지·빠른 알림·사진)가 공유하는 "지금 이 매니저의 돌봄 건" 찾기.
//
// 세 라우트가 각자 같은 조회를 복붙해 두고 있었는데, 그 사본들이 전부 같은 결함을
// 갖고 있었다: `orderBy createdAt desc`로 최신 한 건만 집는다. 매니저가 A(진행 중,
// 먼저 확정)와 B(이미 완료, 나중 확정)를 갖고 있으면 최신인 B가 잡혀서, 오늘 A의
// 일지를 쓰려던 기록이 완료된 B에 들어간다.
//
// 그래서 여기서는 **진행 중(매칭확정)을 완료(돌봄완료)보다 먼저** 고른다.
// 같은 등급 안에서는 최신 건이 우선이다(기존 동작 유지).
//
// ⚠️ 한 매니저가 진행 중인 돌봄을 둘 이상 가질 수 있다(보호자별로 1건 제한이라
//    매니저 쪽에는 상한이 없다). 이 앱은 아직 "진행 중인 돌봄 하나"를 전제로 화면이
//    짜여 있어서, 그 경우 activeCount로 알리기만 하고 첫 건을 쓴다 — 화면이 이 값을
//    보고 안내한다. 여러 건을 동시에 다루려면 URL에 careRequestId를 실어야 한다.

const ACTIVE_STATUSES = ["매칭확정", "돌봄완료"] as const;

export async function findSitterCareContext(userId: string) {
  const profile = await prisma.sitterProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return null;

  const apps = await prisma.careRequestApplication.findMany({
    where: { sitterProfileId: profile.id, status: { in: [...ACTIVE_STATUSES] } },
    orderBy: { createdAt: "desc" },
    include: {
      sitterProfile: { select: { id: true, nickname: true, userId: true } },
      careRequest: true,
    },
  });
  if (apps.length === 0) return null;

  // 취소된 요청에 매달린 지원은 제외한다 — 취소 시 지원 상태도 "요청취소"로 바뀌지만,
  // 과거 데이터나 부분 실패로 어긋난 행이 남아 있어도 여기서 한 번 더 걸러진다.
  const usable = apps.filter((a) => a.careRequest.status !== "CANCELLED");
  if (usable.length === 0) return null;

  const ongoing = usable.filter((a) => a.status === "매칭확정");
  const app = ongoing[0] ?? usable[0];

  return {
    request: app.careRequest,
    application: app,
    /** 진행 중(매칭확정) 건 수 — 2 이상이면 화면이 "다른 돌봄도 진행 중"임을 알린다 */
    activeCount: ongoing.length,
    viewer: "sitter" as const,
  };
}
