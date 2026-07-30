import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLocationType } from "@/lib/careRequestValidation";

// 로그인한 모심시터의 활동 가능 지역과 겹치는, 아직 열려있는 돌봄 요청 목록.
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
    return NextResponse.json({ error: "등록된 모심시터 프로필이 없어요." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const type = parseLocationType(searchParams.get("type"));
  const sort = searchParams.get("sort") ?? "recent";
  const startFrom = searchParams.get("startFrom");
  const genderPref = searchParams.get("genderPref");
  const hideClosed = searchParams.get("hideClosed") === "true";

  const where: Prisma.CareRequestWhereInput = {
    status: "OPEN",
    region: { in: sitterProfile.regions },
    ...(type && { locationType: type }),
    // "시작일이 지난 공고 제외" — 이미 시작한 돌봄은 사실상 마감된 것으로 본다.
    ...(hideClosed && { startDate: { gte: new Date() } }),
    ...(startFrom && !hideClosed && { startDate: { gte: new Date(startFrom) } }),
    // 성별 조건이 맞지 않는 공고는 지원해도 소용없으니 걸러준다.
    ...(genderPref && { sitterGenderPref: { in: ["무관", genderPref] } }),
  };

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
    items: openRequests.map(({ applications, ...r }) => ({
      ...r,
      alreadyApplied: applications.length > 0,
      applicationId: applications[0]?.id ?? null,
    })),
  });
}
