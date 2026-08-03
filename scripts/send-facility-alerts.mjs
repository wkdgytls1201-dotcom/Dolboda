// 관심시설 알림 발송 — 빈자리·등급 변동.
//
// 일일 수집(daily-nhis-sync.mjs)이 끝난 **뒤** 실행된다. 수집이 넘겨주는 값에 기대지 않고
// FacilitySnapshot에서 사건을 **다시 계산**한다. 그래서:
//   - 수집과 분리돼 있어 따로 재실행해도 안전하다(중복은 AlertDelivery가 막는다)
//   - 수집이 실패한 날에도 나중에 이 스크립트만 돌릴 수 있다
//
// 사건 판정 (스냅샷은 "바뀐 시설만" 적재되므로 오늘 행이 있는 시설만 본다):
//   빈자리   — 이전에는 현원 >= 정원(만실)이었는데 오늘 현원 < 정원
//   등급변동 — 이전 등급과 오늘 등급이 다름
//
// 사용법:
//   node --env-file=.env.local scripts/send-facility-alerts.mjs           # 드라이런
//   node --env-file=.env.local scripts/send-facility-alerts.mjs --write   # 실제 발송
//   node ... --date=2026-08-03                                            # 날짜 지정(기본 오늘 KST)

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

/** KST 기준 오늘 YYYY-MM-DD */
function todayKst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dolboda.kr";
const SITE_NAME = "돌보다";
const MAIL_FROM = process.env.MAIL_FROM || "onboarding@resend.dev";
const RESEND_KEY = process.env.RESEND_API_KEY;

const GRADE_LETTER = ["A", "B", "C", "D", "E"];
const gradeLabel = (g) => (g == null || g < 1 || g > 5 ? "미공개" : `${GRADE_LETTER[g - 1]}등급`);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * 한 사람에게 갈 사건들을 **메일 한 통**으로 묶는다.
 * 시설마다 따로 보내면 찜을 여러 곳 해둔 사람은 아침에 메일 폭탄을 맞는다.
 */
function mailBody(events) {
  const many = events.length > 1;
  const headline = many
    ? `관심시설 ${events.length}곳에 소식이 있어요.`
    : events[0].kind === "vacancy"
      ? "관심시설로 저장하신 곳에 입소 가능한 자리가 생겼어요."
      : "관심시설로 저장하신 곳의 평가등급이 바뀌었어요.";

  const text =
    `${headline}\n\n` +
    events
      .map((e) => `· ${e.facilityName}\n  ${e.detail}\n  ${SITE_URL}/facility/${e.facilityId}`)
      .join("\n\n") +
    `\n\n국민건강보험공단 공개자료 기준이라 실제와 다를 수 있어요. 입소 가능 여부는 시설에 직접 확인해 주세요.\n\n` +
    `알림 설정 변경: ${SITE_URL}/notifications`;

  const cards = events
    .map(
      (e) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #F0EDF6;border-radius:14px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 6px;font-size:17px;font-weight:800;color:#1B1730;">${esc(e.facilityName)}</p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3A3452;">${esc(e.detail)}</p>
    <a href="${SITE_URL}/facility/${e.facilityId}" style="color:#FF6250;font-size:14px;font-weight:700;text-decoration:none;">시설 자세히 보기 →</a>
  </td></tr>
</table>`
    )
    .join("");

  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#FFFBF3;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBF3;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#fff;border-radius:20px;overflow:hidden;">
<tr><td style="padding:18px 24px;border-bottom:1px solid #F0EDF6;"><a href="${SITE_URL}" style="text-decoration:none;color:#FF6250;font-size:19px;font-weight:800;">${SITE_NAME}</a></td></tr>
<tr><td style="padding:24px;">
<p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#1B1730;">${esc(headline)}</p>
${cards}
<p style="margin:14px 0 0;font-size:12px;line-height:1.7;color:#9C97AC;">국민건강보험공단 공개자료 기준이라 실제와 다를 수 있어요. 입소 가능 여부는 시설에 직접 확인해 주세요.</p>
</td></tr>
<tr><td style="padding:14px 24px;background:#F7F5FB;text-align:center;"><a href="${SITE_URL}/notifications" style="color:#9C97AC;font-size:12px;">알림 설정 변경·수신 거부</a></td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

function subjectOf(events) {
  if (events.length > 1) {
    return `[${SITE_NAME}] 관심시설 ${events.length}곳에 소식이 있어요`;
  }
  const e = events[0];
  return e.kind === "vacancy"
    ? `[${SITE_NAME}] ${e.facilityName}에 자리가 났어요`
    : `[${SITE_NAME}] ${e.facilityName}의 평가등급이 바뀌었어요`;
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
  console.log(`대상 수집일: ${date}${WRITE ? "" : " (드라이런)"}`);

  // 1) 오늘 스냅샷 + 그 시설의 직전 스냅샷을 한 번에 가져온다.
  //    DISTINCT ON으로 시설마다 date < 오늘 중 가장 최근 한 행만 뽑는다.
  const rows = await prisma.$queryRaw`
    SELECT t."facilityId", f.name,
           t.capacity   AS cap_now,  t."currentOccupancy" AS occ_now,  t.grade AS grade_now,
           p.capacity   AS cap_prev, p."currentOccupancy" AS occ_prev, p.grade AS grade_prev
    FROM "FacilitySnapshot" t
    JOIN "Facility" f ON f.id = t."facilityId"
    LEFT JOIN LATERAL (
      SELECT s.capacity, s."currentOccupancy", s.grade
      FROM "FacilitySnapshot" s
      WHERE s."facilityId" = t."facilityId" AND s.date < t.date
      ORDER BY s.date DESC
      LIMIT 1
    ) p ON true
    WHERE t.date = ${date}
  `;
  console.log(`오늘 변경된 시설: ${rows.length}곳`);

  // 2) 사건 판정
  const events = [];
  for (const r of rows) {
    if (r.cap_prev == null) continue; // 비교할 이전 값이 없으면(첫 기준선) 판정하지 않는다

    const capPrev = Number(r.cap_prev), occPrev = Number(r.occ_prev);
    const capNow = Number(r.cap_now), occNow = Number(r.occ_now);
    if (capPrev > 0 && occPrev >= capPrev && capNow > 0 && occNow < capNow) {
      const free = capNow - occNow;
      events.push({
        facilityId: r.facilityId,
        facilityName: r.name,
        kind: "vacancy",
        detail: `정원 ${capNow}명 중 ${free}자리가 비었어요 (어제까지는 정원이 다 찼던 곳이에요)`,
      });
    }
    if (r.grade_now != null && r.grade_prev != null && r.grade_now !== r.grade_prev) {
      // 등급은 숫자가 작을수록 좋다(1=A). 오른 것과 내린 것을 같은 문구로 알리면
      // 보호자가 방향을 오해한다 — 내려간 경우가 오히려 더 알아야 할 소식이다.
      const prev = Number(r.grade_prev), now = Number(r.grade_now);
      const improved = now < prev;
      events.push({
        facilityId: r.facilityId,
        facilityName: r.name,
        kind: "gradeChange",
        detail: improved
          ? `평가등급이 ${gradeLabel(prev)}에서 ${gradeLabel(now)}(으)로 올랐어요`
          : `평가등급이 ${gradeLabel(prev)}에서 ${gradeLabel(now)}(으)로 내려갔어요`,
      });
    }
  }
  const vac = events.filter((e) => e.kind === "vacancy").length;
  console.log(`사건: 빈자리 ${vac}건 · 등급변동 ${events.length - vac}건`);
  if (events.length === 0) {
    await prisma.$disconnect();
    return;
  }

  // 3) 수신자 조회 — 찜하고 해당 알림을 켠 사람만
  const byKey = new Map(events.map((e) => [`${e.facilityId}:${e.kind}`, e]));
  const facilityIds = [...new Set(events.map((e) => e.facilityId))];
  const subs = await prisma.facilityFavorite.findMany({
    where: {
      facilityId: { in: facilityIds },
      OR: [{ vacancyAlert: true }, { gradeChangeAlert: true }],
    },
    select: {
      facilityId: true,
      vacancyAlert: true,
      gradeChangeAlert: true,
      user: { select: { id: true, email: true } },
    },
  });

  // 4) 사람별로 묶는다 — 시설마다 따로 보내면 여러 곳 찜한 사람은 메일 폭탄을 맞는다.
  //    같은 시설은 COOLDOWN_DAYS 안에 다시 보내지 않는다: 만실↔여유를 오가는 시설이면
  //    매일 알림이 가서 결국 알림을 꺼버리게 된다.
  const COOLDOWN_DAYS = 7;
  const cooldownFrom = new Date(Date.now() - COOLDOWN_DAYS * 86400 * 1000);

  const recent = await prisma.alertDelivery.findMany({
    where: { facilityId: { in: facilityIds }, sentAt: { gte: cooldownFrom } },
    select: { userId: true, facilityId: true, kind: true },
  });
  const recentKeys = new Set(recent.map((r) => `${r.userId}:${r.facilityId}:${r.kind}`));

  /** userId → { email, events[], keys[] } */
  const byUser = new Map();
  let targeted = 0, cooled = 0, noEmail = 0;

  for (const sub of subs) {
    for (const kind of ["vacancy", "gradeChange"]) {
      const on = kind === "vacancy" ? sub.vacancyAlert : sub.gradeChangeAlert;
      if (!on) continue;
      const ev = byKey.get(`${sub.facilityId}:${kind}`);
      if (!ev) continue;
      targeted++;

      if (recentKeys.has(`${sub.user.id}:${sub.facilityId}:${kind}`)) { cooled++; continue; }

      // 카카오 로그인은 이메일 동의가 꺼져 있으면 이메일을 안 준다 — 보낼 곳이 없으면 건너뛴다
      if (!sub.user.email) { noEmail++; continue; }

      const entry = byUser.get(sub.user.id) ?? { email: sub.user.email, events: [], keys: [] };
      entry.events.push(ev);
      entry.keys.push({ facilityId: sub.facilityId, kind });
      byUser.set(sub.user.id, entry);
    }
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const [userId, entry] of byUser) {
    if (!WRITE) continue;

    // ★ 중복 방지: 보내기 **전에** 기록을 만든다. unique 제약에 걸리면 이미 보낸 것이다.
    //   발송 후에 기록하면 그 사이 재실행에서 중복이 난다.
    //   한 통에 여러 사건이 들어가므로 사건마다 행을 만들고, 하나라도 새로 만들어졌을 때만 보낸다.
    const created = [];
    for (const k of entry.keys) {
      try {
        const d = await prisma.alertDelivery.create({
          data: { userId, facilityId: k.facilityId, kind: k.kind, date, channel: "email" },
          select: { id: true },
        });
        created.push(d.id);
      } catch {
        // 이 사건은 이미 보냈다 — 묶음에서 빼고 나머지만 보낸다
      }
    }
    if (created.length === 0) { skipped++; continue; }
    if (!RESEND_KEY) { skipped++; continue; }

    try {
      await sendMail(entry.email, subjectOf(entry.events), mailBody(entry.events));
      await prisma.alertDelivery.updateMany({
        where: { id: { in: created } },
        data: { sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      // 행은 남긴다 — 재시도 때 같은 사람에게 또 보내지 않기 위해서다
      await prisma.alertDelivery.updateMany({
        where: { id: { in: created } },
        data: { error: String(err).slice(0, 300) },
      });
      failed++;
    }
  }

  console.log(
    `대상 ${targeted}건 · 수신자 ${byUser.size}명 · 발송 ${sent}통 · ` +
      `${COOLDOWN_DAYS}일내 재발송 제외 ${cooled} · 이메일없음 ${noEmail} · 건너뜀 ${skipped} · 실패 ${failed}`
  );
  if (!WRITE) console.log("드라이런 종료 — 실제 발송하려면 --write");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
