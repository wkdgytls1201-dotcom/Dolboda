import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 마이페이지 대시보드 한 번에 받기.
//
// 예전엔 대시보드가 /api/care-requests, /api/consult/mine,
// /api/care-request-applications/mine, /api/care-requests/open?count=1을 각각 불렀다.
// 페이로드는 다 합쳐 3KB도 안 되는데 왕복마다 1.3~2.6초가 걸렸다(실측) — 서버리스
// 함수가 각자 깨어나고 각자 세션을 검사하고 각자 DB에 붙기 때문이다.
// 한 번의 왕복 안에서 세션 검사 1회 + 쿼리 병렬 실행으로 바꾼다.
//
// 화면이 실제로 쓰는 것만 내려준다(개수·상태 위주) — 목록 원본이 필요한 화면은
// 각자의 전용 API를 그대로 쓴다.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const userId = session.user.id;

  // ⚠️ 예전엔 매니저 여부(sitterProfile)를 **먼저 await한 뒤** 나머지를 병렬로 돌렸다.
  // DB가 원격(Supabase 서울 풀러)이라 그 한 번이 통째로 직렬 왕복이 되어 응답이 그만큼
  // 늦어졌다. 매니저 지원 내역은 관계 필터(sitterProfile: { userId })로 id 없이 바로
  // 조회할 수 있고, 새 일자리 수는 애초에 매니저 여부와 무관한 집계다 —
  // 그래서 다섯 쿼리를 전부 한 번에 띄운다(총 시간 = 합이 아니라 가장 느린 하나).
  //
  // 매니저가 아닌 사용자는 쿼리 두 개가 헛돌지만, 둘 다 인덱스로 즉시 끝나고 병렬이라
  // 체감 시간이 늘지 않는다. 직렬 왕복 하나를 없애는 편이 확실히 이득이다.
  const [sitterProfile, careRequest, consults, applications, openJobs] = await Promise.all([
    prisma.sitterProfile.findUnique({ where: { userId }, select: { id: true } }),
    // 보호자: 진행 중인 돌봄 요청 (카드에 쓰는 필드만)
    prisma.careRequest.findFirst({
      where: { guardianId: userId, status: { in: ["OPEN", "MATCHED"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        region: true,
        startDate: true,
        endDate: true,
        applications: { select: { status: true } },
      },
    }),
    // 보호자: 상담 신청 — 카드는 "입소 미결정 몇 건"만 쓰므로 상태만
    prisma.consultRequest.findMany({
      where: { userId },
      select: { status: true },
      take: 50,
    }),
    // 매니저: 지원 현황 — 지원/매칭/완료 개수 계산용 상태만.
    // 관계 필터라 sitterProfile.id를 먼저 받아올 필요가 없다(매니저가 아니면 빈 배열).
    prisma.careRequestApplication.findMany({
      where: { sitterProfile: { userId } },
      select: { status: true },
    }),
    // 매니저: 새 일자리 배지 숫자
    prisma.careRequest.count({ where: { status: "OPEN" } }),
  ]);

  return NextResponse.json({
    careRequest: careRequest && {
      id: careRequest.id,
      status: careRequest.status,
      region: careRequest.region,
      // 화면이 YYYY-MM-DD로 잘라 쓰므로 ISO 문자열 그대로 보낸다
      startDate: careRequest.startDate.toISOString(),
      endDate: careRequest.endDate.toISOString(),
      applications: careRequest.applications,
    },
    consults: consults.map((c) => ({ status: c.status })),
    isSitter: Boolean(sitterProfile),
    // 매니저가 아니면 화면에서 안 쓰는 값이라 굳이 내려보내지 않는다(응답도 그만큼 작아진다)
    applications: sitterProfile ? applications.map((a) => ({ status: a.status })) : [],
    openJobs: sitterProfile ? openJobs : 0,
  });
}
