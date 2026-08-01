import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLocationType } from "@/lib/careRequestValidation";

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

  const openRequests = await prisma.careRequest.findMany({
    where,
    orderBy,
    take: 100,
    include: { applications: { where: { sitterProfileId: sitterProfile.id } } },
  });

  return NextResponse.json({
    // guardianId는 화면에서 안 쓰는데 나가고 있었다 — 보호자 식별자를 시터에게 줄 이유가 없다
    items: openRequests.map(({ applications, guardianId, ...r }) => {
      void guardianId;
      return {
        ...r,
        alreadyApplied: applications.length > 0,
        applicationId: applications[0]?.id ?? null,
      };
    }),
  });
}
