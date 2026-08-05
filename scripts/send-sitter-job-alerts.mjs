// 매니저(시터)용 "새 일자리 알림" — 내 활동 지역에 새 돌봄 요청(공고)이 올라오면 메일로 알려준다.
//
// 이 파일은 매일 아침 자동으로 실행되는 "배치 스크립트"다(GitHub Actions가 스케줄러
// 역할을 한다 — .github/workflows/send-sitter-job-alerts.yml 참고). 사람이 직접 실행할
// 수도 있고, 실제 발송 없이 "누구에게 뭘 보낼 예정인지"만 눈으로 확인하는 "드라이런"
// 모드도 있다(아래 사용법 참고).
//
// 왜 이제서야 만들었나: 이 알림을 받으려면 두 가지가 필요하다.
//   1) "이 사람이 새 일자리 알림을 원한다"는 정보 (→ SitterNotificationPref, 2026-08-04에
//      localStorage에서 서버로 옮겼다)
//   2) "이 사람의 활동 지역이 어디인지" (→ SitterProfile.regions, 원래부터 서버에 있었다)
// 1번이 서버에 없었을 때는 "누구에게 보낼지" 자체를 알 수 없어서 이 기능을 만들 수
// 없었다. 이제 둘 다 서버에 있으니 만들 수 있다.
//
// 판정 로직 (한 줄 요약: 오늘 새로 올라온 공고 × 그 지역이 활동지역인 매니저 × 알림 켠 사람):
//   1) 오늘(KST) 새로 만들어진 CareRequest(돌봄 요청 = 매니저 입장에서는 "채용 공고")를 찾는다.
//      CareRequest에는 이미 region 필드(시/도)가 그대로 저장돼 있어서, 시설 알림
//      스크립트(send-facility-alerts.mjs)처럼 주소를 파싱해 지역을 추론할 필요가 없다 —
//      훨씬 간단하다.
//   2) 그 지역이 활동 지역(SitterProfile.regions)에 포함된 매니저를 찾는다.
//   3) 그중 SitterNotificationPref.newJob이 켜진(또는 아직 한 번도 설정을 안 바꿔서 기본값
//      true인) 사람에게만 보낸다.
//   4) 한 사람에게 오늘 새 공고가 여러 개면 메일 한 통에 묶어서 보낸다("메일 폭탄" 방지 —
//      다른 알림 스크립트들과 같은 원칙).
//   5) 같은 사람 + 같은 공고 조합에는 절대 두 번 안 보낸다(SitterJobAlertDelivery로 기록).
//      공고는 "오늘 새로 생김"이 평생 한 번뿐인 사건이라 쿨다운(며칠 안엔 다시 안 보냄)
//      개념 자체가 필요 없다 — 시설·일지·등급테스트 알림과 다른 점이다.
//
// 사용법:
//   node --env-file=.env.local scripts/send-sitter-job-alerts.mjs           # 드라이런(실제 발송 안 함)
//   node --env-file=.env.local scripts/send-sitter-job-alerts.mjs --write   # 실제 발송
//   node ... --date=2026-08-04                                              # 그 하루만 지정(기본은 어제~오늘 이틀 창)

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

// process.argv는 "이 스크립트를 실행할 때 뒤에 붙인 옵션들"이 담긴 배열이다.
// 예: `node script.mjs --write --date=2026-08-04` → ["--write", "--date=2026-08-04", ...]
const WRITE = process.argv.includes("--write");
const dateArg = process.argv.find((a) => a.startsWith("--date="));

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** 지금(UTC) 시각을 한국 시각(KST = UTC+9시간) 기준 "YYYY-MM-DD" 문자열로 바꾼다. */
function todayKst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * "2026-08-04" 같은 날짜 문자열을 받아, 그 하루(한국 시각 자정~다음 날 자정)에 해당하는
 * 시작·끝 시각을 돌려준다. 데이터베이스의 시각은 전부 UTC로 저장돼 있어서, "오늘 하루"를
 * 정확히 구하려면 이렇게 시간대(+09:00)를 명시해서 계산해야 한다.
 */
function kstDayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start, end };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dolboda.kr";
const SITE_NAME = "돌보다";
const MAIL_FROM = process.env.MAIL_FROM || "onboarding@resend.dev";
const RESEND_KEY = process.env.RESEND_API_KEY;

// lib/careLocationTypes.ts의 라벨과 같은 값. 그 파일은 TypeScript + React 아이콘까지
// 포함하고 있어서 이 순수 node 스크립트가 통째로 가져다 쓸 수 없다(TS 컴파일 단계가
// 없는 스크립트라서) — 그래서 필요한 라벨만 여기 그대로 옮겨 적었다.
const LOCATION_TYPE_LABEL = {
  HOSPITAL: "병원 간병",
  HOUSEKEEPING: "가사 돌봄",
  HOME: "자택 돌봄",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** "2026-08-04" 같은 날짜 문자열을 "8.4"처럼 짧게 보여주는 형식으로 바꾼다. */
function shortDate(d) {
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function describeJob(req) {
  const typeLabel = LOCATION_TYPE_LABEL[req.locationType] ?? "돌봄";
  const period = `${shortDate(req.startDate)}~${shortDate(req.endDate)}`;
  const pay =
    req.budgetAmount != null
      ? `${req.budgetUnit === "시간" ? "시간당" : "하루"} ${req.budgetAmount.toLocaleString()}원 희망`
      : null;
  return [typeLabel, req.region, period, pay].filter(Boolean).join(" · ");
}

/** 한 사람에게 갈 새 공고들을 메일 한 통으로 묶는다. */
function mailBody(jobs) {
  const many = jobs.length > 1;
  const headline = many
    ? `내 활동 지역에 새 돌봄 공고가 ${jobs.length}건 올라왔어요.`
    : "내 활동 지역에 새 돌봄 공고가 올라왔어요.";

  const text =
    `${headline}\n\n` +
    jobs.map((j) => `· ${j.desc}\n  ${SITE_URL}/mypage/sitter/jobs`).join("\n\n") +
    `\n\n알림 설정 변경: ${SITE_URL}/mypage/sitter/notifications`;

  const cards = jobs
    .map(
      (j) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #F0EDF6;border-radius:14px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0;font-size:14px;line-height:1.6;color:#3A3452;">${esc(j.desc)}</p>
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
<a href="${SITE_URL}/mypage/sitter/jobs" style="display:inline-block;margin-top:4px;background:#FF6250;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px;">일자리 보러 가기 →</a>
</td></tr>
<tr><td style="padding:14px 24px;background:#F7F5FB;text-align:center;"><a href="${SITE_URL}/mypage/sitter/notifications" style="color:#9C97AC;font-size:12px;">알림 설정 변경</a></td></tr>
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

/** dateStr의 하루 전 날짜 문자열. */
function prevDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  return new Date(d.getTime() - 24 * 3600 * 1000 + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

async function main() {
  const date = dateArg ? dateArg.split("=")[1] : todayKst();

  // 기본 실행(--date 없음)은 어제~오늘 이틀 창으로 본다. 크론이 09:00 KST 하루 한 번이라
  // 당일 창만 보면 09:00 이후 올라온 공고는 당일 실행엔 아직 없고 다음날 실행은 다음날
  // 날짜를 봐서 영영 알림이 안 나갔다(실측: 8/4 경기·8/5 울산 공고 발송 기록 0건).
  // 창이 겹쳐도 SitterJobAlertDelivery의 [userId, careRequestId] 유니크(발송 전 기록)가
  // 중복 발송을 막는다. --date 지정 시엔 그 하루만(수동 재발송·검증용 의미 유지).
  const { start: dayStart } = kstDayRange(dateArg ? date : prevDay(date));
  const { end: dayEnd } = kstDayRange(date);
  console.log(`대상 창: ${dateArg ? date : `${prevDay(date)}~${date}`}${WRITE ? "" : " (드라이런)"}`);

  // 1) 창 안에 새로 등록된 공고. status가 OPEN인 것만(취소·마감된 걸 새로 올라온 것처럼
  //    알리면 안 된다 — 어제 올라왔어도 지금 닫혔으면 제외되는 게 맞다).
  const newJobs = await prisma.careRequest.findMany({
    where: { status: "OPEN", createdAt: { gte: dayStart, lt: dayEnd } },
    select: {
      id: true,
      region: true,
      locationType: true,
      startDate: true,
      endDate: true,
      budgetAmount: true,
      budgetUnit: true,
    },
  });
  console.log(`창 안에 새로 올라온 공고: ${newJobs.length}건`);
  if (newJobs.length === 0) {
    await prisma.$disconnect();
    return;
  }

  // 2) 그 지역들에 활동하는 매니저를 찾는다. `hasSome`은 "배열 필드 안에 이 값들 중
  //    하나라도 포함돼 있으면"이라는 뜻 — 매니저가 여러 지역을 골라둘 수 있어서
  //    (SitterProfile.regions는 배열) 이 방식으로 찾는다.
  const regionsInvolved = [...new Set(newJobs.map((j) => j.region))];
  const sitters = await prisma.sitterProfile.findMany({
    where: { regions: { hasSome: regionsInvolved } },
    select: { regions: true, user: { select: { id: true, email: true } } },
  });
  console.log(`활동 지역이 겹치는 매니저: ${sitters.length}명`);

  // 3) 그중 "새 일자리 알림"을 켜둔 사람만. 아직 한 번도 설정을 안 바꾼 사람은 서버에
  //    행 자체가 없는데, 기본값이 "켜짐"이므로 그런 사람도 포함시킨다
  //    (app/api/sitter/notification-prefs/route.ts의 DEFAULT_PREFS와 같은 값이어야 한다).
  const userIds = sitters.map((s) => s.user.id);
  const prefs = await prisma.sitterNotificationPref.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, newJob: true },
  });
  const optedOut = new Set(prefs.filter((p) => !p.newJob).map((p) => p.userId));

  // 4) "사람별로 어떤 공고를 보여줄지" 묶는다. 한 사람이 여러 지역에 걸쳐 있고 그
  //    지역들에 공고가 여러 개면, 전부 한 통에 모은다.
  /** userId → { email, jobs: [{desc}] } */
  const byUser = new Map();
  let targeted = 0,
    noEmail = 0;

  for (const sitter of sitters) {
    if (optedOut.has(sitter.user.id)) continue;

    const matchedJobs = newJobs.filter((j) => sitter.regions.includes(j.region));
    if (matchedJobs.length === 0) continue;

    targeted += matchedJobs.length;

    if (!sitter.user.email) {
      noEmail++;
      continue;
    }

    const entry = byUser.get(sitter.user.id) ?? { email: sitter.user.email, jobs: [] };
    for (const j of matchedJobs) {
      entry.jobs.push({ careRequestId: j.id, desc: describeJob(j) });
    }
    byUser.set(sitter.user.id, entry);
  }

  let sent = 0,
    skipped = 0,
    failed = 0;

  for (const [userId, entry] of byUser) {
    if (!WRITE) continue;

    // ★ 중복 방지: 메일을 보내기 전에 먼저 "보낼 예정" 기록부터 만든다. 이미 기록이
    //   있으면(unique 제약에 걸려 실패하면) "아, 이 사람에게 이 공고는 이미 처리했구나"로
    //   보고 건너뛴다. 메일을 보낸 "다음에" 기록하면, 메일 발송은 성공했는데 기록
    //   저장이 실패하는 그 짧은 틈에 스크립트가 재시도되면 같은 메일이 두 번 나갈 수
    //   있다 — 그래서 반드시 순서를 "기록 먼저, 발송 나중"으로 한다.
    const created = [];
    for (const j of entry.jobs) {
      try {
        await prisma.sitterJobAlertDelivery.create({
          data: { userId, careRequestId: j.careRequestId },
        });
        created.push(j);
      } catch {
        // 이미 보낸 적 있는 공고 — 이번 묶음에서 빼고 나머지만 보낸다
      }
    }
    if (created.length === 0) {
      skipped++;
      continue;
    }
    if (!RESEND_KEY) {
      skipped++;
      continue;
    }

    const subject =
      created.length > 1
        ? `[${SITE_NAME}] 내 활동 지역에 새 돌봄 공고가 ${created.length}건 올라왔어요`
        : `[${SITE_NAME}] 내 활동 지역에 새 돌봄 공고가 올라왔어요`;

    try {
      await sendMail(entry.email, subject, mailBody(created));
      await prisma.sitterJobAlertDelivery.updateMany({
        where: { userId, careRequestId: { in: created.map((j) => j.careRequestId) } },
        data: { sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      // 기록은 남겨둔다(sentAt은 비워둔 채) — 다음 재시도 때 같은 사람에게 또
      // 보내지 않고, 실패 사유도 남길 수 있게.
      await prisma.sitterJobAlertDelivery.updateMany({
        where: { userId, careRequestId: { in: created.map((j) => j.careRequestId) } },
        data: { error: String(err).slice(0, 300) },
      });
      failed++;
    }
  }

  console.log(
    `대상(공고×매니저) ${targeted}건 · 수신자 ${byUser.size}명 · 발송 ${sent}통 · ` +
      `이메일없음 ${noEmail} · 건너뜀 ${skipped} · 실패 ${failed}`
  );
  if (!WRITE) console.log("드라이런 종료 — 실제 발송하려면 --write");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
