// 폐업 추정 집계 — "이 기간, 이 지역에서 몇 곳이 사라졌나"를 뽑는다.
//
// 근거는 Facility.missingSince (공단 일일 파일에서 처음 사라진 날 — daily-nhis-sync.mjs가
// 매일 기록하고, 다시 나타나면 null로 복구한다). 이 필드가 없으면 "몇 달 뒤에 지난 기간을
// 돌아보는" 집계가 불가능해서 만들었다.
//
// ⚠️ "폐업 확정"이 아니다: 매칭이 이름+주소 해시라 상호명 변경·이전·주소 표기 변경도
//    여기 잡힌다. 숫자를 대외에 쓸 거라면 표본을 눈으로 확인할 것.
//
// 사용법:
//   node scripts/closure-report.mjs                          # 전체 기간, 시도별
//   node scripts/closure-report.mjs --from 2026-08-01        # 기간 시작
//   node scripts/closure-report.mjs --from 2026-08-01 --to 2026-11-01
//   node scripts/closure-report.mjs --region 경기            # 그 시도의 시군구별로
//   node scripts/closure-report.mjs --confirmed              # 7일 이상 사라진 것만(노출 차단 기준과 동일)
//   node scripts/closure-report.mjs --tsv report.tsv         # 시설 목록까지 파일로

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MERGED = "전남광주통합특별시";
const GWANGJU_DISTRICTS = ["동구", "서구", "남구", "북구", "광산구"];
const CONFIRM_DAYS = 7; // lib/facilityPresence.ts의 MISSING_HIDE_DAYS와 같은 값

const TYPE_LABEL = {
  NURSING_HOME: "요양원",
  NURSING_HOSPITAL: "요양병원",
  DAY_NIGHT_CARE: "주야간보호",
  HOME_CARE: "방문요양",
  SILVER_TOWN: "실버타운",
};

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}
const FROM = arg("from");
const TO = arg("to");
const REGION = arg("region");
const TSV = arg("tsv");
const CONFIRMED_ONLY = process.argv.includes("--confirmed");

/** 주소 → 시/도 라벨. 전남광주 통합 표기는 두 번째 토큰(광주 5개 자치구)으로 가른다. */
function sidoOf(address) {
  if (address.startsWith(MERGED)) {
    const second = address.slice(MERGED.length).trim().split(/\s+/)[0] ?? "";
    return GWANGJU_DISTRICTS.includes(second) ? "광주" : "전남";
  }
  const head = address.split(/\s+/)[0] ?? "";
  if (!head) return "(주소없음)";
  // "경기도"→"경기", "강원특별자치도"→"강원", "서울특별시"→"서울"
  const m = head.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
  if (m) return m[1];
  if (head.startsWith("충청북")) return "충북";
  if (head.startsWith("충청남")) return "충남";
  if (head.startsWith("전라북")) return "전북";
  if (head.startsWith("전라남")) return "전남";
  if (head.startsWith("경상북")) return "경북";
  if (head.startsWith("경상남")) return "경남";
  // 공단 원본에 시/도가 통째로 빠진 주소가 있다("(강진읍)", "205호", "4층401호" 등).
  // 각자 지역처럼 세면 표가 지저분해지고 합계 해석이 틀어지므로 한 칸으로 모은다.
  return "(주소불명)";
}

/** 주소 → 시/군/구. 통합시는 접두어를 떼고 첫 토큰. */
function sigunguOf(address) {
  const rest = address.startsWith(MERGED) ? address.slice(MERGED.length).trim() : address;
  const parts = rest.split(/\s+/);
  const idx = address.startsWith(MERGED) ? 0 : 1;
  return parts[idx] ?? "(불명)";
}

function dbUrl() {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, "utf8").match(/^DIRECT_URL=["']?([^"'\r\n]+)/m);
    if (m) return m[1];
  }
  throw new Error("DIRECT_URL이 환경변수에도 .env.local에도 없습니다");
}

function bar(n, max, width = 24) {
  return "█".repeat(Math.max(n > 0 ? 1 : 0, Math.round((n / max) * width)));
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl() }) });
  try {
    const where = { missingSince: { not: null } };
    if (FROM || TO) {
      where.missingSince = {
        not: null,
        ...(FROM ? { gte: new Date(FROM) } : {}),
        ...(TO ? { lte: new Date(TO) } : {}),
      };
    }

    let rows = await prisma.facility.findMany({
      where,
      select: { id: true, name: true, address: true, facilityType: true, grade: true, missingSince: true },
      orderBy: { missingSince: "asc" },
    });

    if (CONFIRMED_ONLY) {
      const cutoff = Date.now() - CONFIRM_DAYS * 86_400_000;
      rows = rows.filter((r) => r.missingSince.getTime() <= cutoff);
    }
    if (REGION) {
      rows = rows.filter((r) => sidoOf(r.address) === REGION);
    }

    const period = `${FROM ?? "전체"} ~ ${TO ?? "현재"}`;
    console.log(`\n=== 폐업 추정 집계 (${period}${CONFIRMED_ONLY ? ` · ${CONFIRM_DAYS}일+ 연속만` : ""}) ===`);
    console.log(`대상: ${REGION ?? "전국"} · 총 ${rows.length.toLocaleString()}곳\n`);

    if (rows.length === 0) {
      console.log("해당 조건에 기록된 시설이 없습니다.");
      return;
    }

    // 지역별 — 시도를 지정했으면 그 안의 시군구로 한 단계 내려간다
    const keyOf = REGION ? sigunguOf : sidoOf;
    const byRegion = new Map();
    for (const r of rows) {
      const k = keyOf(r.address);
      byRegion.set(k, (byRegion.get(k) ?? 0) + 1);
    }
    const sorted = [...byRegion.entries()].sort((a, b) => b[1] - a[1]);
    const max = sorted[0][1];
    console.log(`── ${REGION ? "시군구별" : "시도별"} ──`);
    for (const [k, n] of sorted) {
      console.log(`${String(k).padEnd(12, " ")} ${String(n).padStart(4)}곳  ${bar(n, max)}`);
    }

    // 유형별
    const byType = new Map();
    for (const r of rows) {
      const k = TYPE_LABEL[r.facilityType] ?? r.facilityType;
      byType.set(k, (byType.get(k) ?? 0) + 1);
    }
    console.log(`\n── 유형별 ──`);
    for (const [k, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`${k.padEnd(12, " ")} ${String(n).padStart(4)}곳`);
    }

    // 월별 추이 — "매일 신규로 나온다"를 시간축으로 보기
    const byMonth = new Map();
    for (const r of rows) {
      const k = r.missingSince.toISOString().slice(0, 7);
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
    }
    if (byMonth.size > 1 || !FROM) {
      const monthMax = Math.max(...byMonth.values());
      console.log(`\n── 월별(사라진 달 기준) ──`);
      for (const [k, n] of [...byMonth.entries()].sort()) {
        console.log(`${k}  ${String(n).padStart(4)}곳  ${bar(n, monthMax)}`);
      }
    }

    if (TSV) {
      const out = rows
        .map((r) =>
          [
            r.missingSince.toISOString().slice(0, 10),
            r.name,
            TYPE_LABEL[r.facilityType] ?? r.facilityType,
            r.grade ?? "",
            sidoOf(r.address),
            r.address,
          ].join("\t")
        )
        .join("\n");
      fs.writeFileSync(TSV, `사라진날\t상호명\t유형\t등급\t시도\t주소\n${out}`, "utf8");
      console.log(`\n→ ${TSV} 저장 (${rows.length}행)`);
    }

    console.log(
      `\n※ 폐업 확정이 아닙니다 — 상호명 변경·이전·주소 표기 변경도 같이 잡힙니다.` +
        (CONFIRMED_ONLY ? "" : `\n   확실한 것만 보려면 --confirmed (${CONFIRM_DAYS}일 이상 연속 사라진 시설).`)
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
