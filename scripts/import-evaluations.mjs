// 장기요양기관 "평가 결과"(영역별 점수) 파일을 읽어 시설별 evaluationDetail을 채운다.
// 시설 상세페이지의 오각형 그래프와 "전체 평균 대비" 막대가 이 데이터로 그려진다.
//
// 준비물: 공공데이터포털 > "국민건강보험공단_장기요양기관 평가 결과" 파일(csv/xlsx)
//   https://www.data.go.kr/data/15104801/fileData.do
//   내려받은 파일을 아래 SOURCE_DIR에 그대로 넣으면 된다.
//
// 사용법: node scripts/import-evaluations.mjs          (미리보기: DB 안 건드림)
//         node scripts/import-evaluations.mjs --write  (실제 반영)

import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = "C:/Users/linea/Desktop/장기요양기관 평가 결과";
const WRITE = process.argv.includes("--write");

// 평가 5개 영역 — 컬럼명이 파일마다 조금씩 달라 키워드로 찾는다.
const DOMAIN_RULES = [
  { name: "기관운영", keywords: ["기관운영"] },
  { name: "환경 및 안전", keywords: ["환경", "안전"] },
  { name: "수급자권리보장", keywords: ["권리"] },
  { name: "급여제공과정", keywords: ["급여제공과정", "제공과정"] },
  { name: "급여제공결과", keywords: ["급여제공결과", "제공결과"] },
];

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && !line.startsWith("#")) {
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
    }
  }
  return env;
}

// 이름 비교용 정규화 — 공백/괄호/법인 접두어 차이를 흡수한다.
function normName(s) {
  return String(s)
    .replace(/\(.*?\)/g, "")
    .replace(/의료법인|사회복지법인|재단법인|사단법인|주식회사/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// 주소에서 시/군/구 토큰만 뽑아 보조 키로 쓴다.
function sigunguOf(addr) {
  const token = String(addr).trim().split(/\s+/)[1];
  return token && /(시|군|구)$/.test(token) ? token : "";
}

function findColumn(headers, keywords) {
  return headers.find((h) => keywords.every((k) => String(h).includes(k)));
}

function readRows() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`[중단] 폴더가 없습니다: ${SOURCE_DIR}`);
    console.error("공공데이터포털에서 '장기요양기관 평가 결과' 파일을 받아 이 폴더에 넣어주세요.");
    process.exit(1);
  }
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => /\.(csv|xlsx?|xls)$/i.test(f));
  if (files.length === 0) {
    console.error(`[중단] ${SOURCE_DIR} 안에 csv/xlsx 파일이 없습니다.`);
    process.exit(1);
  }

  const all = [];
  for (const file of files) {
    const wb = xlsx.readFile(path.join(SOURCE_DIR, file), { codepage: 949 });
    for (const sheetName of wb.SheetNames) {
      const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
      if (rows.length > 0) all.push(...rows);
    }
    console.log(`읽음: ${file}`);
  }
  return all;
}

const rows = readRows();
if (rows.length === 0) {
  console.error("[중단] 읽어들인 행이 없습니다.");
  process.exit(1);
}

const headers = Object.keys(rows[0]);
console.log(`\n총 ${rows.length}행 · 컬럼: ${headers.join(" | ")}\n`);

const nameCol = findColumn(headers, ["기관명"]) ?? findColumn(headers, ["기관"]);
const addrCol = findColumn(headers, ["주소"]) ?? findColumn(headers, ["소재지"]);
// 2026-06 공단 파일에는 주소 대신 관할시도/시군구 컬럼이 있다 — 동명이인 구분에 사용
const sigunguCol = findColumn(headers, ["관할시군구"]) ?? findColumn(headers, ["시군구"]);
const totalCol = findColumn(headers, ["총점"]);
const yearCol =
  findColumn(headers, ["평가구분"]) ?? findColumn(headers, ["평가연도"]) ?? findColumn(headers, ["연도"]);
const domainCols = DOMAIN_RULES.map((d) => ({ ...d, col: findColumn(headers, d.keywords) }));
// 2025년 개편 지표(4개 영역) — 구지표 점수가 없는 행은 이걸로 채운다
const DOMAIN_RULES_2025 = [
  { name: "기관운영", keywords: ["기관운영(2025)"] },
  { name: "수급자 존중", keywords: ["수급자존중(2025)"] },
  { name: "서비스 제공", keywords: ["서비스제공(2025)"] },
  { name: "서비스 결과", keywords: ["서비스결과(2025)"] },
];
const domainCols2025 = DOMAIN_RULES_2025.map((d) => ({ ...d, col: findColumn(headers, d.keywords) }));

if (!nameCol || domainCols.every((d) => !d.col)) {
  console.error("[중단] 기관명 또는 영역별 점수 컬럼을 찾지 못했습니다.");
  console.error("위에 출력된 컬럼 목록을 알려주시면 매핑을 맞춰드릴게요.");
  process.exit(1);
}
console.log(
  `매핑 → 기관명: ${nameCol} / 주소: ${addrCol ?? "없음"} / 시군구: ${sigunguCol ?? "없음"} / 총점: ${totalCol ?? "없음"}\n` +
    domainCols.map((d) => `  ${d.name}: ${d.col ?? "없음"}`).join("\n") +
    "\n" +
    domainCols2025.map((d) => `  [2025] ${d.name}: ${d.col ?? "없음"}`).join("\n")
);

const env = loadEnv();
const client = new pg.Client({ connectionString: env.DIRECT_URL });
await client.connect();

const dbRows = (await client.query(`SELECT id, name, address FROM "Facility"`)).rows;
// 같은 이름이 여러 지역에 있으므로 (정규화이름 + 시군구)를 우선 키로 쓴다.
const byNameSigungu = new Map();
const byName = new Map();
for (const f of dbRows) {
  const n = normName(f.name);
  byNameSigungu.set(`${n}|${sigunguOf(f.address)}`, f.id);
  if (!byName.has(n)) byName.set(n, []);
  byName.get(n).push(f.id);
}

const num = (v) => {
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// "2021년 정기평가" 같은 문자열에서 연도를 뽑아 최신 평가만 남기는 기준으로 쓴다
function yearOf(row) {
  const m = yearCol ? String(row[yearCol]).match(/(20\d{2})/) : null;
  return m ? Number(m[1]) : 0;
}

const byId = new Map(); // 시설당 최신 평가 1건만
let unmatched = 0;
let ambiguous = 0;

for (const row of rows) {
  // 구지표(5영역) 우선, 없으면 2025 신지표(4영역)
  let domains = domainCols
    .map((d) => ({ name: d.name, score: d.col ? num(row[d.col]) : null }))
    .filter((d) => d.score !== null);
  if (domains.length < 3) {
    domains = domainCols2025
      .map((d) => ({ name: d.name, score: d.col ? num(row[d.col]) : null }))
      .filter((d) => d.score !== null);
    if (domains.length < 3) continue; // 점수가 거의 없는 행은 건너뛴다
  }

  const n = normName(row[nameCol]);
  const sg = addrCol
    ? sigunguOf(row[addrCol])
    : sigunguCol
    ? String(row[sigunguCol]).trim().split(/\s+/)[0]
    : "";
  let id = byNameSigungu.get(`${n}|${sg}`);
  if (!id) {
    const candidates = byName.get(n);
    if (!candidates) {
      unmatched++;
      continue;
    }
    if (candidates.length > 1) {
      ambiguous++;
      continue; // 동명이 여럿이면 잘못 붙이느니 건너뛴다
    }
    id = candidates[0];
  }

  const record = {
    id,
    domains,
    totalScore: totalCol ? num(row[totalCol]) : null,
    year: yearOf(row),
    yearLabel: yearCol ? String(row[yearCol]).trim() : "",
    sigungu: sg,
  };
  const prev = byId.get(id);
  if (!prev || record.year > prev.year) byId.set(id, record);
}

const updates = [...byId.values()];

// 전체/지역 평균은 실제 수집된 총점으로 계산한다(임의의 값을 만들지 않는다).
const totals = updates.map((u) => u.totalScore).filter((t) => t !== null);
const nationalAverage =
  totals.length > 0 ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : null;

// 같은 시군구 시설들의 평균 — 상세페이지 "우리 지역 평균 대비" 막대용
const regionTotals = new Map();
for (const u of updates) {
  if (u.totalScore === null || !u.sigungu) continue;
  const slot = regionTotals.get(u.sigungu) ?? { sum: 0, count: 0 };
  slot.sum += u.totalScore;
  slot.count += 1;
  regionTotals.set(u.sigungu, slot);
}
const regionAverage = new Map(
  [...regionTotals.entries()].map(([sg, v]) => [sg, Math.round((v.sum / v.count) * 10) / 10])
);

console.log(
  `\n매칭 결과: 반영 대상 ${updates.length}건(시설당 최신 평가만) / 이름 못 찾음 ${unmatched}건 / 동명이인 모호 ${ambiguous}건`
);
console.log(`전체 평균 총점: ${nationalAverage ?? "총점 컬럼 없어 계산 불가"} / 지역 평균 산출: ${regionAverage.size}개 시군구`);

if (!WRITE) {
  console.log("\n미리보기 모드입니다. 실제로 반영하려면 --write 를 붙여 다시 실행하세요.");
  console.log("샘플:", JSON.stringify(updates.slice(0, 2), null, 2));
  await client.end();
  process.exit(0);
}

let done = 0;
for (const u of updates) {
  const detail = {
    domains: u.domains,
    totalScore: u.totalScore ?? Math.round((u.domains.reduce((a, d) => a + d.score, 0) / u.domains.length) * 10) / 10,
    evaluatedAt: u.yearLabel || "최근 정기평가",
    nationalAverage: nationalAverage ?? 0,
    // 같은 시군구 평균 — "우리 지역 평균 대비" 표시용 (시군구 시설이 3곳 미만이면 생략)
    ...(u.sigungu && regionAverage.has(u.sigungu) && regionTotals.get(u.sigungu).count >= 3
      ? { regionAverage: regionAverage.get(u.sigungu), regionName: u.sigungu }
      : {}),
  };
  await client.query(
    `UPDATE "Facility" SET extra = jsonb_set(extra, '{evaluationDetail}', $1::jsonb, true) WHERE id = $2`,
    [JSON.stringify(detail), u.id]
  );
  if (++done % 500 === 0) console.log(`  ${done}/${updates.length} 반영`);
}

console.log(`\n완료: ${done}건 반영됨.`);
await client.end();
