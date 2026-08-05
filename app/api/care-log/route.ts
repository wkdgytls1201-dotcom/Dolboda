import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { resend } from "@/lib/resend";
import { SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";
import {
  MEAL_OPTIONS,
  MOOD_OPTIONS,
  DAY_STATUS_OPTIONS,
  SLEEP_OPTIONS,
  BOWEL_OPTIONS,
  MEDICATION_OPTIONS,
  taskChipsFor,
  todayKst,
} from "@/lib/careLog";

// 돌봄일지 — GET(조회, 보호자는 열람 즉시 읽음 처리) · POST(매니저 작성/정정).
// 설계·법적 포지션은 docs/care-log-spec.md — 정산·근태와 엮지 않는 "확인 일지" 1단계다.
//
// /api/care-agreement와 같은 방식으로 "지금 확정된 돌봄 건"을 세션에서 찾는다
// (URL에 careRequestId를 두지 않는다 — /care-request 페이지 전체가 이 전제로 짜여 있다).

async function findGuardianContext(userId: string) {
  const request = await prisma.careRequest.findFirst({
    where: { guardianId: userId, status: { in: ["MATCHED", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        where: { status: { in: ["매칭확정", "돌봄완료"] } },
        include: { sitterProfile: { select: { id: true, nickname: true, userId: true } } },
      },
    },
  });
  if (!request?.applications[0]) return null;
  return { request, application: request.applications[0], viewer: "guardian" as const };
}

async function findSitterContext(userId: string) {
  const profile = await prisma.sitterProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return null;
  const app = await prisma.careRequestApplication.findFirst({
    where: { sitterProfileId: profile.id, status: { in: ["매칭확정", "돌봄완료"] } },
    orderBy: { createdAt: "desc" },
    include: {
      sitterProfile: { select: { id: true, nickname: true, userId: true } },
      careRequest: true,
    },
  });
  if (!app) return null;
  return { request: app.careRequest, application: app, viewer: "sitter" as const };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  // 한 계정이 보호자이자 매니저일 수 있다(마이페이지 역할 전환, 운영자 테스트 계정이
  // 특히 그렇다 — 자기 글에 자기가 지원 가능한 예외가 admin에 있다). 둘 다 되는 계정은
  // ?as=guardian|sitter로 보고 싶은 쪽을 고를 수 있게 하고, 기본값은 매니저 쪽이다
  // (일지는 매니저가 "쓰는" 화면이 기본 동작이라 쓸 게 있는 쪽을 먼저 보여준다).
  const [sitterCtx, guardianCtx] = await Promise.all([
    findSitterContext(session.user.id),
    findGuardianContext(session.user.id),
  ]);
  const availableViews = [
    ...(sitterCtx ? (["sitter"] as const) : []),
    ...(guardianCtx ? (["guardian"] as const) : []),
  ];
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("as");
  const ctx =
    requested === "guardian" && guardianCtx
      ? guardianCtx
      : requested === "sitter" && sitterCtx
      ? sitterCtx
      : sitterCtx ?? guardianCtx;

  if (!ctx) {
    return NextResponse.json({ error: "확정된 돌봄이 없어요." }, { status: 404 });
  }

  const [logs, quickNotes, guardianUser] = await Promise.all([
    prisma.careLog.findMany({
      where: { careRequestId: ctx.request.id },
      orderBy: { careDate: "desc" },
    }),
    prisma.careQuickNote.findMany({
      where: { careRequestId: ctx.request.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findUnique({ where: { id: ctx.request.guardianId }, select: { name: true } }),
  ]);

  // 보호자가 열면 그 즉시 "확인했어요"로 남긴다 — 매니저가 자기 기록이 읽히는지 아는 것이
  // 이 기능의 핵심 장치 중 하나다(§4-4).
  if (ctx.viewer === "guardian") {
    const now = new Date();
    const unreadLogIds = logs.filter((l) => !l.readAt).map((l) => l.id);
    const unreadNoteIds = quickNotes.filter((n) => !n.readAt).map((n) => n.id);
    await Promise.all([
      unreadLogIds.length > 0
        ? prisma.careLog.updateMany({ where: { id: { in: unreadLogIds } }, data: { readAt: now } })
        : null,
      unreadNoteIds.length > 0
        ? prisma.careQuickNote.updateMany({ where: { id: { in: unreadNoteIds } }, data: { readAt: now } })
        : null,
    ]);
    for (const l of logs) if (!l.readAt) l.readAt = now;
    for (const n of quickNotes) if (!n.readAt) n.readAt = now;
  }

  return NextResponse.json({
    viewer: ctx.viewer,
    availableViews,
    sitterNickname: ctx.application.sitterProfile.nickname,
    guardianName: guardianUser?.name ?? null,
    startDate: ctx.request.startDate,
    endDate: ctx.request.endDate,
    taskChips: taskChipsFor(ctx.request),
    options: {
      meal: MEAL_OPTIONS,
      mood: MOOD_OPTIONS,
      dayStatus: DAY_STATUS_OPTIONS,
      sleep: SLEEP_OPTIONS,
      bowel: BOWEL_OPTIONS,
      medication: MEDICATION_OPTIONS,
    },
    logs,
    quickNotes,
  });
}

/** 특이사항이 있으면 보호자에게 즉시 메일로 알린다 — 발송 실패가 저장을 되돌리면 안 된다. */
async function notifyAlert(guardianEmail: string | null, sitterNickname: string, note: string) {
  if (!resend || !guardianEmail) return;
  try {
    await resend.emails.send({
      from: `${SITE_NAME} 돌봄일지 <${MAIL_FROM}>`,
      to: guardianEmail,
      subject: `[${SITE_NAME}] ${sitterNickname}님이 알려드릴 일이 있어요`,
      text: `${note}\n\n마이페이지 > 돌봄일지에서 자세히 확인하실 수 있어요.`,
    });
  } catch (err) {
    console.error("돌봄일지 특이사항 메일 실패", err);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const limited = rateLimit(`care-log:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!limited.ok) {
    return tooManyRequests("잠시 후 다시 시도해주세요.", limited.retryAfter);
  }

  const ctx = await findSitterContext(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "돌봄일지는 매니저만 작성할 수 있어요." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

  const meal = str(body.meal);
  const mood = str(body.mood);
  const dayStatus = str(body.dayStatus);
  const alertNote = dayStatus === "알려드릴 일이 있어요" ? str(body.alertNote) : null;
  const careDate = str(body.careDate) ?? todayKst();
  const correctsId = str(body.correctsId);

  // 형식부터 확인 — 아래 비교가 문자열 비교라, 형식이 다른 값("2026/8/5", 빈 문자열 등)은
  // 우연히 통과하거나 우연히 막히는 식으로 흘러가 DB에 쓰레기 날짜가 남을 수 있다.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(careDate)) {
    return NextResponse.json({ error: "날짜 형식이 올바르지 않아요." }, { status: 400 });
  }
  // 미래 날짜는 막는다 — 아직 하지 않은 돌봄을 기록할 수는 없다
  if (careDate > todayKst()) {
    return NextResponse.json({ error: "미래 날짜는 기록할 수 없어요." }, { status: 400 });
  }

  if (!correctsId) {
    const existing = await prisma.careLog.findFirst({
      where: { careRequestId: ctx.request.id, careDate, correctsId: null },
    });
    if (existing) {
      return NextResponse.json(
        { error: "이미 이 날짜 기록이 있어요. 정정하시려면 정정 기록으로 남겨주세요.", existingId: existing.id },
        { status: 409 }
      );
    }
  } else {
    // 정정 대상이 정말 이 돌봄 건·이 매니저의 기록인지 확인 — 다른 건의 id를 끼워 넣지 못하게
    const target = await prisma.careLog.findUnique({ where: { id: correctsId } });
    if (
      !target ||
      target.careRequestId !== ctx.request.id ||
      target.sitterProfileId !== ctx.application.sitterProfile.id
    ) {
      return NextResponse.json({ error: "정정할 기록을 찾을 수 없어요." }, { status: 404 });
    }
  }

  const created = await prisma.careLog.create({
    data: {
      careRequestId: ctx.request.id,
      sitterProfileId: ctx.application.sitterProfile.id,
      careDate,
      meal,
      mood,
      dayStatus,
      sleep: str(body.sleep),
      bowel: str(body.bowel),
      medication: str(body.medication),
      tasks: arr(body.tasks),
      memo: str(body.memo),
      alertNote,
      workStart: str(body.workStart),
      workEnd: str(body.workEnd),
      correctsId,
    },
  });

  if (alertNote) {
    const guardian = await prisma.user.findUnique({
      where: { id: ctx.request.guardianId },
      select: { email: true },
    });
    await notifyAlert(guardian?.email ?? null, ctx.application.sitterProfile.nickname, alertNote);
  }

  return NextResponse.json({ log: created });
}
