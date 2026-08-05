// 돌봄일지 정기 체크인 — 매칭된 돌봄이 진행 중인데 며칠째 일지가 없으면 매니저에게 알린다.
//
// 대상: CareRequest.status === "MATCHED"이고 오늘이 돌봄 기간(startDate~endDate) 안에 있는 건.
// 판정: 그 요청의 가장 최근 CareLog.careDate로부터 REMINDER_AFTER_DAYS일 이상 지났으면
// (한 번도 없으면 startDate 기준) 대상. 같은 요청에는 COOLDOWN_DAYS 안에 다시 보내지
// 않는다 — 매일 나가면 결국 알림을 꺼버리게 된다(send-facility-alerts.mjs와 같은 원칙).
//
// 이메일 발송은 send-facility-alerts.mjs에 합치지 않고 별도 스크립트로 뒀다 — 그쪽은
// 보호자(찜·관심지역) 대상이고 이건 매니저 대상이라 수신자가 거의 안 겹치고, 내용도
// 완전히 다르다("사람당 메일 한 통" 원칙은 같은 사람에게 갈 때만 의미가 있다).
//
// ⚠️ 2026-08-04 기준 매칭확정(MATCHED) CareRequest가 실서비스에 0건이라, 이 스크립트는
// 실사용 데이터로 검증하지 못했다 — 임시로 만든 테스트 데이터로 로직만 확인했다
// (검증 후 즉시 삭제). docs/care-log-spec.md §0-1도 같은 이유로 "매칭 전 구현" 상태다.
//
// 사용법:
//   node --env-file=.env.local scripts/send-care-log-reminders.mjs           # 드라이런
//   node --env-file=.env.local scripts/send-care-log-reminders.mjs --write   # 실제 발송
//   node ... --date=2026-08-04                                               # 날짜 지정(기본 오늘 KST)

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const WRITE = process.argv.includes("--write");
const dateArg = process.argv.find((a) => a.startsWith("--date="));

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function todayKst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function kstDayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start, end };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dolboda.kr";
const SITE_NAME = "돌보다";
const MAIL_FROM = process.env.MAIL_FROM || "onboarding@resend.dev";
const RESEND_KEY = process.env.RESEND_API_KEY;

const REMINDER_AFTER_DAYS = 3;
const COOLDOWN_DAYS = 3;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function daysBetween(fromDateStr, toDateStr) {
  const a = new Date(`${fromDateStr}T00:00:00+09:00`);
  const b = new Date(`${toDateStr}T00:00:00+09:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// 보호자 반응(🙏😊💪)의 라벨 — 화면(care-log 페이지 REACTION_META)과 같은 값.
// 독려의 핵심은 강제가 아니라 "읽히고 고마워한다"는 증거를 되돌려주는 것이다(스펙 §10-5).
const REACTION_LABEL = {
  thanks: "🙏 감사해요",
  relieved: "😊 안심돼요",
  cheer: "💪 수고하셨어요",
};

function mailBody(t) {
  // ⚠️ 문구 원칙(스펙 §10-5, 2026-08-05 확정): 돌보다 매니저는 플랫폼이 고용한 사람이
  // 아니다. "일지가 없어요" 같은 채근·관리 어투는 업무 지시(사용자성 징표)로 읽힐 수
  // 있어 쓰지 않는다. 기대의 주체는 보호자(당사자)로 두고, 플랫폼은 소통을 "안내"만
  // 하며, 자율 기록임을 메일마다 명시한다.
  //
  // 지난 기록에 보호자가 남긴 반응이 있으면 그대로 인용한다 — 지어낸 수치가 아니라
  // 실제로 받은 마음. 채근보다 강한 동기가 된다.
  const reactionLine = t.lastReaction
    ? `지난 ${t.lastReactionDate} 기록에 보호자님이 "${REACTION_LABEL[t.lastReaction] ?? t.lastReaction}" 반응을 남기셨어요. 오늘 소식도 기다리고 계실 거예요.`
    : `일지는 보호자가 어르신 소식을 확인하는 통로예요. 오늘 있었던 일을 3탭이면 남길 수 있어요.`;
  const autonomyNote =
    "돌봄일지는 의무가 아닌 자율 기록이에요. 이 메일은 보호자와의 소통을 돕는 안내일 뿐, 돌보다가 작성 여부를 관리하지 않아요.";
  const text =
    `${t.sitterName}님, 보호자님이 ${t.daysSince}일째 소식을 기다리고 있어요.\n\n` +
    `${reactionLine}\n\n` +
    `${SITE_URL}/care-request/care-log\n\n${autonomyNote}`;
  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#FFFBF3;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBF3;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#fff;border-radius:20px;overflow:hidden;">
<tr><td style="padding:18px 24px;border-bottom:1px solid #F0EDF6;"><a href="${SITE_URL}" style="text-decoration:none;color:#FF6250;font-size:19px;font-weight:800;">${SITE_NAME}</a></td></tr>
<tr><td style="padding:24px;">
<p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1B1730;">${esc(t.sitterName)}님, 보호자님이 ${t.daysSince}일째 소식을 기다리고 있어요.</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#3A3452;">${esc(reactionLine)}</p>
<a href="${SITE_URL}/care-request/care-log" style="display:inline-block;background:#FF6250;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px;">돌봄일지 쓰러 가기 →</a>
<p style="margin:20px 0 0;font-size:11px;line-height:1.6;color:#9C97AC;">${esc(autonomyNote)}</p>
</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

async function sendMail(to, subject, body) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${SITE_NAME} 알림 <${MAIL_FROM}>`,
      to,
      subject,
      text: body.text,
      html: body.html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  const date = dateArg ? dateArg.split("=")[1] : todayKst();
  console.log(`대상일: ${date}${WRITE ? "" : " (드라이런)"}`);

  const { start: dayStart, end: dayEnd } = kstDayRange(date);

  // 오늘이 돌봄 기간 안에 있는 매칭확정 요청만 — 아직 시작 전이거나 이미 끝난 건 대상 아님
  const requests = await prisma.careRequest.findMany({
    where: { status: "MATCHED", startDate: { lt: dayEnd }, endDate: { gte: dayStart } },
    select: {
      id: true,
      startDate: true,
      applications: {
        where: { status: "매칭확정" },
        select: {
          sitterProfile: {
            select: { nickname: true, user: { select: { id: true, email: true } } },
          },
        },
      },
    },
  });
  console.log(`진행 중인 매칭 돌봄: ${requests.length}건`);

  const targets = [];
  for (const r of requests) {
    const app = r.applications[0];
    if (!app) continue; // 매칭확정인데 확정 지원이 없는 데이터 이상 — 조용히 건너뜀

    // 이 요청의 가장 최근 일지 — 건수가 적어(진행 중인 매칭 수준) N+1 쿼리도 부담 없다
    const lastLog = await prisma.careLog.findFirst({
      where: { careRequestId: r.id },
      orderBy: { careDate: "desc" },
      select: { careDate: true },
    });
    const baselineDate = lastLog?.careDate ?? r.startDate.toISOString().slice(0, 10);
    const daysSince = daysBetween(baselineDate, date);
    if (daysSince < REMINDER_AFTER_DAYS) continue;

    // 보호자가 마지막으로 남긴 반응 — 메일에 실제 받은 마음을 인용하기 위해(§10-5)
    const lastReacted = await prisma.careLog.findFirst({
      where: { careRequestId: r.id, guardianReaction: { not: null } },
      orderBy: { careDate: "desc" },
      select: { careDate: true, guardianReaction: true },
    });

    targets.push({
      careRequestId: r.id,
      sitterUserId: app.sitterProfile.user.id,
      sitterEmail: app.sitterProfile.user.email,
      sitterName: app.sitterProfile.nickname,
      daysSince,
      lastReaction: lastReacted?.guardianReaction ?? null,
      lastReactionDate: lastReacted?.careDate ?? null,
    });
  }
  console.log(`체크인 대상(마지막 기록 ${REMINDER_AFTER_DAYS}일 이상): ${targets.length}건`);
  if (targets.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const cooldownFrom = new Date(Date.now() - COOLDOWN_DAYS * 86400 * 1000);
  let sent = 0,
    cooled = 0,
    noEmail = 0,
    failed = 0;

  for (const t of targets) {
    const reminder = await prisma.careLogReminder.findUnique({
      where: { careRequestId: t.careRequestId },
    });
    if (reminder && reminder.sentAt >= cooldownFrom) {
      cooled++;
      continue;
    }
    if (!t.sitterEmail) {
      noEmail++;
      continue;
    }
    if (!WRITE) continue;
    if (!RESEND_KEY) continue;

    try {
      await sendMail(
        t.sitterEmail,
        `[${SITE_NAME}] 보호자님이 어르신 소식을 기다리고 있어요`,
        mailBody(t)
      );
      // ★ 발송 성공 후에 기록한다 — 실패했는데 쿨다운에 들어가면 그 사이 사흘은
      //   진짜 문제가 있어도 다시 못 보낸다.
      await prisma.careLogReminder.upsert({
        where: { careRequestId: t.careRequestId },
        create: { careRequestId: t.careRequestId },
        update: { sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`발송 실패 (${t.careRequestId}):`, String(err).slice(0, 200));
      failed++;
    }
  }

  console.log(
    `대상 ${targets.length}건 · 발송 ${sent}통 · ${COOLDOWN_DAYS}일내 재발송 제외 ${cooled} · ` +
      `이메일없음 ${noEmail} · 실패 ${failed}`
  );
  if (!WRITE) console.log("드라이런 종료 — 실제 발송하려면 --write");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
