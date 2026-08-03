import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { resend } from "@/lib/resend";
import { SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";
import { QUICK_NOTE_KINDS, QUICK_NOTE_COOLDOWN_MS, todayKst, type QuickNoteKind } from "@/lib/careLog";

// 빠른 알림 — 돌봄 중 버튼 하나로 그 자리에서 보호자에게 보내는 알림(§5-4-1).
// 매니저 전용. 조회는 /api/care-log의 quickNotes에 함께 담겨 온다.

const KIND_SET = new Set<QuickNoteKind>([...QUICK_NOTE_KINDS.map((k) => k.kind), "custom"]);

async function findSitterContext(userId: string) {
  const profile = await prisma.sitterProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return null;
  const app = await prisma.careRequestApplication.findFirst({
    where: { sitterProfileId: profile.id, status: { in: ["매칭확정", "돌봄완료"] } },
    orderBy: { createdAt: "desc" },
    include: { sitterProfile: { select: { id: true, nickname: true } }, careRequest: true },
  });
  if (!app) return null;
  return { request: app.careRequest, application: app };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const limited = rateLimit(`care-quick-note:${clientIp(req)}`, 40, 60 * 60 * 1000);
  if (!limited.ok) {
    return tooManyRequests("잠시 후 다시 시도해주세요.", limited.retryAfter);
  }

  const ctx = await findSitterContext(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "빠른 알림은 매니저만 보낼 수 있어요." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { kind?: unknown; body?: unknown };
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!KIND_SET.has(kind as QuickNoteKind)) {
    return NextResponse.json({ error: "알 수 없는 알림 종류예요." }, { status: 400 });
  }
  const noteBody =
    kind === "custom" && typeof body.body === "string" ? body.body.trim().slice(0, 300) : null;
  if (kind === "custom" && !noteBody) {
    return NextResponse.json({ error: "무슨 일인지 짧게 적어주세요." }, { status: 400 });
  }

  const careDate = todayKst();

  // 연타 방지 — 같은 버튼은 30분에 한 번만(custom은 매번 다른 내용이라 제외)
  if (kind !== "custom") {
    const recent = await prisma.careQuickNote.findFirst({
      where: {
        careRequestId: ctx.request.id,
        kind,
        canceledAt: null,
        createdAt: { gte: new Date(Date.now() - QUICK_NOTE_COOLDOWN_MS) },
      },
    });
    if (recent) {
      return NextResponse.json(
        { error: "같은 알림은 30분에 한 번만 보낼 수 있어요." },
        { status: 429 }
      );
    }
  }

  const created = await prisma.careQuickNote.create({
    data: {
      careRequestId: ctx.request.id,
      sitterProfileId: ctx.application.sitterProfile.id,
      kind,
      body: noteBody,
      careDate,
    },
  });

  // 특이사항(custom)만 즉시 메일로 알린다 — 나머지는 앱을 열었을 때 조용히 보이는 정도로 충분하다
  if (kind === "custom" && resend) {
    const guardian = await prisma.user.findUnique({
      where: { id: ctx.request.guardianId },
      select: { email: true },
    });
    if (guardian?.email) {
      try {
        await resend.emails.send({
          from: `${SITE_NAME} 돌봄일지 <${MAIL_FROM}>`,
          to: guardian.email,
          subject: `[${SITE_NAME}] ${ctx.application.sitterProfile.nickname}님이 알려드릴 일이 있어요`,
          text: `${noteBody}\n\n마이페이지 > 돌봄일지에서 자세히 확인하실 수 있어요.`,
        });
      } catch (err) {
        console.error("빠른 알림 메일 실패", err);
      }
    }
  }

  return NextResponse.json({ note: created });
}

/** 잘못 누른 걸 1분 안에 취소 — 지우지 않고 canceledAt만 남긴다(§5-4-1, 조용히 사라지면 혼란). */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const ctx = await findSitterContext(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  }

  const note = await prisma.careQuickNote.findUnique({ where: { id } });
  if (!note || note.sitterProfileId !== ctx.application.sitterProfile.id) {
    return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });
  }
  if (Date.now() - note.createdAt.getTime() > 60_000) {
    return NextResponse.json({ error: "1분이 지나 취소할 수 없어요." }, { status: 409 });
  }

  const updated = await prisma.careQuickNote.update({
    where: { id },
    data: { canceledAt: new Date() },
  });
  return NextResponse.json({ note: updated });
}
