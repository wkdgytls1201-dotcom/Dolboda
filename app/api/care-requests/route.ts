import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLocationType, buildCareRequestData } from "@/lib/careRequestValidation";

// 지원자 정보는 보호자가 고르는 데 필요한 만큼만 내려보낸다.
// 예전엔 sitterProfile 행을 통째로 include해서 정산 계좌(bankName·bankAccountNumber·
// bankAccountHolder)까지 응답에 실려 나갔다. 화면에는 안 그렸지만 개발자도구
// 네트워크 탭에서는 그대로 보였다. lib/careRequestTypes.ts의 Applicant와 같은 모양이다.
const APPLICANT_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  // 역경매 — 매니저가 지원하며 제시한 사례비·한마디
  proposedAmount: true,
  proposedUnit: true,
  message: true,
  sitterProfile: {
    select: {
      id: true,
      nickname: true,
      experienceYears: true,
      intro: true,
      gender: true,
      ageBand: true,
      certifications: { select: { id: true, name: true } },
    },
  },
} as const;

// 보호자 본인의 가장 최근 돌봄 요청 1건(진행 중이 아니어도 최근 것 하나) — 상세/관리 화면에서 사용
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const careRequest = await prisma.careRequest.findFirst({
    where: { guardianId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      applications: { select: APPLICANT_SELECT },
      review: { select: { id: true, rating: true } },
    },
  });

  if (!careRequest) {
    return NextResponse.json({ error: "등록된 돌봄 요청이 없어요." }, { status: 404 });
  }

  // 지원자별 "돌보다 인증 실적" — 완료 건수와 보호자 후기 평점.
  // 자기 신고 경력(experienceYears)과 달리 플랫폼이 보증하는 숫자라 따로 계산해 붙인다.
  const sitterIds = careRequest.applications.map((a) => a.sitterProfile.id);
  let statsById = new Map<
    string,
    { completedCount: number; reviewCount: number; avgRating: number | null; logDayCount: number }
  >();
  if (sitterIds.length > 0) {
    const [completed, reviews, logDays] = await Promise.all([
      prisma.careRequestApplication.groupBy({
        by: ["sitterProfileId"],
        where: { sitterProfileId: { in: sitterIds }, status: "돌봄완료" },
        _count: { _all: true },
      }),
      prisma.careReview.groupBy({
        by: ["sitterProfileId"],
        where: { sitterProfileId: { in: sitterIds } },
        _count: { _all: true },
        _avg: { rating: true },
      }),
      // 돌봄일지 기록일 수 — "기록을 성실히 남기는 매니저"는 그 자체가 신뢰 신호다.
      // 원본만 센다(correctsId=null) — 하루 1원본 가드 덕에 이 수가 곧 "기록한 날 수"다.
      prisma.careLog.groupBy({
        by: ["sitterProfileId"],
        where: { sitterProfileId: { in: sitterIds }, correctsId: null },
        _count: { _all: true },
      }),
    ]);
    statsById = new Map(
      sitterIds.map((id) => {
        const c = completed.find((x) => x.sitterProfileId === id);
        const r = reviews.find((x) => x.sitterProfileId === id);
        const l = logDays.find((x) => x.sitterProfileId === id);
        return [
          id,
          {
            completedCount: c?._count._all ?? 0,
            reviewCount: r?._count._all ?? 0,
            avgRating: r?._avg.rating != null ? Math.round(r._avg.rating * 10) / 10 : null,
            logDayCount: l?._count._all ?? 0,
          },
        ];
      })
    );
  }

  return NextResponse.json({
    ...careRequest,
    applications: careRequest.applications.map((a) => ({
      ...a,
      stats: statsById.get(a.sitterProfile.id),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const { locationType, region, startDate, endDate } = body as {
    locationType?: string;
    region?: string;
    startDate?: string;
    endDate?: string;
  };

  const type = parseLocationType(locationType) ?? "HOSPITAL";
  if (!region || !startDate || !endDate) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: "종료일이 시작일보다 빨라요." }, { status: 400 });
  }

  const fields = buildCareRequestData(body, false);

  // 유형별 필수값 — 병원 간병은 거동 수준, 가사 돌봄은 집안일 1개 이상.
  if (type === "HOSPITAL" && !fields.mobilityLevel) {
    return NextResponse.json({ error: "거동 수준을 선택해주세요." }, { status: 400 });
  }
  if (type === "HOUSEKEEPING" && (fields.householdTasks as string[]).length === 0) {
    return NextResponse.json({ error: "필요한 집안일을 1개 이상 선택해주세요." }, { status: 400 });
  }

  // "진행 중인 요청은 1건" 확인과 생성을 한 트랜잭션에서, 보호자별 자문 잠금(advisory
  // xact lock)으로 줄 세워 처리한다. 예전엔 조회→생성 사이에 틈이 있어 이중 클릭·중복
  // 탭이 거의 동시에 POST하면 둘 다 "없음"을 보고 지나가 OPEN 요청이 2건 생길 수 있었다.
  // 부분 유니크 인덱스가 아니라 잠금으로 막는 이유: 이 프로젝트는 마이그레이션 없이
  // prisma db push로 스키마를 맞추는데, 스키마 파일에 적을 수 없는 수동 인덱스는 다음
  // db push 때 소리 없이 사라질 수 있다. 잠금 키는 보호자 id 해시라 다른 보호자끼리는
  // 서로 기다리지 않고, 트랜잭션이 끝나면 자동 해제된다.
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.user.id}))`;

    const existing = await tx.careRequest.findFirst({
      where: { guardianId: session.user.id, status: { in: ["OPEN", "MATCHED"] } },
      select: { id: true },
    });
    if (existing) return { duplicateId: existing.id, careRequest: null };

    // 등록 직후 상세 화면이 바로 뜰 수 있게 applications(빈 배열)까지 포함해 돌려준다.
    const careRequest = await tx.careRequest.create({
      include: {
        applications: { select: APPLICANT_SELECT },
      },
      data: {
        ...fields,
        guardianId: session.user.id,
        locationType: type,
        region,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      } as never,
    });
    return { duplicateId: null, careRequest };
  });

  if (result.duplicateId) {
    return NextResponse.json(
      { error: "이미 진행 중인 돌봄 요청이 있어요.", careRequestId: result.duplicateId },
      { status: 409 }
    );
  }

  return NextResponse.json(result.careRequest, { status: 201 });
}
