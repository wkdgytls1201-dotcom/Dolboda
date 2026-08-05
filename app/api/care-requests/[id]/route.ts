import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLocationType, buildCareRequestData } from "@/lib/careRequestValidation";
import { resend, careCompletedEmailHtml, requestCancelledEmailHtml } from "@/lib/resend";
import { SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";
import { careRequestSummary } from "@/lib/careLocationTypes";
import { findOtherOpenJobSummaries } from "@/lib/otherOpenJobs";

async function getOwnedRequest(id: string, userId: string) {
  const careRequest = await prisma.careRequest.findUnique({ where: { id } });
  if (!careRequest || careRequest.guardianId !== userId) return null;
  return careRequest;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const existing = await getOwnedRequest(params.id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "수정할 수 없어요." }, { status: 404 });
  }

  const body = (await req.json()) as Record<string, unknown>;

  // 돌봄이 끝났을 때 보호자가 완료 처리 — 시터의 "완료된 돌봄" 탭에 쌓인다.
  if (body.action === "complete") {
    // 매칭된 건만 완료할 수 있다. 가드가 없으면 아직 지원자도 없는 OPEN 요청이나
    // 이미 취소·완료된 요청까지 완료 처리돼(completedAt이 덮어써진다) 매니저 실적이
    // 실제와 어긋난다.
    if (existing.status !== "MATCHED") {
      return NextResponse.json(
        { error: "매칭이 확정된 돌봄만 완료 처리할 수 있어요." },
        { status: 409 }
      );
    }
    // 완료 처리로 상태가 바뀌기 전에 "누구에게 완료 소식을 알릴지" 미리 알아둔다 —
    // updateMany 뒤에는 그 매니저의 지원 status가 이미 "돌봄완료"로 바뀌어 있어서
    // "매칭확정"으로 찾을 수 없다.
    const matchedSitter = await prisma.careRequestApplication.findFirst({
      where: { careRequestId: params.id, status: "매칭확정" },
      select: { sitterProfile: { select: { user: { select: { id: true, email: true } } } } },
    });

    const [completed] = await prisma.$transaction([
      prisma.careRequest.update({
        where: { id: params.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
      prisma.careRequestApplication.updateMany({
        where: { careRequestId: params.id, status: "매칭확정" },
        data: { status: "돌봄완료" },
      }),
    ]);

    // 메일은 완료 처리 뒤에 보낸다 — 실패해도 완료 처리 자체는 이미 끝난 상태.
    if (resend && matchedSitter?.sitterProfile.user.email) {
      const pref = await prisma.sitterNotificationPref.findUnique({
        where: { userId: matchedSitter.sitterProfile.user.id },
        select: { matchUpdate: true },
      });
      if (pref?.matchUpdate ?? true) {
        await resend.emails
          .send({
            from: `${SITE_NAME} <${MAIL_FROM}>`,
            to: matchedSitter.sitterProfile.user.email,
            subject: `[${SITE_NAME}] 돌봄이 완료 처리됐어요`,
            html: careCompletedEmailHtml({ requestSummary: careRequestSummary(existing) }),
          })
          .catch(() => {});
      }
    }

    return NextResponse.json(completed);
  }

  // 수정은 아직 지원자를 받는 중일 때만 — 확정된 뒤에 조건이 바뀌면 매니저가 동의한
  // 내용과 실제가 달라지고, 합의서에 서명까지 했다면 더 곤란해진다.
  if (existing.status !== "OPEN") {
    return NextResponse.json(
      { error: "매칭이 확정된 뒤에는 요청을 수정할 수 없어요." },
      { status: 409 }
    );
  }

  const { locationType, region, startDate, endDate } = body as Partial<{
    locationType: string;
    region: string;
    startDate: string;
    endDate: string;
  }>;

  const parsedType = parseLocationType(locationType);
  const fields = buildCareRequestData(body, true);

  // 수정 후의 유형 기준으로 유형별 필수값을 다시 검증한다.
  const nextType = parsedType ?? existing.locationType;
  const nextMobility =
    "mobilityLevel" in fields ? (fields.mobilityLevel as string | null) : existing.mobilityLevel;
  const nextTasks =
    "householdTasks" in fields ? (fields.householdTasks as string[]) : existing.householdTasks;
  if (nextType === "HOSPITAL" && !nextMobility) {
    return NextResponse.json({ error: "거동 수준을 선택해주세요." }, { status: 400 });
  }
  if (nextType === "HOUSEKEEPING" && nextTasks.length === 0) {
    return NextResponse.json({ error: "필요한 집안일을 1개 이상 선택해주세요." }, { status: 400 });
  }

  // 날짜 역전 검증 — 등록(POST)에는 있는데 수정에는 빠져 있었다. 한쪽 날짜만 고치면
  // (예: 시작일만 뒤로) 종료일이 시작일보다 앞서는 요청이 저장될 수 있었다.
  const nextStart = startDate !== undefined ? new Date(startDate) : existing.startDate;
  const nextEnd = endDate !== undefined ? new Date(endDate) : existing.endDate;
  if (nextEnd < nextStart) {
    return NextResponse.json({ error: "종료일이 시작일보다 빨라요." }, { status: 400 });
  }

  const careRequest = await prisma.careRequest.update({
    where: { id: params.id },
    data: {
      ...fields,
      ...(parsedType !== null && { locationType: parsedType }),
      ...(region !== undefined && { region }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
    } as never,
  });

  return NextResponse.json(careRequest);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const existing = await getOwnedRequest(params.id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "취소할 수 없어요." }, { status: 404 });
  }
  // 이미 끝났거나 취소된 건을 다시 취소하지 않는다 — 완료된 돌봄이 취소로 뒤집히면
  // 매니저 실적이 사라진다.
  if (existing.status !== "OPEN" && existing.status !== "MATCHED") {
    return NextResponse.json({ error: "이미 처리된 요청이에요." }, { status: 409 });
  }

  // 취소 알림(§3-13) 대상을 트랜잭션 "전에" 미리 알아둔다 — updateMany는 몇 건이
  // 바뀌었는지만 알려주고 "누가"인지는 안 알려준다(§3-9의 미선정과 같은 요령).
  const toNotify = await prisma.careRequestApplication.findMany({
    where: { careRequestId: params.id, status: { in: ["지원완료", "매칭확정"] } },
    select: { sitterProfile: { select: { user: { select: { id: true, email: true } } } } },
  });

  const [careRequest] = await prisma.$transaction([
    prisma.careRequest.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    }),
    // ★ 지원자들의 상태도 함께 정리한다. 예전에는 요청만 취소하고 지원은 그대로 둬서,
    //   매니저 화면에는 "지원완료"·"매칭확정"이 계속 남아 답을 기다리는 것처럼 보였다.
    //   무소식으로 방치하는 것이 매니저 이탈의 가장 큰 원인이라, 확정 때 미선정을
    //   알려주는 것과 같은 이유로 취소도 알려준다.
    prisma.careRequestApplication.updateMany({
      where: {
        careRequestId: params.id,
        status: { in: ["지원완료", "매칭확정"] },
      },
      data: { status: "요청취소" },
    }),
  ]);

  // 취소 메일(§3-13) — 상태 정리는 이미 끝났고, 발송 실패가 취소를 되돌리면 안 된다.
  // 화면에만 남기면 매니저가 앱을 열기 전까지 하염없이 기다린다 — 미선정(§3-10)과
  // 같은 무게의 소식이라 같은 방식(matchUpdate 설정 존중, 사람별 발송)으로 보낸다.
  if (resend && toNotify.length > 0) {
    const summary = careRequestSummary(existing);
    // 미선정 메일과 같은 이유로, 같은 지역·유형의 다른 OPEN 공고를 동봉한다.
    const otherJobs = await findOtherOpenJobSummaries(
      params.id,
      existing.region,
      existing.locationType
    );
    for (const t of toNotify) {
      const { id: userId, email } = t.sitterProfile.user;
      if (!email) continue;
      const pref = await prisma.sitterNotificationPref.findUnique({
        where: { userId },
        select: { matchUpdate: true },
      });
      if (!(pref?.matchUpdate ?? true)) continue;
      await resend.emails
        .send({
          from: `${SITE_NAME} <${MAIL_FROM}>`,
          to: email,
          subject: `[${SITE_NAME}] 보호자가 요청을 취소했어요`,
          html: requestCancelledEmailHtml({ requestSummary: summary, otherJobs }),
        })
        .catch(() => {});
    }
  }

  return NextResponse.json(careRequest);
}
