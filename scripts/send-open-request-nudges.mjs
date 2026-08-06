// 지원자 없는 요청 넛지 — OPEN인 채 3일이 지났는데 지원이 0건인 돌봄 요청의 보호자에게
// "조건을 조금 조정해보세요"를 한 번 안내한다. docs/alert-system-spec.md §3-14 참고.
//
// 왜 만들었나: 지원이 안 붙는 요청은 보호자가 앱을 열어보기 전까지 아무 일도 일어나지
// 않는다 — 기다리다 지쳐 떠나는 게 최악의 결말이다. 요청은 OPEN 동안 수정할 수 있으므로
// (docs/care-flow-spec.md), 사례비·기간·내용을 손보라는 안내가 실제로 행동 가능한 제안이다.
//
// 요청당 평생 한 번만 보낸다(OpenRequestNudge가 기록). 반복하면 잔소리가 되고,
// 조건을 바꿨는데도 계속 0건이면 그건 메일이 아니라 공급(매니저 풀)의 문제다.
// 보호자는 진행 중 요청이 1건뿐이라 "사람당 메일 한 통" 원칙은 자연히 지켜진다.
//
// ⚠️ 문구에 지어낸 수치 금지("올리면 지원이 N% 늘어요" 같은 근거 없는 말) —
//    행동 가능한 제안만 나열한다.
//
// 사용법:
//   node --env-file=.env.local scripts/send-open-request-nudges.mjs           # 드라이런
//   node --env-file=.env.local scripts/send-open-request-nudges.mjs --write   # 실제 발송

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

const NUDGE_AFTER_DAYS = 3;

// lib/careLocationTypes.ts의 라벨과 같은 값(그 파일은 TS+React라 순수 node가 못 읽는다
// — send-sitter-job-alerts.mjs와 같은 사정으로 복제).
const LOCATION_TYPE_LABEL = {
  HOSPITAL: "병원 간병",
  HOUSEKEEPING: "가사 돌봄",
  HOME: "자택 돌봄",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function describeRequest(r) {
  const short = (d) => `${d.getMonth() + 1}.${d.getDate()}`;
  const label = LOCATION_TYPE_LABEL[r.locationType] ?? "돌봄";
  return `${label} · ${r.region} · ${short(r.startDate)}~${short(r.endDate)}`;
}

function mailBody(t) {
  const tips = [
    "사례비를 조금 올리거나, 지원자의 제안 사례비를 열어두고 비교해보세요",
    "돌봄 기간·시간대를 조정할 수 있다면 범위를 조금 넓혀보세요",
    "어르신 상태·해야 할 일을 구체적으로 적을수록 매니저가 지원하기 쉬워요",
  ];
  const text =
    `${t.desc} 요청을 올리신 지 ${t.daysSince}일이 지났는데 아직 지원자가 없어요.\n\n` +
    tips.map((s) => `· ${s}`).join("\n") +
    `\n\n요청은 지원자를 받는 동안 언제든 수정할 수 있어요.\n${SITE_URL}/care-request`;
  // 제안 셋은 번호를 붙여 "따라 하면 되는 순서"로 보이게 한다(막연한 조언보다 행동 가능)
  const tipItems = tips
    .map(
      (s, i) => `
<tr><td valign="top" width="26" style="padding:0 0 10px;">
  <span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;background:#FFF3F1;border-radius:999px;font-size:11px;font-weight:800;color:#EB4632;">${i + 1}</span>
</td><td style="padding:0 0 10px;font-size:13.5px;line-height:1.75;color:#3A3452;word-break:keep-all;">${esc(s)}</td></tr>`
    )
    .join("");

  const html = renderEmail({
    siteUrl: SITE_URL,
    siteName: SITE_NAME,
    preheader: `${t.desc} 요청에 아직 지원자가 없어요 — 조건을 조금 조정해보세요`,
    eyebrow: "지원자를 기다리는 중",
    title: "아직 지원자가 없어요",
    subtitle: `${t.desc} 요청을 올리신 지 ${t.daysSince}일이 지났어요.`,
    bodyHtml: `
<p style="margin:0 0 12px;font-size:14.5px;font-weight:800;color:#1B1730;word-break:keep-all;">이렇게 해보시면 어떨까요?</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tipItems}</table>`,
    ctaText: "내 요청 수정하러 가기",
    ctaHref: `${SITE_URL}/care-request`,
    note: "요청은 지원자를 받는 동안(수정·취소 가능 상태) 언제든 고칠 수 있어요. 이 안내는 요청당 한 번만 보내드려요.",
    withIntro: false, // 이미 우리 서비스를 쓰고 있는 보호자라 소개가 필요 없다
  });
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
  console.log(`지원자 없는 요청 넛지${WRITE ? "" : " (드라이런)"}`);

  // 실발송 모드인데 키가 없으면 아무것도 기록하지 않고 멈춘다 — "요청당 평생 한 번"
  // 기록을 발송도 못 한 채 소모하면 그 보호자에게는 영영 안내가 못 간다.
  if (WRITE && !RESEND_KEY) {
    console.error("RESEND_API_KEY가 없어 중단합니다(기록도 남기지 않음).");
    await prisma.$disconnect();
    process.exit(1);
  }

  const threshold = new Date(Date.now() - NUDGE_AFTER_DAYS * 86400 * 1000);
  const requests = await prisma.careRequest.findMany({
    where: { status: "OPEN", createdAt: { lte: threshold }, applications: { none: {} } },
    select: {
      id: true,
      guardianId: true,
      locationType: true,
      region: true,
      startDate: true,
      endDate: true,
      createdAt: true,
    },
  });
  console.log(`OPEN ${NUDGE_AFTER_DAYS}일+ 경과·지원 0건: ${requests.length}건`);
  if (requests.length === 0) {
    await prisma.$disconnect();
    return;
  }

  // 보호자 이메일을 한 번에 조회(CareRequest→User는 관계가 없어서 직접 잇는다)
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
    if (!email) {
      noEmail++;
      continue;
    }
    if (!WRITE) continue;

    // ★ 발송 전에 기록부터(§2 원칙) — 이미 있으면 "보낸 적 있음"으로 보고 건너뛴다.
    try {
      await prisma.openRequestNudge.create({ data: { careRequestId: r.id } });
    } catch {
      already++;
      continue;
    }

    const daysSince = Math.floor((Date.now() - r.createdAt.getTime()) / 86400000);
    try {
      await sendMail(email, `[${SITE_NAME}] 돌봄 요청에 아직 지원자가 없어요`, mailBody({
        desc: describeRequest(r),
        daysSince,
      }));
      sent++;
    } catch (err) {
      console.error(`발송 실패 (${r.id}):`, String(err).slice(0, 200));
      failed++;
    }
  }

  console.log(
    `대상 ${requests.length}건 · 발송 ${sent}통 · 이미 보냄 ${already} · 이메일없음 ${noEmail} · 실패 ${failed}`
  );
  if (!WRITE) console.log("드라이런 종료 — 실제 발송하려면 --write");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
