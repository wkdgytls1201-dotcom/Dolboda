// 등급테스트 재검사 리마인드 — 저장해둔 예상 구간이 오래됐으면 다시 해보라고 안내한다.
//
// 등급테스트 결과 자체는 components/GradeTest.tsx가 sessionStorage에만 두지만("탭을
// 닫으면 사라진다"), 결과 화면의 "프로필에 저장" 버튼을 타면 /mypage/care-profile로
// 넘어가며 CareProfile.estimatedBand·estimatedAt에 서버 저장된다(app/api/care-profile/
// route.ts). 그러니 재검사 리마인드는 새 저장소를 안 만들어도 된다 — 이미 있는
// estimatedAt만 보면 된다.
//
// 대상: estimatedAt이 REMIND_AFTER_DAYS일 이상 지난 CareProfile. 단, 이미 실제
// 장기요양등급(ltcGrade)을 받은 경우는 제외한다 — 그땐 "예상"보다 확정값이 있으니
// 재검사를 권할 이유가 없다.
// 쿨다운: 같은 프로필엔 COOLDOWN_DAYS 안에 다시 보내지 않는다(CareLogReminder와 같은
// 설계 — 매일 나가면 결국 알림을 꺼버리게 된다).
//
// 사용법:
//   node --env-file=.env.local scripts/send-grade-test-reminders.mjs           # 드라이런
//   node --env-file=.env.local scripts/send-grade-test-reminders.mjs --write   # 실제 발송
//   node ... --date=2026-08-04                                                 # 날짜 지정(기본 오늘 KST)

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dolboda.kr";
const SITE_NAME = "돌보다";
const MAIL_FROM = process.env.MAIL_FROM || "onboarding@resend.dev";
const RESEND_KEY = process.env.RESEND_API_KEY;

const REMIND_AFTER_DAYS = 90; // 약 3개월
const COOLDOWN_DAYS = 30; // 한 번 보낸 뒤엔 한 달은 다시 안 보낸다

// 이미 실제 등급을 받은 상태 — "없음"·"신청 준비 중"·미입력만 재검사 대상으로 본다.
const STILL_ESTIMATE_ONLY = new Set([null, "없음", "신청 준비 중"]);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function mailBody(t) {
  const text =
    `${t.relation} 등급테스트 결과를 저장하신 지 ${t.monthsSince}개월이 지났어요.\n\n` +
    `그동안 건강 상태가 달라졌을 수 있어요. 3분이면 다시 확인할 수 있어요.\n\n` +
    `${SITE_URL}/grade-test`;
  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#FFFBF3;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBF3;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#fff;border-radius:20px;overflow:hidden;">
<tr><td style="padding:18px 24px;border-bottom:1px solid #F0EDF6;"><a href="${SITE_URL}" style="text-decoration:none;color:#FF6250;font-size:19px;font-weight:800;">${SITE_NAME}</a></td></tr>
<tr><td style="padding:24px;">
<p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1B1730;">${esc(t.relation)} 등급테스트 결과를 저장하신 지 ${t.monthsSince}개월이 지났어요.</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#3A3452;">그동안 건강 상태가 달라졌을 수 있어요. 3분이면 다시 확인할 수 있어요.</p>
<a href="${SITE_URL}/grade-test" style="display:inline-block;background:#FF6250;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px;">등급테스트 다시 하러 가기 →</a>
<p style="margin:20px 0 0;font-size:11px;line-height:1.6;color:#9C97AC;">이 테스트는 참고용 예상이며 공단의 실제 등급 판정과 다를 수 있어요.</p>
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

  const threshold = new Date(Date.now() - REMIND_AFTER_DAYS * 86400 * 1000);

  const profiles = await prisma.careProfile.findMany({
    where: { estimatedAt: { not: null, lte: threshold } },
    select: {
      id: true,
      relation: true,
      estimatedAt: true,
      ltcGrade: true,
      user: { select: { id: true, email: true } },
    },
  });
  console.log(`예상 구간이 저장된 프로필 전체: 대상 후보 ${profiles.length}건`);

  const targets = profiles
    .filter((p) => STILL_ESTIMATE_ONLY.has(p.ltcGrade))
    .map((p) => ({
      careProfileId: p.id,
      relation: p.relation,
      userEmail: p.user.email,
      monthsSince: Math.round(
        (Date.now() - p.estimatedAt.getTime()) / (30 * 86400 * 1000)
      ),
    }));
  console.log(`실제 등급 미확정(재검사 대상): ${targets.length}건`);
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
    const reminder = await prisma.gradeTestReminder.findUnique({
      where: { careProfileId: t.careProfileId },
    });
    if (reminder && reminder.sentAt >= cooldownFrom) {
      cooled++;
      continue;
    }
    if (!t.userEmail) {
      noEmail++;
      continue;
    }
    if (!WRITE) continue;
    if (!RESEND_KEY) continue;

    try {
      await sendMail(
        t.userEmail,
        `[${SITE_NAME}] ${t.relation} 등급테스트, 다시 확인해보세요`,
        mailBody(t)
      );
      // ★ 발송 성공 후에 기록 — 실패한 채로 쿨다운에 들어가면 진짜 필요한 사람에게도
      //   한 달은 다시 못 보낸다.
      await prisma.gradeTestReminder.upsert({
        where: { careProfileId: t.careProfileId },
        create: { careProfileId: t.careProfileId },
        update: { sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`발송 실패 (${t.careProfileId}):`, String(err).slice(0, 200));
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
