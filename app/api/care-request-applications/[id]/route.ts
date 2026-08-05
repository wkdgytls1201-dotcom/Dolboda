import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resend, matchConfirmedEmailHtml, applicationNotSelectedEmailHtml } from "@/lib/resend";
import { SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";
import { careRequestSummary } from "@/lib/careLocationTypes";

/** 매니저 알림 설정에서 matchUpdate가 켜져 있는지. 설정을 한 번도 안 바꾼 사람은
 * 행 자체가 없는데, 기본값이 "켜짐"이라 그 경우도 true로 본다
 * (app/api/sitter/notification-prefs/route.ts의 DEFAULT_PREFS와 같은 기준). */
async function wantsMatchUpdate(userId: string) {
  const pref = await prisma.sitterNotificationPref.findUnique({
    where: { userId },
    select: { matchUpdate: true },
  });
  return pref?.matchUpdate ?? true;
}

/** 매칭확정·미선정 메일 발송 — 실패해도 무시한다(발송 실패가 매칭 확정을 되돌리면 안 된다). */
async function notifyMatchOutcome(
  summary: string,
  confirmed: { email: string | null; id: string } | null,
  notSelected: { email: string | null; id: string }[]
) {
  if (!resend) return;

  if (confirmed?.email && (await wantsMatchUpdate(confirmed.id))) {
    await resend.emails
      .send({
        from: `${SITE_NAME} <${MAIL_FROM}>`,
        to: confirmed.email,
        subject: `[${SITE_NAME}] 매칭이 확정됐어요`,
        html: matchConfirmedEmailHtml({ requestSummary: summary }),
      })
      .catch(() => {});
  }

  for (const s of notSelected) {
    if (!s.email || !(await wantsMatchUpdate(s.id))) continue;
    await resend.emails
      .send({
        from: `${SITE_NAME} <${MAIL_FROM}>`,
        to: s.email,
        subject: `[${SITE_NAME}] 이번엔 다른 분과 진행하게 됐어요`,
        html: applicationNotSelectedEmailHtml({ requestSummary: summary }),
      })
      .catch(() => {});
  }
}

// 보호자가 지원자 중 한 명을 확정 — status를 "매칭확정"으로, 해당 CareRequest도 MATCHED로.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const application = await prisma.careRequestApplication.findUnique({
    where: { id: params.id },
    include: {
      careRequest: true,
      sitterProfile: { select: { user: { select: { id: true, email: true } } } },
    },
  });
  if (!application) {
    return NextResponse.json({ error: "처리할 수 없어요." }, { status: 404 });
  }

  const body = (await req.json()) as {
    action?: "confirm" | "propose";
    proposedAmount?: unknown;
    message?: unknown;
  };

  // 재제안(역경매) — 매니저 본인이 아직 답을 기다리는 동안(지원완료 + 요청 OPEN)
  // 제안 사례비·한마디를 고칠 수 있다. 확정 뒤 수정을 막는 이유: 합의서가 확정 시점의
  // 제안 금액을 봉인하므로, 그 후에 바뀌면 기록과 실제가 어긋난다.
  if (body.action === "propose") {
    if (application.sitterProfile.user.id !== session.user.id) {
      return NextResponse.json({ error: "처리할 수 없어요." }, { status: 404 });
    }
    if (application.status !== "지원완료" || application.careRequest.status !== "OPEN") {
      return NextResponse.json(
        { error: "매칭이 확정된 뒤에는 제안을 바꿀 수 없어요." },
        { status: 409 }
      );
    }
    const proposedAmount =
      typeof body.proposedAmount === "number" &&
      Number.isInteger(body.proposedAmount) &&
      body.proposedAmount > 0 &&
      body.proposedAmount <= 1_000_000
        ? body.proposedAmount
        : null;
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim().slice(0, 200)
        : null;
    const updated = await prisma.careRequestApplication.update({
      where: { id: params.id },
      data: {
        proposedAmount,
        proposedUnit:
          proposedAmount != null
            ? (application.proposedUnit ?? application.careRequest.budgetUnit ?? "일")
            : null,
        message,
      },
    });
    return NextResponse.json(updated);
  }

  // 이하 확정(confirm) — 보호자만
  if (application.careRequest.guardianId !== session.user.id) {
    return NextResponse.json({ error: "처리할 수 없어요." }, { status: 404 });
  }
  const { action } = body;
  if (action !== "confirm") {
    return NextResponse.json({ error: "알 수 없는 처리예요." }, { status: 400 });
  }

  // 상태 가드 — 이미 처리된 요청이면 여기서 끊는다(대부분의 중복 클릭은 여기서 걸린다).
  if (application.careRequest.status !== "OPEN" || application.status !== "지원완료") {
    return NextResponse.json({ error: "이미 처리된 요청이에요." }, { status: 409 });
  }

  // 미선정 처리될 사람 목록을 트랜잭션 "전에" 미리 알아둔다 — updateMany는 몇 건이
  // 바뀌었는지 개수만 돌려주고 "누가" 바뀌었는지는 안 알려주기 때문이다. 트랜잭션
  // 안에서 다른 지원자가 끼어들 가능성은 거의 없지만(같은 careRequestId에 한정된
  // 좁은 창이라), 만에 하나 있어도 "메일을 한두 명 놓칠 수 있다"는 정도라 확정
  // 처리 자체의 정확성(위의 조건부 updateMany 잠금)엔 영향 없다.
  const toNotify = await prisma.careRequestApplication.findMany({
    where: { careRequestId: application.careRequestId, id: { not: params.id }, status: "지원완료" },
    select: { sitterProfile: { select: { user: { select: { id: true, email: true } } } } },
  });

  // 위 검사만으로는 부족하다 — 서로 다른 지원자를 거의 동시에 확정하면 두 요청이 모두
  // 검사를 통과해(둘 다 OPEN을 봄) 지원자 두 명이 "매칭확정"이 될 수 있다.
  // 그래서 트랜잭션 안에서 조건부 updateMany로 한 번 더 잠근다: OPEN인 요청을 MATCHED로
  // 바꾸는 데 성공한 쪽만 확정을 이어가고, 진 쪽은 count 0을 보고 롤백된다.
  try {
    const updatedApplication = await prisma.$transaction(async (tx) => {
      const claimed = await tx.careRequest.updateMany({
        where: { id: application.careRequestId, status: "OPEN" },
        data: { status: "MATCHED" },
      });
      if (claimed.count === 0) throw new Error("ALREADY_MATCHED");

      const app = await tx.careRequestApplication.update({
        where: { id: params.id },
        data: { status: "매칭확정" },
      });
      // 나머지 지원자는 그 자리에서 "미선정"으로 — 무소식으로 방치하는 것이
      // 매니저 이탈의 가장 큰 원인이다. 떨어진 걸 아는 게 아무 소식 없는 것보다 낫고,
      // 화면에서 "다음 기회에 다시 만나요"로 재지원을 유도할 수 있다.
      await tx.careRequestApplication.updateMany({
        where: {
          careRequestId: application.careRequestId,
          id: { not: params.id },
          status: "지원완료",
        },
        data: { status: "미선정" },
      });
      return app;
    });

    // 상태 변경은 이미 끝났다 — 메일은 실패해도 응답에 영향을 주지 않는다.
    await notifyMatchOutcome(
      careRequestSummary(application.careRequest),
      application.sitterProfile.user,
      toNotify.map((t) => t.sitterProfile.user)
    ).catch(() => {});

    return NextResponse.json(updatedApplication);
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_MATCHED") {
      return NextResponse.json({ error: "이미 처리된 요청이에요." }, { status: 409 });
    }
    throw e;
  }
}

// 돌보다 매니저 본인이 지원을 취소
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const application = await prisma.careRequestApplication.findUnique({
    where: { id: params.id },
    include: { sitterProfile: true },
  });
  if (!application || application.sitterProfile.userId !== session.user.id) {
    return NextResponse.json({ error: "취소할 수 없어요." }, { status: 404 });
  }

  // 아직 보호자 답을 기다리는 중일 때만 철회할 수 있다.
  // 가드가 없으면 매칭이 확정된 뒤에도 매니저가 지원을 지울 수 있는데, 그러면
  // 돌봄 요청은 "매칭확정"으로 남은 채 지원자만 사라져 보호자 화면이 빈 상태가 된다.
  // 확정 뒤에 사정이 생기면 보호자와 이야기해 보호자가 요청을 취소하는 게 맞는 순서다.
  if (application.status !== "지원완료") {
    return NextResponse.json(
      { error: "매칭이 확정된 뒤에는 보호자와 상의해주세요." },
      { status: 409 }
    );
  }

  await prisma.careRequestApplication.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
