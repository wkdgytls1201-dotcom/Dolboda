// 국민건강보험공단 공개데이터(장기요양기관 시설별 현황 xlsx + 평가 결과 csv)를
// lib/types.ts의 Facility 스키마에 맞는 실데이터 JSON으로 변환하는 1회성 임포트 스크립트.
// 사용법: node scripts/import-nhis.mjs
//
// 주의: 이 두 파일에는 "전화번호", "위경도 좌표", "현원", "병실 구성", "프로그램",
// "비급여비용" 정보가 없음. 해당 필드는 undefined/빈 배열로 두고 절대 임의 값을 채우지 않음.

import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import xlsx from "xlsx";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP = "C:/Users/linea/Desktop";
const XLSX_PATH = path.join(DESKTOP, "국민건강보험공단_장기요양기관 시설별 현황_20260610.xlsx");
const CSV_PATH = path.join(DESKTOP, "국민건강보험공단_장기요양기관 평가 결과_20260625.csv");
const OUT_PATH = path.join(__dirname, "..", "lib", "realNhisData.json");

const REGION_FILTER_PREFIX = "서울"; // 데이터 용량 관리를 위해 우선 서울로 한정

function parseCSV(text) {
  const rows = [];
  let row = [],
    field = "",
    inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\r") {
        /* skip */
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toRecords(rows) {
  const header = rows[0];
  return rows
    .slice(1)
    .filter((r) => r.length >= header.length && r.some((v) => v !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

// --- 1. 평가결과 CSV 읽기 ---
const csvBuf = fs.readFileSync(CSV_PATH);
const csvText = iconv.decode(csvBuf, "cp949");
const evalRecords = toRecords(parseCSV(csvText));
console.log(`평가결과 CSV: ${evalRecords.length}행`);

const GRADE_TO_NUM = { A: 1, B: 2, C: 3, D: 4, E: 5 };
const BENEFIT_TYPE_MAP = {
  "01.입소시설30인이상": "NURSING_HOME",
  "02.입소시설10이상30인미만": "NURSING_HOME",
  "03.입소시설10인미만": "NURSING_HOME",
  "07.주야간보호": "DAY_NIGHT_CARE",
  "04.방문요양": "HOME_CARE",
};

function normalizeCode(code) {
  return code.replace(/-/g, "");
}

function yearOf(evalGubun) {
  const m = /^(\d{4})/.exec(evalGubun);
  return m ? Number(m[1]) : 0;
}

// 코드별로 여러 연도 평가가 있으므로 최신 연도 하나만 채택
const latestEvalByCode = new Map();
for (const rec of evalRecords) {
  const grade = rec["평가등급"];
  if (!grade || !GRADE_TO_NUM[grade]) continue;
  const facilityType = BENEFIT_TYPE_MAP[rec["급여종류"]];
  if (!facilityType) continue;
  const code = normalizeCode(rec["장기요양기관기호"]);
  const year = yearOf(rec["평가구분"]);
  const prev = latestEvalByCode.get(code);
  if (!prev || year > prev.year) {
    latestEvalByCode.set(code, { ...rec, year, code, facilityType, grade });
  }
}
console.log(`평가등급 보유(최신연도 기준) 기관 수: ${latestEvalByCode.size}`);

// 연도별(도메인셋별) 전국 평균 계산 — 실제 데이터로부터 계산, 임의값 아님
const domainKeysByYear = {
  old: ["기관운영", "환경및안전", "수급자권리보장", "급여제공과정", "급여제공결과"],
  y2025: ["기관운영(2025)", "수급자존중(2025)", "서비스제공(2025)", "서비스결과(2025)"],
};
function domainSetFor(year) {
  return year >= 2025 ? domainKeysByYear.y2025 : domainKeysByYear.old;
}

const nationalAvgByYear = new Map(); // year -> { totalScore, domainAvgs: {name:avg} }
for (const year of [2021, 2023, 2024, 2025]) {
  const rowsOfYear = evalRecords.filter((r) => yearOf(r["평가구분"]) === year && r["평가등급"]);
  if (rowsOfYear.length === 0) continue;
  const domains = domainSetFor(year);
  const sums = Object.fromEntries(domains.map((d) => [d, 0]));
  let totalSum = 0,
    n = 0;
  for (const r of rowsOfYear) {
    const total = parseFloat(r["평가총점"]);
    if (Number.isNaN(total)) continue;
    totalSum += total;
    n++;
    for (const d of domains) {
      const v = parseFloat(r[d]);
      if (!Number.isNaN(v)) sums[d] += v;
    }
  }
  const domainAvgs = Object.fromEntries(domains.map((d) => [d, n ? sums[d] / n : 0]));
  nationalAvgByYear.set(year, { totalScoreAvg: n ? totalSum / n : 0, domainAvgs, n });
}
console.log(
  "연도별 전국 평균 표본수:",
  [...nationalAvgByYear.entries()].map(([y, v]) => `${y}:${v.n}`).join(", ")
);

// --- 2. xlsx 읽기 ---
const wb = xlsx.readFile(XLSX_PATH);
function sheetRecords(name) {
  const ws = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return toRecords(rows);
}

const generalRows = sheetRecords("일반현황");
const capacityRows = sheetRecords("입소인원");
const staffRows = sheetRecords("인력현황");
console.log(`일반현황 ${generalRows.length}행, 입소인원 ${capacityRows.length}행, 인력현황 ${staffRows.length}행`);

const generalByCode = new Map();
for (const r of generalRows) {
  generalByCode.set(String(r["장기요양기관코드"]), r);
}

const capacityByCode = new Map(); // code -> 합산 정원
for (const r of capacityRows) {
  const code = String(r["장기요양기관코드"]);
  const cap = Number(r["정원"]) || 0;
  capacityByCode.set(code, (capacityByCode.get(code) || 0) + cap);
}

const STAFF_FIELDS = [
  "시설장",
  "사무국장",
  "사회복지사",
  "의사_전임",
  "의사_촉탁",
  "간호사",
  "간호조무사",
  "치위생사",
  "물리치료사",
  "작업치료사",
  "요양보호사",
  "영양사",
  "기타",
];
const staffByCode = new Map();
for (const r of staffRows) {
  const code = String(r["장기요양기관코드"]);
  const acc = staffByCode.get(code) || Object.fromEntries(STAFF_FIELDS.map((f) => [f, 0]));
  for (const f of STAFF_FIELDS) acc[f] += Number(r[f]) || 0;
  staffByCode.set(code, acc);
}

// --- 3. 조인 + 변환 ---
const facilities = [];
for (const [code, ev] of latestEvalByCode) {
  const general = generalByCode.get(code);
  if (!general) continue; // 일반현황에 없는 코드(폐업 등) 제외
  const address = String(general["시도 시군구 법정동명"] || "");
  if (!address.startsWith(REGION_FILTER_PREFIX)) continue;

  const detailAddress = String(general["기관별 상세주소"] || address);
  const staff = staffByCode.get(code);
  const capacity = capacityByCode.get(code) || 0;
  const installDate = String(general["설치신고일자"] || "");
  const establishedYear = installDate.length >= 4 ? Number(installDate.slice(0, 4)) : 2000;

  const avgInfo = nationalAvgByYear.get(ev.year);
  const domains = domainSetFor(ev.year)
    .filter((d) => ev[d] !== "" && ev[d] !== undefined)
    .map((d) => ({
      name: d.replace(/\(2025\)/, ""),
      score: parseFloat(ev[d]),
    }));

  facilities.push({
    id: `nhis-${code}`,
    name: String(general["장기요양기관이름"] || ev["장기요양기관명"]),
    facilityType: ev.facilityType,
    dataSource: "public",
    gradeSource: "NHIS",
    grade: GRADE_TO_NUM[ev.grade],
    address: detailAddress,
    establishedYear,
    updatedAt: "2026-06-25",
    capacity,
    staff: {
      careWorkers: staff ? staff["요양보호사"] : 0,
      nurses: staff ? staff["간호사"] + staff["간호조무사"] : 0,
      socialWorkers: staff ? staff["사회복지사"] : 0,
      physicalTherapists: staff ? staff["물리치료사"] : 0,
    },
    staffDetail: {
      administrative: {
        facilityHead: staff ? staff["시설장"] : 0,
        officeManager: staff ? staff["사무국장"] : 0,
        staff: 0,
      },
      socialCare: {
        socialWorkers: staff ? staff["사회복지사"] : 0,
        physicalTherapists: staff ? staff["물리치료사"] : 0,
        occupationalTherapists: staff ? staff["작업치료사"] : 0,
      },
      medical: {
        fullTimeDoctors: staff ? staff["의사_전임"] : 0,
        partTimeDoctors: staff ? staff["의사_촉탁"] : 0,
        nurses: staff ? staff["간호사"] : 0,
        nursingAssistants: staff ? staff["간호조무사"] : 0,
      },
    },
    roomTypes: [],
    facilityRooms: {
      bedrooms: { single: 0, double: 0, triple: 0, quad: 0, special: 0 },
      medical: { nursingRoom: 0, rehabRoom: 0 },
      dining: { diningRoom: 0, restroom: 0, bathroom: 0 },
    },
    nonCoveredFees: [],
    evaluationDetail:
      domains.length > 0
        ? {
            evaluatedAt: ev["평가일자"],
            totalScore: parseFloat(ev["평가총점"]),
            nationalAverage: avgInfo ? Math.round(avgInfo.totalScoreAvg * 10) / 10 : 0,
            domains,
          }
        : undefined,
    programs: [],
  });
}

console.log(`서울 지역, 실데이터 변환 완료: ${facilities.length}건`);
fs.writeFileSync(OUT_PATH, JSON.stringify(facilities, null, 2), "utf8");
console.log(`저장: ${OUT_PATH}`);
