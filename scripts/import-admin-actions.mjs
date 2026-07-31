// 장기요양기관 "행정처분(위반사실 공표)" 파일을 읽어 시설별 adminActions를 채운다.
// 시설 상세페이지와 카드에 경고 배지를 띄우는 근거 데이터.
//
// 준비물: 공공데이터포털 또는 노인장기요양보험 홈페이지의 행정처분/위반사실 공표 파일(csv/xlsx)
//   - 국민건강보험공단_장기요양기관 행정처분내역 (data.go.kr에서 "장기요양 행정처분" 검색)
//   - 노인장기요양보험 홈페이지 > 알림·자료실 > 장기요양기관 지정취소·업무정지 공표
//   내려받은 파일을 아래 SOURCE_DIR에 그대로 넣으면 된다.
//
// 사용법: node scripts/import-admin-actions.mjs          (미리보기: DB 안 건드림)
//         node scripts/import-admin-actions.mjs --write  (실제 반영)

import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = "C:/Users/linea/Desktop/장기요양 행정처분";
const WRITE = process.argv.includes("--write");

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

function normName(s) {
  return String(s)
    .replace(/\(.*?\)/g, "")
    .replace(/의료법인|사회복지법인|재단법인|사단법인|주식회사/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function sigunguOf(addr) {
  const token = String(addr).trim().split(/\s+/)[1];
  return token && /(시|군|구)$/.test(token) ? token : "";
}

function findColumn(headers, keywords) {
  return headers.find((h) => keywords.some((k) => String(h).includes(k)));
}

function readRows() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`[중단] 폴더가 없습니다: ${SOURCE_DIR}`);
    console.error("행정처분 공표 파일을 받아 이 폴더에 넣어주세요.");
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

const nameCol = findColumn(headers, ["기관명", "요양기관명", "기관"]);
const addrCol = findColumn(headers, ["주소", "소재지"]);
const typeCol = findColumn(headers, ["처분내용", "처분명", "처분종류", "행정처분"]);
const reasonCol = findColumn(headers, ["위반내용", "위반사실", "사유", "위반"]);
const dateCol = findColumn(headers, ["처분일", "처분기간", "공표일", "일자"]);

if (!nameCol) {
  console.error("[중단] 기관명 컬럼을 찾지 못했습니다.");
  console.error("위에 출력된 컬럼 목록을 알려주시면 매핑을 맞춰드릴게요.");
  process.exit(1);
}
console.log(
  `매핑 → 기관명: ${nameCol} / 주소: ${addrCol ?? "없음"} / 처분: ${typeCol ?? "없음"} / 사유: ${reasonCol ?? "없음"} / 일자: ${dateCol ?? "없음"}`
);

const env = loadEnv();
const client = new pg.Client({ connectionString: env.DIRECT_URL });
await client.connect();

const dbRows = (await client.query(`SELECT id, name, address FROM "Facility"`)).rows;
const byNameSigungu = new Map();
const byName = new Map();
for (const f of dbRows) {
  const n = normName(f.name);
  byNameSigungu.set(`${n}|${sigunguOf(f.address)}`, f.id);
  if (!byName.has(n)) byName.set(n, []);
  byName.get(n).push(f.id);
}

// 시설 하나에 처분이 여러 건일 수 있어 배열로 모은다.
const actionsById = new Map();
let unmatched = 0;
let ambiguous = 0;

for (const row of rows) {
  const n = normName(row[nameCol]);
  if (!n) continue;
  const sg = addrCol ? sigunguOf(row[addrCol]) : "";
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

  const action = {
    type: typeCol ? String(row[typeCol]).trim() : "행정처분",
    reason: reasonCol ? String(row[reasonCol]).trim() : "",
    date: dateCol ? String(row[dateCol]).trim() : "",
  };
  if (!actionsById.has(id)) actionsById.set(id, []);
  actionsById.get(id).push(action);
}

console.log(
  `\n매칭 결과: 처분 표기 대상 시설 ${actionsById.size}곳 / 이름 못 찾음 ${unmatched}건 / 동명이인 모호 ${ambiguous}건`
);

if (!WRITE) {
  console.log("\n미리보기 모드입니다. 실제로 반영하려면 --write 를 붙여 다시 실행하세요.");
  const sample = [...actionsById.entries()].slice(0, 2);
  console.log("샘플:", JSON.stringify(sample, null, 2));
  await client.end();
  process.exit(0);
}

let done = 0;
for (const [id, actions] of actionsById) {
  await client.query(
    `UPDATE "Facility" SET extra = jsonb_set(extra, '{adminActions}', $1::jsonb, true) WHERE id = $2`,
    [JSON.stringify(actions), id]
  );
  if (++done % 200 === 0) console.log(`  ${done}/${actionsById.size} 반영`);
}

console.log(`\n완료: ${done}곳 반영됨.`);
await client.end();
