import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLocationType } from "@/lib/careRequestValidation";
import { isAdminUser } from "@/lib/admin";

// 아직 열려있는 돌봄 요청 목록. 원래는 시터의 활동 가능 지역과 겹치는 것만 보여줬는데,
// 아직 등록된 돌봄 요청 자체가 많지 않아 지역을 좁게 등록한 시터에게는 화면이 통째로
// 비어 보이는 문제가 있었다. 일단은 전국 단위로 보여주고, 요청이 충분히 쌓이면 다시
// 지역 필터를 되살릴 것.
// 정렬·필터는 서버에서 처리한다(시터가 조건에 맞는 일자리를 빨리 찾도록).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const sitterProfile = await prisma.sitterProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!sitterProfile) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const type = parseLocationType(searchParams.get("type"));
  const sort = searchParams.get("sort") ?? "recent";
  const startFrom = searchParams.get("startFrom");
  const genderPref = searchParams.get("genderPref");
  const hideClosed = searchParams.get("hideClosed") === "true";

  const where: Prisma.CareRequestWhereInput = {
    status: "OPEN",
    // 내가 보호자로 올린 요청은 일자리 목록에서 뺀다.
    // 한 계정이 보호자이자 매니저일 수 있어(마이페이지 역할 전환) 그냥 두면 자기 글이
    // "새 일자리"에 뜨고 자기 글에 지원까지 된다. 실제로 그렇게 지원된 데이터가 나왔다.
    // 지원 자체는 API에서도 막지만(care-request-applications POST), 목록에서 안 보이게
    // 해야 애초에 그 상황이 생기지 않는다.
    //
    // 운영자 계정만 예외 — 계정 하나로 돌봄 흐름 전체를 시험할 수 있어야 해서
    // 자기 글도 목록에 보인다(지원 API의 예외와 같은 이유).
    ...(isAdminUser(session.user.id, session.user.email)
      ? {}
      : { guardianId: { not: session.user.id } }),
    ...(type && { locationType: type }),
    // "시작일이 지난 공고 제외" — 이미 시작한 돌봄은 사실상 마감된 것으로 본다.
    ...(hideClosed && { startDate: { gte: new Date() } }),
    ...(startFrom && !hideClosed && { startDate: { gte: new Date(startFrom) } }),
    // 성별 조건이 맞지 않는 공고는 지원해도 소용없으니 걸러준다.
    ...(genderPref && { sitterGenderPref: { in: ["무관", genderPref] } }),
  };

  // 마이페이지 대시보드는 "새 일자리 N건" 배지 숫자 하나만 필요하다.
  // 예전엔 그것 때문에 공고 100건을 통째로 받아서 items.length를 셌다.
  if (searchParams.get("count") === "1") {
    return NextResponse.json({ count: await prisma.careRequest.count({ where }) });
  }

  const orderBy: Prisma.CareRequestOrderByWithRelationInput[] =
    sort === "startSoon"
      ? [{ startDate: "asc" }]
      : sort === "payHigh"
      ? [{ budgetAmount: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  // 화면(JobCard·ApplyConfirmSheet)이 쓰는 필드만 select한다 — 예전엔 전 컬럼을 통짜로
  // 내려 공고 100건이면 안 쓰는 필드(요청 메모·특별 요청·타임스탬프류)까지 실려 나갔다.
  //
  // guardianId·recipientName은 아예 조회하지 않는다 — 보호자 식별자와 돌봄 받으실 분의
  // 성함을 아직 매칭되지도 않은 매니저 전원에게 줄 이유가 없다(2026-08-04에 응답에서
  // 뺐고, 이제 select 단계에서 배제). 지원 여부를 정하는 데 필요한 건 연령대·성별·
  // 체중대·업무 범위이지 이름이 아니다. 매칭 확정 뒤에는 돌봄 확인서에서 정상적으로
  // 보인다(그때는 알아야 한다).
  const openRequests = await prisma.careRequest.findMany({
    where,
    orderBy,
    take: 100,
    select: {
      id: true,
      locationType: true,
      region: true,
      locationNote: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      roundTheClock: true,
      recipientGender: true,
      recipientAgeBand: true,
      recipientWeightBand: true,
      situation: true,
      mobilityLevel: true,
      mealAssistLevel: true,
      toiletAssistLevel: true,
      conditions: true,
      householdTasks: true,
      visitsPerWeek: true,
      visitHours: true,
      sitterGenderPref: true,
      budgetAmount: true,
      budgetUnit: true,
      applications: { where: { sitterProfileId: sitterProfile.id }, select: { id: true } },
    },
  });

  return NextResponse.json({
    items: openRequests.map(({ applications, ...r }) => ({
      ...r,
      alreadyApplied: applications.length > 0,
      applicationId: applications[0]?.id ?? null,
    })),
  });
}
