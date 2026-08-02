// 공단(longtermcare.or.kr) 장기요양기관내역 일일 자동 수집 → DB 갱신 → 시계열 스냅샷 적재.
//
// 다운로드 구조 (2026-08-02 실측):
//   1) GET  /npbs/r/a/201/selectXLtcoSrch.web?siDoCd={시도코드}
//      - 로그인·CAPTCHA 없음. 이 요청으로 서버 세션에 검색 조건이 기록된다(쿠키 필수).
//   2) POST /npbs/r/a/201/selectLtcoSrchMapExcel.web (같은 세션)
//      - "장기요양기관내역.xlsx"가 바로 내려온다(302를 거쳐도 최종 200 + PK 매직).
//
// DB 갱신 원칙:
//   - 시설 매칭은 기존 임포트와 동일한 name+address 해시 id(nhis2-...) — 어긋날 수 없다.
//   - 정원·현원·대기·등급이 실제로 바뀐 시설만 UPDATE (하루 평균 200~300곳 수준).
//   - 신규 기관·폐업 추정은 건드리지 않고 개수만 보고(별도 스크립트 add-new-nhis-facilities.mjs 소관).
//
// 스냅샷 원칙: 바뀐 시설만 그날 값으로 적재(용량 절약). 첫 실행일은 전체 기준선을 깐다.
// 특정 날짜의 값 = 그 시설의 date <= D 중 최신 행.
//
// 사용법:
//   node scripts/daily-nhis-sync.mjs            # 드라이런 — 다운로드·비교만 하고 DB는 안 건드림
//   node scripts/daily-nhis-sync.mjs --write    # 실제 반영 (cron이 쓰는 모드)
//
// 접속 예절: 지역당 3초 간격, 하루 1회 새벽 실행 — 공단 서버에 부담을 주지 않는 수준으로 유지한다.

import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WRITE = process.argv.includes("--write");

const BASE = "https://www.longtermcare.or.kr";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 DolbodaSync/1.0";

// 공단 시도 코드 (검색 화면 select 옵션 실측값)
const REGIONS = [
  ["서울", "11"],
  ["전남광주", "12"],
  ["부산", "26"],
  ["대구", "27"],
  ["인천", "28"],
  ["대전", "30"],
  ["울산", "31"],
  ["세종", "36"],
  ["경기", "41"],
  ["충북", "43"],
  ["충남", "44"],
  ["경북", "47"],
  ["경남", "48"],
  ["제주", "50"],
  ["강원", "51"],
  ["전북", "52"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 텔레그램 알림 — TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID가 있을 때만 보낸다(없으면 조용히 스킵).
    수집 결과 요약과 실패 알림을 운영자 폰으로 바로 받아보기 위한 것. */
async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error("텔레그램 발송 실패(수집 자체는 계속):", e.message);
  }
}

/** Set-Cookie 헤더들에서 "이름=값; ..." 쿠키 문자열을 만든다 */
function cookieHeaderFrom(res) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

async function downloadRegion(siDoCd) {
  // 1) 검색 조건을 세션에 기록 (쿠키 확보)
  const res1 = await fetch(`${BASE}/npbs/r/a/201/selectXLtcoSrch.web?siDoCd=${siDoCd}`, {
    headers: { "User-Agent": UA },
  });
  if (!res1.ok) throw new Error(`검색 화면 ${res1.status}`);
  const cookie = cookieHeaderFrom(res1);
  await res1.arrayBuffer(); // 소켓 정리

  // 2) 같은 세션으로 엑셀 요청 — 302를 따라가면 최종적으로 xlsx가 온다
  const res2 = await fetch(`${BASE}/npbs/r/a/201/selectLtcoSrchMapExcel.web`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Cookie: cookie,
      Referer: `${BASE}/npbs/r/a/201/selectXLtcoSrch.web?siDoCd=${siDoCd}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `siDoCd=${siDoCd}&siGunGuCd=&gbDongRoad=&hDongCd=&orderByChoice1=1`,
  });
  const buf = Buffer.from(await res2.arrayBuffer());
  // xlsx(zip)는 "PK\x03\x04"로 시작한다 — HTML 오류 페이지가 오면 여기서 걸러진다
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
    throw new Error(`엑셀이 아님 (status=${res2.status}, ${buf.length}B, head=${buf.slice(0, 20).toString("utf8")})`);
  }
  return buf;
}

/* ---------- 파싱 (import-nhis-v2.mjs와 동일 규칙 — id가 같게 나와야 한다) ---------- */

function mapFacilityType(raw) {
  if (raw.includes("주야간보호")) return "DAY_NIGHT_CARE";
  if (raw.includes("방문요양") || raw.includes("방문목욕") || raw.includes("방문간호"))
    return "HOME_CARE";
  if (raw.includes("노인요양") || raw.includes("치매전담실") || raw.includes("공동생활가정"))
    return "NURSING_HOME";
  return null;
}

function parseGrade(raw) {
  const first = raw.split("\n")[0].trim();
  const m = /^([A-E])/.exec(first);
  return m ? { A: 1, B: 2, C: 3, D: 4, E: 5 }[m[1]] : null;
}

function num(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function parseWorkbook(buf, byKey) {
  const wb = xlsx.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const data = rows.slice(3).filter((r) => r.some((v) => v !== ""));

  for (const r of data) {
    const [, name, benefitTypeRaw, gradeRaw, capacity, occupancy, , waitlist, , addrRaw] = r;
    const facilityType = mapFacilityType(String(benefitTypeRaw));
    if (!facilityType) continue;
    const address = String(addrRaw).trim();
    const nm = String(name).trim();
    if (!nm || !address) continue;

    const key = `${nm}|${address}`;
    const existing = byKey.get(key);
    if (existing) {
      // 한 기관이 급여종류별로 여러 행 — 정원·현원·대기는 합산(기존 임포트와 동일)
      existing.capacity += num(capacity);
      existing.currentOccupancy += num(occupancy);
      existing.waitlistCount += num(waitlist);
      if (existing.grade == null) existing.grade = parseGrade(String(gradeRaw));
    } else {
      byKey.set(key, {
        id: `nhis2-${hashId(nm + address)}`,
        name: nm, // 텔레그램 특이사항 보고용
        grade: parseGrade(String(gradeRaw)),
        capacity: num(capacity),
        currentOccupancy: num(occupancy),
        waitlistCount: num(waitlist),
      });
    }
  }
  return data.length;
}

/* ---------------------------------- 메인 ---------------------------------- */

function dbUrl() {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, "utf8").match(/^DIRECT_URL=["']?([^"'\r\n]+)/m);
    if (m) return m[1];
  }
  throw new Error("DIRECT_URL이 환경변수에도 .env.local에도 없습니다");
}

async function main() {
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST
  console.log(`=== 공단 일일 수집 ${today} (${WRITE ? "반영" : "드라이런"}) ===`);

  // 1) 16개 지역 다운로드 + 파싱
  const byKey = new Map();
  let rawRows = 0;
  for (const [label, cd] of REGIONS) {
    let buf;
    try {
      buf = await downloadRegion(cd);
    } catch (e) {
      // 한 지역이 실패해도 전체를 중단하지 않되, 실패는 반드시 표면화한다
      console.error(`✗ ${label}(${cd}) 다운로드 실패: ${e.message}`);
      process.exitCode = 1;
      await sleep(3000);
      continue;
    }
    const n = parseWorkbook(buf, byKey);
    rawRows += n;
    console.log(`✓ ${label} ${Math.round(buf.length / 1024)}KB · ${n}행`);
    await sleep(3000); // 접속 예절
  }
  console.log(`원본 ${rawRows}행 → 고유 시설 ${byKey.size}곳`);
  if (byKey.size < 20000) {
    // 정상 시 27,000곳 안팎 — 확 줄었다면 사이트 구조 변경이나 부분 실패로 보고 반영하지 않는다
    throw new Error(`고유 시설 수가 비정상적으로 적음(${byKey.size}) — 반영 중단`);
  }

  // 2) DB 현재값과 비교
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl() }) });
  try {
    const current = await prisma.$queryRaw`
      SELECT id, grade,
             COALESCE((extra->>'capacity')::int, 0)         AS capacity,
             COALESCE((extra->>'currentOccupancy')::int, 0) AS occupancy,
             COALESCE((extra->>'waitlistCount')::int, 0)    AS waitlist
      FROM "Facility" WHERE id LIKE 'nhis2-%'
    `;
    const currentById = new Map(current.map((c) => [c.id, c]));

    const changed = [];
    const gradeChanges = []; // 특이사항: 등급이 바뀐 시설 (안심지수에 영향)
    let vacancyOpened = 0; // 특이사항: 만원이었다가 자리가 난 시설 수
    let unknown = 0;
    for (const f of byKey.values()) {
      const cur = currentById.get(f.id);
      if (!cur) {
        unknown++; // 신규 기관 — 여기서는 세지만 만들지 않는다
        continue;
      }
      if (
        cur.capacity !== f.capacity ||
        cur.occupancy !== f.currentOccupancy ||
        cur.waitlist !== f.waitlistCount ||
        (f.grade != null && cur.grade !== f.grade)
      ) {
        changed.push(f);
        if (f.grade != null && cur.grade !== f.grade) {
          const L = ["A", "B", "C", "D", "E"];
          gradeChanges.push(
            `${f.name}: ${cur.grade ? L[cur.grade - 1] : "없음"}→${L[f.grade - 1]}`
          );
        }
        if (
          cur.capacity > 0 &&
          cur.occupancy >= cur.capacity &&
          f.capacity > 0 &&
          f.currentOccupancy < f.capacity
        ) {
          vacancyOpened++;
        }
      }
    }
    const missing = current.length - (byKey.size - unknown);
    console.log(
      `변경 ${changed.length}곳 · 신규(미반영) ${unknown}곳 · 이번 파일에 없는 기존 시설 ${missing}곳`
    );

    if (!WRITE) {
      console.log("드라이런 종료 — 반영하려면 --write");
      return;
    }

    // 3) 변경분 UPDATE (jsonb 병합 + grade/sourceUpdatedAt 컬럼)
    // 직결(non-pooled) 커넥션 하나라 병렬로 쏘면 pg가 큐잉 경고를 낸다 — 순차로 보낸다.
    // 하루 수백 건 수준이라 순차여도 1분 안쪽.
    for (const f of changed) {
      await prisma.$executeRaw`
        UPDATE "Facility"
        SET grade = ${f.grade},
            "sourceUpdatedAt" = ${today},
            "updatedAt" = now(),
            extra = extra || jsonb_build_object(
              'capacity', ${f.capacity}::int,
              'currentOccupancy', ${f.currentOccupancy}::int,
              'waitlistCount', ${f.waitlistCount}::int
            )
        WHERE id = ${f.id}
      `;
    }
    console.log(`UPDATE 완료: ${changed.length}곳`);

    // 4) 스냅샷 적재 — 첫 실행이면 전체 기준선, 이후엔 변경분만
    const [{ n: snapCount }] = await prisma.$queryRaw`
      SELECT count(*)::int n FROM "FacilitySnapshot"
    `;
    const snapshotRows = (snapCount === 0 ? [...byKey.values()].filter((f) => currentById.has(f.id)) : changed).map(
      (f) => ({
        facilityId: f.id,
        date: today,
        capacity: f.capacity,
        currentOccupancy: f.currentOccupancy,
        waitlistCount: f.waitlistCount,
        grade: f.grade,
      })
    );
    if (snapshotRows.length > 0) {
      await prisma.facilitySnapshot.createMany({ data: snapshotRows, skipDuplicates: true });
    }
    console.log(
      `스냅샷 적재: ${snapshotRows.length}행 (${snapCount === 0 ? "첫 실행 — 전체 기준선" : "변경분만"})`
    );

    // 5) 텔레그램 요약 — 숫자 나열이 아니라 "무슨 일이 있었나"가 보이게 구성
    const lines = [
      `🏥 돌보다 일일 수집 (${today})`,
      `· 전국 ${byKey.size.toLocaleString()}곳 확인, ${changed.length.toLocaleString()}곳 변경 반영`,
      `· 자리 새로 난 시설(만원→여유): ${vacancyOpened}곳`,
    ];
    if (gradeChanges.length > 0) {
      lines.push(`· 등급 변동 ${gradeChanges.length}곳${gradeChanges.length <= 5 ? ":" : " (상위 5):"}`);
      for (const g of gradeChanges.slice(0, 5)) lines.push(`   - ${g}`);
    }
    if (unknown > 0) lines.push(`· 신규 기관 ${unknown}곳 감지 (미등록 — 추가는 별도 작업)`);
    if (missing > 0) lines.push(`· 파일에서 사라진 기관 ${missing}곳 (폐업 가능성)`);
    await sendTelegram(lines.join("\n"));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error("실패:", e);
  await sendTelegram(`⚠️ 돌보다 일일 수집 실패\n${String(e.message || e).slice(0, 300)}\n(GitHub Actions 로그를 확인하세요)`);
  process.exit(1);
});
