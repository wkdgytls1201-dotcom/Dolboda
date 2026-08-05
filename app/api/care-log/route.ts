import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { careRequestSummary } from "@/lib/careLocationTypes";
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

// 가족 열람(care-log-spec §9-5) — 보호자·매니저 컨텍스트가 둘 다 없을 때만 찾는다.
// 보호자 화면과 같은 모양의 "읽기 전용"이다: 읽음 표시를 남기지 않고(읽음은 보호자의
// 약속 — §4-4), 반응도 못 남긴다(반응은 보호자의 목소리 — §9-1).
async function findFamilyContext(userId: string) {
  const access = await prisma.careLogFamilyAccess.findFirst({
    where: { userId, acceptedAt: { not: null }, revokedAt: null },
    orderBy: { acceptedAt: "desc" },
  });
  if (!access) return null;
  const request = await prisma.careRequest.findFirst({
    where: { id: access.careRequestId, status: { in: ["MATCHED", "COMPLETED"] } },
    include: {
      applications: {
        where: { status: { in: ["매칭확정", "돌봄완료"] } },
        include: { sitterProfile: { select: { id: true, nickname: true, userId: true } } },
      },
    },
  });
  if (!request?.applications[0]) return null;
  return { request, application: request.applications[0], viewer: "family" as const };
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
  const partyCtx =
    requested === "guardian" && guardianCtx
      ? guardianCtx
      : requested === "sitter" && sitterCtx
      ? sitterCtx
      : sitterCtx ?? guardianCtx;

  // 가족 열람은 당사자 컨텍스트가 없을 때만 — 보호자·매니저는 각자의 화면이 우선이다.
  const ctx = partyCtx ?? (await findFamilyContext(session.user.id));

  if (!ctx) {
    return NextResponse.json({ error: "확정된 돌봄이 없어요." }, { status: 404 });
  }

  // 요약 전용 모드(?stats=1) — 돌봄 확인서가 "기록 N일 · 특이사항 N건"을 붙일 때 쓴다.
  // 일반 GET과 달리 **읽음 처리를 하지 않는다**: 확인서를 연 것은 일지를 읽은 게 아닌데
  // 읽음으로 남으면 매니저가 "읽혔다"를 잘못 믿게 된다. 정정 체인은 날짜당 최신 1건으로 접는다.
  if (searchParams.get("stats") === "1") {
    const rows = await prisma.careLog.findMany({
      where: { careRequestId: ctx.request.id },
      select: { careDate: true, alertNote: true, photos: true, meal: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const latestByDate = new Map<string, (typeof rows)[number]>();
    for (const r of rows) latestByDate.set(r.careDate, r); // 오름차순이라 마지막 할당이 최신
    const perDay = [...latestByDate.values()];
    const dates = [...latestByDate.keys()].sort();
    return NextResponse.json({
      stats: {
        dayCount: perDay.length,
        alertCount: perDay.filter((r) => r.alertNote).length,
        // "식사 잘하신 날" — 후기 화면이 쓴다(care-log-spec §9-3): 쓸 말이 생기면 평가가 후해진다
        mealGoodCount: perDay.filter((r) => r.meal === "잘 드심").length,
        photoCount: perDay.reduce(
          (n, r) => n + (Array.isArray(r.photos) ? r.photos.length : 0),
          0
        ),
        firstDate: dates[0] ?? null,
        lastDate: dates[dates.length - 1] ?? null,
      },
    });
  }

  const [logs, quickNotes, guardianUser, familyCount] = await Promise.all([
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
    // 함께 보는 가족 수 — 매니저도 독자가 누군지 알게 한다(투명성, §9-5)
    prisma.careLogFamilyAccess.count({
      where: { careRequestId: ctx.request.id, acceptedAt: { not: null }, revokedAt: null },
    }),
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
    // "무슨 요청인지" 한 줄 + 합의 기준 사례비 — 보호자·매니저가 같은 조건을 매일 보는
    // 것이 요금 분쟁(보호자 1위 불만) 예방 장치다. 우선순위는 합의서 봉인과 동일:
    // 확정 지원의 제안 금액이 있으면 그 값, 없으면 등록 시 희망가. 금액 결정·정산에
    // 개입하는 게 아니라 이미 기록된 값의 재표시다(care-agreement-spec §1의 선 유지).
    requestSummary: careRequestSummary(ctx.request),
    pay:
      ctx.application.proposedAmount != null
        ? {
            amount: ctx.application.proposedAmount,
            unit: ctx.application.proposedUnit ?? "일",
            agreed: true,
          }
        : ctx.request.budgetAmount != null
          ? { amount: ctx.request.budgetAmount, unit: ctx.request.budgetUnit ?? "일", agreed: false }
          : null,
    familyCount,
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

// 보호자의 원탭 반응(감사해요·안심돼요·수고하셨어요) — 읽음 확인의 다음 단계.
// 매니저가 "읽혔다"를 넘어 "고마워한다"를 보는 것이 감정노동의 보상이 된다.
const REACTIONS = new Set(["thanks", "relieved", "cheer"]);

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { logId?: unknown; reaction?: unknown };
  const logId = typeof body.logId === "string" ? body.logId : "";
  // null이면 반응 취소(잘못 눌렀을 때) — 그 외에는 정해진 세 가지만
  const reaction = body.reaction === null ? null : typeof body.reaction === "string" ? body.reaction : "";
  if (!logId || (reaction !== null && !REACTIONS.has(reaction))) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  // 반응은 보호자만 남긴다 — 자기 돌봄 건의 기록인지도 확인한다
  const ctx = await findGuardianContext(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "반응은 보호자만 남길 수 있어요." }, { status: 403 });
  }
  const log = await prisma.careLog.findUnique({ where: { id: logId } });
  if (!log || log.careRequestId !== ctx.request.id) {
    return NextResponse.json({ error: "기록을 찾을 수 없어요." }, { status: 404 });
  }

  const updated = await prisma.careLog.update({
    where: { id: logId },
    data: { guardianReaction: reaction },
  });
  return NextResponse.json({ log: updated });
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

/** 일지 "도착" 알림 (alert-system-spec §3-12) — 보호자가 앱을 열어보지 않아도 오늘 기록이
 * 생겼다는 걸 안다. 매일 확인하고 싶은 것이 이 기능의 존재 이유라, 알림이 없으면
 * 보호자가 매번 먼저 열어봐야 한다. 발송 실패가 저장을 되돌리면 안 되는 건 위와 동일. */
async function notifyLogArrived(
  guardianEmail: string | null,
  sitterNickname: string,
  careDate: string
) {
  if (!resend || !guardianEmail) return;
  try {
    await resend.emails.send({
      from: `${SITE_NAME} 돌봄일지 <${MAIL_FROM}>`,
      to: guardianEmail,
      subject: `[${SITE_NAME}] ${careDate} 돌봄일지가 도착했어요`,
      text: `${sitterNickname}님이 ${careDate} 돌봄일지를 남겼어요.\n\n마이페이지 > 돌봄일지에서 식사·복약·하루 상태를 확인하실 수 있어요.`,
    });
  } catch (err) {
    console.error("돌봄일지 도착 메일 실패", err);
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

  // 사진(§9-2) — 우리 저장소(care-log 경로)에서 나온 URL만 받는다. 임의 URL을 그대로
  // 저장하면 보호자 화면에 아무 이미지나 끼워 넣을 수 있게 된다. 최대 3장.
  const photoBase = process.env.SUPABASE_URL
    ? `${process.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/sitter-photos/care-log/`
    : null;
  const photos = (Array.isArray(body.photos) ? body.photos : [])
    .map((p) => {
      const url = typeof (p as { url?: unknown })?.url === "string" ? (p as { url: string }).url : null;
      if (!url || !photoBase || !url.startsWith(photoBase)) return null;
      const takenAt =
        typeof (p as { takenAt?: unknown })?.takenAt === "string"
          ? (p as { takenAt: string }).takenAt
          : new Date().toISOString();
      return { url, takenAt };
    })
    .filter((p): p is { url: string; takenAt: string } => p !== null)
    .slice(0, 3);

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
      ...(photos.length > 0 && { photos }),
      correctsId,
    },
  });

  // 보호자 알림 — 특이사항이 있으면 그 메일이 "도착 소식"까지 겸한다(두 통 금지).
  // 특이사항이 없으면 하루의 첫 기록에만 도착 알림을 보낸다: 정정(correctsId)이 아닌
  // 기록은 위의 "이미 이 날짜 기록이 있어요" 409 가드 덕에 careDate당 정확히 1건이라,
  // 별도 발송 기록 테이블 없이도 같은 날짜에 두 번 나갈 수 없다(§2-3 원칙을 유니크
  // 가드가 대신한다). 스위치는 아직 없다 — 새 지원자 알림(§3-8)과 같은 거래성 원칙.
  if (alertNote || !correctsId) {
    const guardian = await prisma.user.findUnique({
      where: { id: ctx.request.guardianId },
      select: { email: true },
    });
    const nickname = ctx.application.sitterProfile.nickname;
    if (alertNote) await notifyAlert(guardian?.email ?? null, nickname, alertNote);
    else await notifyLogArrived(guardian?.email ?? null, nickname, careDate);
  }

  return NextResponse.json({ log: created });
}
