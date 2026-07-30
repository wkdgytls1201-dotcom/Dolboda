// longtermcare.or.kr(노인장기요양보험 홈페이지)에서 지역별로 직접 다운받은 "장기요양기관내역" 엑셀
// 16개 파일을 합쳐 전국 데이터로 만든다. data.go.kr 버전과 달리 현원/대기/전화번호가 실제 값으로 있음.
// 사용법: node scripts/import-nhis-v2.mjs

import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP = "C:/Users/linea/Desktop/지역 장기";
const OUT_PATH = path.join(__dirname, "..", "lib", "realNhisDataV2.json");

const FILES = [
  "서울",
  "경기도22",
  "강원도",
  "경상남도",
  "경상북도",
  "대구광역시",
  "대전",
  "부산광역시",
  "세종",
  "울산",
  "인천광역시",
  "전남광주특별시",
  "전북특별자치도",
  "제주",
  "충청남도",
  "충북",
];

function mapFacilityType(raw) {
  if (raw.includes("주야간보호")) return "DAY_NIGHT_CARE";
  if (raw.includes("방문요양") || raw.includes("방문목욕") || raw.includes("방문간호"))
    return "HOME_CARE";
  if (raw.includes("노인요양") || raw.includes("치매전담실") || raw.includes("공동생활가정"))
    return "NURSING_HOME";
  return null; // 복지용구, 단기보호 등은 우리 타입 체계 밖이라 제외
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

// 간단한 문자열 해시로 결정적 id 생성 (이 데이터엔 공식 기관코드가 없음)
function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const byKey = new Map();
let totalRows = 0;

for (const file of FILES) {
  const filePath = path.join(DESKTOP, `${file}.xlsx`);
  if (!fs.existsSync(filePath)) {
    console.log(`스킵(파일 없음): ${file}`);
    continue;
  }
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const data = rows.slice(3).filter((r) => r.some((v) => v !== ""));
  totalRows += data.length;

  for (const r of data) {
    const [, name, benefitTypeRaw, gradeRaw, capacity, occupancy, , waitlist, , addrRaw, phone] =
      r;
    const facilityType = mapFacilityType(String(benefitTypeRaw));
    if (!facilityType) continue;
    const address = String(addrRaw).trim();
    if (!name || !address) continue;

    const key = `${name}|${address}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.capacity += num(capacity);
      existing.currentOccupancy += num(occupancy);
      existing.waitlistCount += num(waitlist);
    } else {
      byKey.set(key, {
        name: String(name).trim(),
        address,
        facilityType,
        grade: parseGrade(String(gradeRaw)),
        capacity: num(capacity),
        currentOccupancy: num(occupancy),
        waitlistCount: num(waitlist),
        phone: String(phone).trim() || undefined,
      });
    }
  }
}

console.log(`원본 총 행수: ${totalRows}, 고유 시설: ${byKey.size}`);

const facilities = [...byKey.values()].map((f) => ({
  id: `nhis2-${hashId(f.name + f.address)}`,
  name: f.name,
  facilityType: f.facilityType,
  dataSource: "public",
  gradeSource: "NHIS",
  grade: f.grade,
  address: f.address,
  phone: f.phone,
  updatedAt: "2026-07-29",
  capacity: f.capacity,
  currentOccupancy: f.currentOccupancy,
  waitlistCount: f.waitlistCount,
  staff: { careWorkers: 0, nurses: 0, socialWorkers: 0, physicalTherapists: 0 },
  staffDetail: {
    administrative: { facilityHead: 0, officeManager: 0, staff: 0 },
    socialCare: { socialWorkers: 0, physicalTherapists: 0, occupationalTherapists: 0 },
    medical: { fullTimeDoctors: 0, partTimeDoctors: 0, nurses: 0, nursingAssistants: 0 },
  },
  roomTypes: [],
  facilityRooms: {
    bedrooms: { single: 0, double: 0, triple: 0, quad: 0, special: 0 },
    medical: { nursingRoom: 0, rehabRoom: 0 },
    dining: { diningRoom: 0, restroom: 0, bathroom: 0 },
  },
  nonCoveredFees: [],
  programs: [],
}));

fs.writeFileSync(OUT_PATH, JSON.stringify(facilities, null, 2), "utf8");
console.log(`저장: ${OUT_PATH} (${facilities.length}건)`);
