import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { careRequestSummary } from "@/lib/careLocationTypes";
import { awardPoints } from "@/lib/points";
import { POINT_EARN } from "@/lib/pointsConfig";
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
  careLogWindow,
  careDateError,
} from "@/lib/careLog";
import {
  findSitterCareContext,
  listSitterContexts,
  listGuardianContexts,
  listFamilyContexts,
  pickContext,
  careContextOption,
} from "@/lib/careLogContext";

// 돌봄일지 — GET(조회, 보호자는 열람 즉시 읽음 처리) · POST(매니저 작성/정정).
// 설계·법적 포지션은 docs/care-log-spec.md — 정산·근태와 엮지 않는 "확인 일지" 1단계다.
//
// /api/care-agreement와 같은 방식으로 "지금 확정된 돌봄 건"을 세션에서 찾는다
// (URL에 careRequestId를 두지 않는다 — /care-request 페이지 전체가 이 전제로 짜여 있다).

// 역할별 컨텍스트 목록·선택은 lib/careLogContext.ts가 단일 구현이다.
// (진행 중 건 우선 + requestId로 건 전환 — 세 라우트 각자의 사본이 최신 건만 집어
//  완료된 건에 오늘 기록이 들어가는 문제가 있었다. 2026-08-06 감사)
//
// 가족 열람(§9-5)은 보호자 화면과 같은 모양의 "읽기 전용"이다: 읽음 표시를 남기지
// 않고(읽음은 보호자의 약속 — §4-4), 반응도 못 남긴다(반응은 보호자의 목소리 — §9-1).

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  // 한 계정이 보호자이자 매니저일 수 있다(마이페이지 역할 전환, 운영자 테스트 계정이
  // 특히 그렇다 — 자기 글에 자기가 지원 가능한 예외가 admin에 있다). 둘 다 되는 계정은
  // ?as=guardian|sitter로 보고 싶은 쪽을 고를 수 있게 하고, 기본값은 매니저 쪽이다
  // (일지는 매니저가 "쓰는" 화면이 기본 동작이라 쓸 게 있는 쪽을 먼저 보여준다).
  const [sitterList, guardianList] = await Promise.all([
    listSitterContexts(session.user.id),
    listGuardianContexts(session.user.id),
  ]);
  const availableViews = [
    ...(sitterList.length > 0 ? (["sitter"] as const) : []),
    ...(guardianList.length > 0 ? (["guardian"] as const) : []),
  ];
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("as");
  // 돌봄 건 전환(2026-08-06) — 매니저는 여러 가정을, 보호자는 지난 돌봄을 함께 가질 수
  // 있다. requestId가 없으면 진행 중 건이 기본이다(lib/careLogContext.ts 정렬).
  const requestId = searchParams.get("requestId");

  const partyList =
    requested === "guardian" && guardianList.length > 0
      ? guardianList
      : requested === "sitter" && sitterList.length > 0
        ? sitterList
        : sitterList.length > 0
          ? sitterList
          : guardianList;

  // 가족 열람은 당사자 컨텍스트가 없을 때만 — 보호자·매니저는 각자의 화면이 우선이다.
  const list = partyList.length > 0 ? partyList : await listFamilyContexts(session.user.id);
  const ctx = pickContext(list, requestId);

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
    // 기록 가능한 날짜 창 — 화면이 날짜 선택 범위를 제한하고, 닫혔으면 이유를 보여준다.
    // 서버 가드와 같은 함수라 화면과 API가 어긋날 수 없다.
    logWindow: careLogWindow(ctx.request),
    // 지금 보고 있는 건 + 고를 수 있는 건 목록(전환 칩). 1건이면 화면이 칩을 숨긴다.
    currentRequestId: ctx.request.id,
    requestOptions: list.map(careContextOption),
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

  // 반응은 보호자만 남긴다 — 자기 돌봄 건의 기록인지도 확인한다.
  // 건이 여러 개일 수 있으니 목록 전체에서 그 기록이 속한 건을 찾는다(지난 돌봄의
  // 기록에도 뒤늦게 고마움을 남길 수 있어야 한다).
  const guardianList = await listGuardianContexts(session.user.id);
  if (guardianList.length === 0) {
    return NextResponse.json({ error: "반응은 보호자만 남길 수 있어요." }, { status: 403 });
  }
  const log = await prisma.careLog.findUnique({ where: { id: logId } });
  const ctx = log ? guardianList.find((c) => c.request.id === log.careRequestId) : undefined;
  if (!log || !ctx) {
    return NextResponse.json({ error: "기록을 찾을 수 없어요." }, { status: 404 });
  }

  const updated = await prisma.careLog.update({
    where: { id: logId },
    data: { guardianReaction: reaction },
  });

  // 돌봄 포인트(docs/points-spec.md) — 반응을 "받은" 매니저에게 소액 적립.
  // 기록 1건당 평생 1회(유니크: userId+kind+logId — 취소했다 다시 눌러도 재지급 없음),
  // 요청당 상한 10회. 실패는 무시 — 포인트 때문에 반응 저장이 실패하면 안 된다.
  if (reaction !== null) {
    try {
      const sitterUserId = ctx.application.sitterProfile.userId;
      const grantedForRequest = await prisma.pointLedger.count({
        where: { userId: sitterUserId, kind: "reaction", memo: ctx.request.id },
      });
      if (grantedForRequest < POINT_EARN.reactionCapPerRequest) {
        await awardPoints({
          userId: sitterUserId,
          kind: "reaction",
          refId: logId,
          amount: POINT_EARN.reactionPerLog,
          memo: ctx.request.id,
        });
      }
    } catch {
      /* 적립 실패 무시 */
    }
  }

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

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // 어느 돌봄 건에 쓰는지 — 화면이 보고 있던 건을 그대로 실어 보낸다. 없으면 진행 중 건.
  // 내 목록에 없는 id면 null이 되어 아래 403으로 떨어진다(조용히 기본값으로 바꾸지 않는다).
  const targetRequestId = typeof body.requestId === "string" ? body.requestId : null;
  const ctx = await findSitterCareContext(session.user.id, targetRequestId);
  if (!ctx) {
    return NextResponse.json({ error: "돌봄일지는 매니저만 작성할 수 있어요." }, { status: 403 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

  // 사진(§9-2) — 우리 저장소에서 나온 URL만, 그것도 **이 돌봄 건의 폴더**만 받는다.
  // care-log/ 까지만 대조하면 매니저가 예전에 맡았던 다른 가정의 사진 URL을 이 일지에
  // 끼워 넣을 수 있다(업로드 경로가 care-log/{careRequestId}/ 라 남의 건도 형식은 같다).
  const photoBase = process.env.SUPABASE_URL
    ? `${process.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/sitter-photos/care-log/${ctx.request.id}/`
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
  // 돌봄 기간 밖(시작 전·종료 후)과 미래 날짜를 함께 막는다. 예전엔 미래 날짜만 막아서
  // 시작 전 날짜·기간 밖 날짜로 기록이 남을 수 있었다(2026-08-06 실측 4건).
  // 종료 뒤에도 유예 동안은 받는다 — "어제 것을 오늘 쓰는" 지각 작성은 정당하다.
  const logWindow = careLogWindow(ctx.request);
  const dateError = careDateError(careDate, logWindow);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
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
    // 정정은 "그날 기록을 고치는 것"이다. 날짜가 다르면 정정이 아니라 새 기록이고,
    // 그대로 두면 다른 날의 id를 붙여 하루 1원본 가드를 그냥 지나칠 수 있다.
    if (target.careDate !== careDate) {
      return NextResponse.json(
        { error: "정정은 같은 날짜의 기록에만 할 수 있어요." },
        { status: 400 }
      );
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
  //
  // 도착 알림은 **오늘·어제 날짜 기록에만** 보낸다. 밀린 날짜를 한 번에 채우면
  // (돌봄이 끝난 뒤 유예 기간에 흔하다) 날짜마다 한 통씩 나가 보호자 받은편지함이
  // 메일로 덮인다 — alert-system-spec의 "사람당 한 통" 원칙과 정면으로 어긋난다.
  // 특이사항(alertNote)은 지금 알아야 할 일이라 날짜와 무관하게 항상 보낸다.
  const yesterdayKst = new Date(Date.now() - 86_400_000).toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });
  const freshEnoughToNotify = careDate >= yesterdayKst;
  if (alertNote || (!correctsId && freshEnoughToNotify)) {
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
