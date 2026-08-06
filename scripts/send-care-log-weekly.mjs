// 돌봄일지 주간 요약 — 지난 한 주 기록을 보호자에게 한 통으로 묶어 보낸다.
// docs/alert-system-spec.md §3-15 참고.
//
// 왜 만들었나: 일지 도착 알림(§3-12)은 "오늘 기록이 생겼다"만 알려서, 매일 열어보지
// 않는 보호자는 큰 그림을 못 본다 — 이번 주에 며칠 기록됐는지, 식사는 어떠셨는지,
// 특이사항이 있었는지. 주 1회 요약이 그 자리를 채운다.
//
// ★ 매니저를 향한 압박이 되지 않게 쓴다(care-log-spec §10-5 · 매니저 법적 거리 방침):
//   "기록이 며칠 빠졌다"를 지적하거나 독촉을 유도하는 문구를 넣지 않는다. 있는 것을
//   그대로 전하고, 없는 날은 "기록이 없는 날도 있어요"로 담담히 둔다.
//
// 발송 조건: 지난 주(월~일)에 기록이 1건 이상 있는 MATCHED·COMPLETED 돌봄 건.
//   기록이 0건이면 보내지 않는다 — 빈 요약은 매니저에 대한 무언의 지적이 된다.
// 중복 방지: CareLogWeeklyDigest(careRequestId+weekOf) — 발송 전에 기록부터(§2 원칙).
// 보호자는 진행 중 요청이 1건이라 "사람당 메일 한 통"은 자연히 지켜진다.
//
// 사용법(월요일 아침 크론):
//   node --env-file=.env.local scripts/send-care-log-weekly.mjs           # 드라이런
//   node --env-file=.env.local scripts/send-care-log-weekly.mjs --write   # 실제 발송

import { createRequire } from "module";
import { renderEmail } from "./lib/emailShell.mjs";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const WRITE = process.argv.includes("--write");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dolboda.kr";
const SITE_NAME = "돌보다";
const MAIL_FROM = process.env.MAIL_FROM || "onboarding@resend.dev";
const RESEND_KEY = process.env.RESEND_API_KEY;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** KST 오늘 날짜(YYYY-MM-DD) */
function todayKst() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/** 지난 주 월요일~일요일 (KST). 월요일에 돌리면 딱 직전 한 주가 잡힌다. */
function lastWeekRange(today = todayKst()) {
  const d = new Date(`${today}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=일 … 1=월
  const daysSinceMonday = (dow + 6) % 7;
  const thisMonday = new Date(d.getTime() - daysSinceMonday * 86400000);
  const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
  const lastSunday = new Date(thisMonday.getTime() - 86400000);
  return {
    weekOf: lastMonday.toISOString().slice(0, 10),
    from: lastMonday.toISOString().slice(0, 10),
    to: lastSunday.toISOString().slice(0, 10),
  };
}

/** 하루에 정정이 여러 행일 수 있으니 날짜별 최신 한 건만 센다(화면 셈법과 동일) */
function latestPerDay(logs) {
  const byDate = new Map();
  for (const l of [...logs].sort((a, b) => a.createdAt - b.createdAt)) byDate.set(l.careDate, l);
  return [...byDate.values()];
}

function mailBody(t) {
  const lines = [`${t.from} ~ ${t.to}`, `기록한 날 ${t.dayCount}일`];
  if (t.mealGood > 0) lines.push(`식사 잘하신 날 ${t.mealGood}일`);
  if (t.alertCount > 0) lines.push(`알려드린 일 ${t.alertCount}건`);
  if (t.photoCount > 0) lines.push(`사진 ${t.photoCount}장`);

  const memoLine = t.memo ? `\n\n${t.sitterNickname}님이 남긴 한마디\n“${t.memo}”` : "";
  const text =
    `지난 주 ${t.sitterNickname}님이 남긴 돌봄 기록을 정리했어요.\n\n` +
    lines.map((s) => `· ${s}`).join("\n") +
    memoLine +
    `\n\n기록 전체 보기: ${SITE_URL}/care-request/care-log\n\n` +
    `기록이 없는 날도 있을 수 있어요. 돌봄일지는 매니저님이 자율적으로 남기는 기록이에요.`;

  // 숫자는 목록보다 타일이 눈에 잘 들어온다 — 주간 요약의 핵심이 "며칠·얼마나"라서
  const tiles = lines
    .slice(1)
    .map((s) => {
      const m = s.match(/^(.*?)\s*(\d+[가-힣]*)$/);
      const label = m ? m[1] : s;
      const value = m ? m[2] : "";
      return `<td width="33%" align="center" style="padding:12px 6px;background:#FFF7E9;border-radius:14px;">
<div style="font-size:19px;font-weight:800;color:#B15E13;">${esc(value)}</div>
<div style="margin-top:3px;font-size:11.5px;color:#9A7B52;">${esc(label)}</div></td>`;
    })
    .join('<td width="8">&nbsp;</td>');

  const bodyHtml = `
<p style="margin:0 0 14px;font-size:14.5px;line-height:1.8;color:#3A3452;word-break:keep-all;">
  ${esc(t.sitterNickname)}님이 <strong style="color:#1B1730;">${t.dayCount}일</strong> 기록을 남기셨어요.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tiles}</tr></table>
${
  t.memo
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;background:#FFF4F2;border-radius:15px;">
<tr><td style="padding:15px 17px;">
<p style="margin:0 0 5px;font-size:11.5px;font-weight:800;color:#C93524;">${esc(t.sitterNickname)}님이 남긴 한마디</p>
<p style="margin:0;font-size:14.5px;line-height:1.8;color:#3A3452;font-style:italic;word-break:keep-all;">&ldquo;${esc(t.memo)}&rdquo;</p>
</td></tr></table>`
    : ""
}`;

  const html = renderEmail({
    siteUrl: SITE_URL,
    siteName: SITE_NAME,
    preheader: t.memo
      ? `${t.sitterNickname}님: "${t.memo.slice(0, 40)}"`
      : `기록한 날 ${t.dayCount}일 · ${t.from} ~ ${t.to}`,
    eyebrow: `${t.from} ~ ${t.to}`,
    title: "지난 주 돌봄 기록을 정리했어요",
    bodyHtml,
    ctaText: "기록 전체 보기",
    ctaHref: `${SITE_URL}/care-request/care-log`,
    note: "기록이 없는 날도 있을 수 있어요. 돌봄일지는 매니저님이 자율적으로 남기는 기록이에요. 이 요약은 기록이 있었던 주에만 한 번 보내드려요.",
  });
  return { text, html };
}

async function sendMail(to, subject, body) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${SITE_NAME} 돌봄일지 <${MAIL_FROM}>`,
      to,
      subject,
      text: body.text,
      html: body.html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  const { weekOf, from, to } = lastWeekRange();
  console.log(`돌봄일지 주간 요약 ${from}~${to}${WRITE ? "" : " (드라이런)"}`);

  // 실발송인데 키가 없으면 아무것도 기록하지 않고 멈춘다 — 기록만 소모하면
  // 그 주 요약은 영영 안 나간다(§3-14와 같은 이유).
  if (WRITE && !RESEND_KEY) {
    console.error("RESEND_API_KEY가 없어 중단합니다(기록도 남기지 않음).");
    await prisma.$disconnect();
    process.exit(1);
  }

  const logs = await prisma.careLog.findMany({
    where: { careDate: { gte: from, lte: to } },
    select: {
      careRequestId: true,
      careDate: true,
      createdAt: true,
      meal: true,
      memo: true,
      alertNote: true,
      photos: true,
    },
  });
  if (logs.length === 0) {
    console.log("지난 주 기록이 없습니다.");
    await prisma.$disconnect();
    return;
  }

  const byRequest = new Map();
  for (const l of logs) {
    const list = byRequest.get(l.careRequestId) ?? [];
    list.push(l);
    byRequest.set(l.careRequestId, list);
  }
  console.log(`기록이 있는 돌봄 건: ${byRequest.size}건`);

  const requests = await prisma.careRequest.findMany({
    where: { id: { in: [...byRequest.keys()] }, status: { in: ["MATCHED", "COMPLETED"] } },
    select: {
      id: true,
      guardianId: true,
      applications: {
        where: { status: { in: ["매칭확정", "돌봄완료"] } },
        select: { sitterProfile: { select: { nickname: true } } },
      },
    },
  });

  const guardians = await prisma.user.findMany({
    where: { id: { in: [...new Set(requests.map((r) => r.guardianId))] } },
    select: { id: true, email: true },
  });
  const emailById = new Map(guardians.map((g) => [g.id, g.email]));

  let sent = 0,
    already = 0,
    noEmail = 0,
    failed = 0;

  for (const r of requests) {
    const email = emailById.get(r.guardianId);
    const nickname = r.applications[0]?.sitterProfile?.nickname;
    if (!email || !nickname) {
      noEmail++;
      continue;
    }

    const perDay = latestPerDay(byRequest.get(r.id) ?? []);
    if (perDay.length === 0) continue;

    const stats = {
      sitterNickname: nickname,
      from,
      to,
      dayCount: perDay.length,
      mealGood: perDay.filter((l) => l.meal === "잘 드심").length,
      alertCount: perDay.filter((l) => l.alertNote).length,
      photoCount: perDay.reduce((n, l) => n + (Array.isArray(l.photos) ? l.photos.length : 0), 0),
      // 그 주의 마지막 한마디 — 숫자보다 이 한 줄이 보호자에게 가장 크게 남는다
      memo: [...perDay].reverse().find((l) => l.memo)?.memo ?? null,
    };

    if (!WRITE) {
      console.log(`  [드라이런] ${nickname} → ${email} · ${stats.dayCount}일`);
      continue;
    }

    // ★ 발송 전에 기록부터(§2 원칙)
    try {
      await prisma.careLogWeeklyDigest.create({ data: { careRequestId: r.id, weekOf } });
    } catch {
      already++;
      continue;
    }

    try {
      await sendMail(email, `[${SITE_NAME}] 지난 주 돌봄 기록 요약`, mailBody(stats));
      sent++;
    } catch (err) {
      console.error(`발송 실패 (${r.id}):`, String(err).slice(0, 200));
      failed++;
    }
  }

  console.log(
    `대상 ${requests.length}건 · 발송 ${sent}통 · 이미 보냄 ${already} · 이메일/매니저없음 ${noEmail} · 실패 ${failed}`
  );
  if (!WRITE) console.log("드라이런 종료 — 실제 발송하려면 --write");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
