// 전국 요양병원(HIRA clCd=28)을 DB에 채운다.
// 기존 import-hira.mjs는 "서울에서 16곳만 뽑는 표본" 스크립트라 요양병원이 21곳뿐이었다.
//
// 사용법: node scripts/import-hira-all.mjs           (미리보기)
//         node scripts/import-hira-all.mjs --write   (DB 반영)
//
// 목록 API 한 번으로 이름·주소·전화·좌표·설립일·의사수를 받고,
// 적정성평가 등급은 병원별 API를 동시 6건씩 호출해 채운다.

import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WRITE = process.argv.includes("--write");

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"(.*)"$/, "$1")];
    })
);

const KEY = env.HIRA_SERVICE_KEY;
const INFO_BASE = env.HIRA_HOSP_INFO_BASE;
const EVAL_BASE = env.HIRA_HOSP_EVAL_BASE;
const NURSING_HOSPITAL_CL_CD = "28";

async function callApi(base, operation, params) {
  const qs = new URLSearchParams({ serviceKey: KEY, _type: "json", ...params });
  const res = await fetch(`${base}/${operation}?${qs}`);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${operation} 응답 파싱 실패: ${text.slice(0, 120)}`);
  }
  if (json.response?.header?.resultCode !== "00") {
    throw new Error(`${operation} 실패: ${json.response?.header?.resultMsg}`);
  }
  const items = json.response.body?.items;
  if (!items) return [];
  return Array.isArray(items.item) ? items.item : items.item ? [items.item] : [];
}

function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// --- 1. 전국 요양병원 목록 ---
console.log("전국 요양병원 목록 조회 중...");
const hospitals = [];
for (let page = 1; page <= 20; page++) {
  const rows = await callApi(INFO_BASE, "getHospBasisList", {
    clCd: NURSING_HOSPITAL_CL_CD,
    pageNo: page,
    numOfRows: 500,
  });
  hospitals.push(...rows);
  process.stdout.write(`\r  ${hospitals.length}곳 수집`);
  if (rows.length < 500) break;
}
console.log(`\n총 ${hospitals.length}곳`);

if (hospitals.length === 0) {
  console.error("[중단] 목록이 비었습니다. HIRA_SERVICE_KEY를 확인해주세요.");
  process.exit(1);
}

// --- 2. 적정성평가 등급 (동시 6건) ---
console.log("적정성평가 등급 조회 중...");
const gradeByYkiho = new Map();
let evalDone = 0;
let evalFailed = 0;

async function fetchGrade(h) {
  try {
    // asmGrd10 = 요양병원 적정성평가 종합등급 (1~5). 미평가/등급제외는 값이 없다.
    const rows = await callApi(EVAL_BASE, "getHospAsmInfo1", { ykiho: h.ykiho, numOfRows: 1 });
    const g = Number(rows[0]?.asmGrd10);
    if (Number.isInteger(g) && g >= 1 && g <= 5) gradeByYkiho.set(h.ykiho, g);
  } catch {
    evalFailed++;
  } finally {
    if (++evalDone % 100 === 0) process.stdout.write(`\r  ${evalDone}/${hospitals.length}`);
  }
}

for (let i = 0; i < hospitals.length; i += 6) {
  await Promise.all(hospitals.slice(i, i + 6).map(fetchGrade));
}
console.log(`\n등급 확보 ${gradeByYkiho.size}곳 (조회 실패 ${evalFailed}건)`);

// --- 3. 우리 Facility 형태로 변환 ---
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const facilities = hospitals
  .filter((h) => h.yadmNm && h.addr)
  .map((h) => {
    const name = String(h.yadmNm).trim();
    const address = String(h.addr).trim();
    const lat = Number(h.YPos);
    const lng = Number(h.XPos);
    const estbDd = String(h.estbDd ?? "");
    const doctors = num(h.drTotCnt);

    return {
      id: `hira-${hashId(name + address)}`,
      name,
      facilityType: "NURSING_HOSPITAL",
      dataSource: "public",
      gradeSource: "HIRA",
      grade: gradeByYkiho.get(h.ykiho) ?? null,
      address,
      lat: Number.isFinite(lat) && lat > 32 && lat < 39 ? lat : null,
      lng: Number.isFinite(lng) && lng > 124 && lng < 132 ? lng : null,
      phone: h.telno ? String(h.telno).trim() : null,
      establishedYear: /^\d{8}$/.test(estbDd) ? Number(estbDd.slice(0, 4)) : null,
      sourceUpdatedAt: new Date().toISOString().slice(0, 10),
      parking: null,
      // 상세 지표는 병원마다 별도 API를 6번씩 더 호출해야 해서 여기서는 비워둔다.
      // 화면은 0이나 빈 배열이면 해당 섹션을 감추도록 되어 있다.
      extra: {
        doctorGrade: 0,
        nurseGrade: 0,
        nonCoveredFees: [],
        departments: [],
        staff: {
          generalDoctors: doctors,
          specialistDoctors: 0,
          socialWorkers: 0,
          physicalTherapists: 0,
          occupationalTherapists: 0,
          pharmacists: 0,
        },
        facilityStatus: {
          generalBeds: 0,
          upgradeBeds: 0,
          physicalTherapyRooms: 0,
          isolationRooms: 0,
        },
        emergencyRoom: { day: false, night: false },
        equipment: [],
      },
    };
  });

const withCoords = facilities.filter((f) => f.lat !== null).length;
const withGrade = facilities.filter((f) => f.grade !== null).length;
console.log(
  `\n변환 완료: ${facilities.length}곳 (좌표 ${withCoords}곳 / 등급 ${withGrade}곳)`
);
console.log("샘플:", facilities.slice(0, 3).map((f) => `${f.name}(${f.grade ?? "-"}등급)`).join(", "));

if (!WRITE) {
  console.log("\n미리보기입니다. 반영하려면 --write 를 붙여 실행하세요.");
  process.exit(0);
}

// --- 4. DB 반영 ---
const client = new pg.Client({ connectionString: env.DIRECT_URL });
await client.connect();

let inserted = 0;
let updated = 0;
for (const f of facilities) {
  const res = await client.query(
    `INSERT INTO "Facility"
       (id, name, "facilityType", "dataSource", "gradeSource", grade, address, lat, lng,
        phone, "establishedYear", "sourceUpdatedAt", parking, extra, "createdAt", "updatedAt")
     VALUES ($1,$2,$3::"FacilityType",$4::"DataSource",$5::"GradeSource",$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, grade = EXCLUDED.grade, address = EXCLUDED.address,
       lat = COALESCE(EXCLUDED.lat, "Facility".lat),
       lng = COALESCE(EXCLUDED.lng, "Facility".lng),
       phone = COALESCE(EXCLUDED.phone, "Facility".phone),
       "establishedYear" = COALESCE(EXCLUDED."establishedYear", "Facility"."establishedYear"),
       "sourceUpdatedAt" = EXCLUDED."sourceUpdatedAt",
       "updatedAt" = now()
     RETURNING (xmax = 0) AS is_insert`,
    [
      f.id, f.name, f.facilityType, f.dataSource, f.gradeSource, f.grade, f.address,
      f.lat, f.lng, f.phone, f.establishedYear, f.sourceUpdatedAt,
      f.parking, JSON.stringify(f.extra),
    ]
  );
  if (res.rows[0]?.is_insert) inserted++;
  else updated++;
  if ((inserted + updated) % 200 === 0) {
    process.stdout.write(`\r  ${inserted + updated}/${facilities.length} 반영`);
  }
}

console.log(`\n완료: 신규 ${inserted}곳 / 갱신 ${updated}곳`);
await client.end();
