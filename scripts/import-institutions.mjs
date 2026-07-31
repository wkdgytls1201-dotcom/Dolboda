// 공단 "전국 장기요양기관 상세정보" 엑셀(11개 시트)을 Institution 테이블로 병합 저장한다.
// 기관번호+급여종류코드가 유일키. 한 기관이 방문요양·방문목욕·주야간보호 등 여러 행을 가진다.
//
// 준비물: C:/Users/linea/Desktop/요양기관 상세정보/ 안의 상세정보 엑셀
// 사용법: node scripts/import-institutions.mjs          (미리보기)
//         node scripts/import-institutions.mjs --write  (실제 반영 — 전체 삭제 후 재삽입)

import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = "C:/Users/linea/Desktop/요양기관 상세정보";
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

const file = fs.readdirSync(SOURCE_DIR).find((f) => /\.xlsx?$/i.test(f));
if (!file) {
  console.error(`[중단] ${SOURCE_DIR} 안에 엑셀 파일이 없습니다.`);
  process.exit(1);
}
console.log(`읽는 중: ${file} (시트가 많아 1~2분 걸립니다)`);
const wb = xlsx.readFile(path.join(SOURCE_DIR, file));

function sheet(name) {
  const ws = wb.Sheets[name];
  if (!ws) {
    console.warn(`  시트 없음: ${name}`);
    return [];
  }
  const rows = xlsx.utils.sheet_to_json(ws, { defval: "" });
  console.log(`  ${name}: ${rows.length}행`);
  return rows;
}

const keyOf = (r) => `${String(r["기관번호"]).trim()}-${String(r["급여종류코드"]).trim()}`;
const num = (v) => {
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v) => {
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const str = (v) => String(v ?? "").trim();

// ---------- 1) 기본정보가 뼈대 ----------
const institutions = new Map();
for (const r of sheet("기본정보")) {
  const key = keyOf(r);
  institutions.set(key, {
    id: key,
    instCode: str(r["기관번호"]),
    name: str(r["기관명"]),
    sido: str(r["시도"]),
    serviceCode: str(r["급여종류코드"]),
    serviceName: str(r["급여종류"]),
    address: str(r["주소"]),
    phone: str(r["전화번호"]) || null,
    sourceDate: str(r["최종변경일"]),
    data: {
      basic: {
        email: str(r["이메일주소"]) || undefined,
        homepage: str(r["홈페이지 주소"]) || undefined,
        transport: str(r["교통편"]) || undefined,
        operatingHours: str(r["운영시간"]) || undefined,
        parkingInfo: str(r["주차시설"]) || undefined,
        designatedAt: str(r["지정일자"]) || undefined,
        installedAt: str(r["설치신고일자"]) || undefined,
        // 배상책임보험 가입 여부 — 사고 시 보호자 보호와 직결되는 신뢰 신호
        professionalLiabilityInsurance: str(r["전문인배상책임보험"]) === "Y",
        liabilityInsurance: str(r["손해배상책임보험"]) === "Y",
        integratedHomeCare: str(r["통합재가급여 제공"]) === "Y",
      },
    },
  });
}
console.log(`기관×급여종류: ${institutions.size}건`);

const dataOf = (r) => institutions.get(keyOf(r))?.data;

// ---------- 2) 정원현원 (남녀 구분) ----------
for (const r of sheet("정원현원정보")) {
  const d = dataOf(r);
  if (!d) continue;
  d.capacity = {
    capacity: num(r["정원"]),
    currentMale: numOrNull(r["현원 남"]),
    currentFemale: numOrNull(r["현원 여"]),
    waitMale: numOrNull(r["대기자 인원 남"]),
    waitFemale: numOrNull(r["대기자 인원 여"]),
    availableSlots: numOrNull(r["이용가능 인원"]),
  };
}

// ---------- 3) 인력현황(입소·주야간) ----------
for (const r of sheet("인력현황(입소·주야간)")) {
  const d = dataOf(r);
  if (!d) continue;
  d.staff = {
    total: num(r["총인원"]),
    facilityHead: num(r["시설장"]),
    officeManager: num(r["사무 국장"]),
    socialWorkers: num(r["사회 복지사"]),
    fullTimeDoctors: num(r["의사 전임"]),
    partTimeDoctors: num(r["의사 계약"]),
    nurses: num(r["간호요원 간호사"]),
    nursingAssistants: num(r["간호요원 조무사"]),
    dentalHygienists: num(r["간호요원 치위생사"]),
    careWorkers1: num(r["요양보호사 1급"]),
    careWorkers2: num(r["요양보호사 2급"]),
    careWorkersProvisional: num(r["요양보호사 유예"]),
    physicalTherapists: num(r["물리치료사"]),
    occupationalTherapists: num(r["작업치료사"]),
    officeStaff: num(r["사무원"]),
    nutritionists: num(r["영양사"]),
    cooks: num(r["조리원"]),
    hygienists: num(r["위생원"]),
    managers: num(r["관리인"]),
    assistants: num(r["보조원"]),
    others: num(r["기타"]),
  };
}

// ---------- 4) 인력현황(재가) — 방문요양 등 재가 급여용 ----------
for (const r of sheet("인력현황(재가)")) {
  const d = dataOf(r);
  if (!d) continue;
  d.staffHomecare = {
    total: num(r["계"]),
    facilityHead: num(r["시설장 (관리책임자)"]),
    officeManager: num(r["사무 국장"]),
    socialWorkers: num(r["사회 복지사"]),
    nurses: num(r["간호사"]),
    nursingAssistants: num(r["간호 조무사"]),
    dentalHygienists: num(r["치위 생사"]),
    physicalTherapists: num(r["물리 치료사"]),
    occupationalTherapists: num(r["작업 치료사"]),
    careWorkers1: num(r["요양보호사 1급"]),
    careWorkers2: num(r["요양보호사 2급"]),
    officeStaff: num(r["사무원"]),
    others: num(r["기타"]),
  };
}

// ---------- 5) 근속현황 — 직원이 오래 다니는 곳이 돌봄도 안정적 ----------
for (const r of sheet("근속현황")) {
  const d = dataOf(r);
  if (!d) continue;
  (d.tenure ??= []).push({
    role: str(r["장기요양요원"]),
    total: num(r["합계"]),
    under3m: num(r["3개월미만"]),
    m3to6: num(r["3개월이상 6개월미만"]),
    m6to1y: num(r["6개월이상 1년미만"]),
    y1to2: num(r["1년이상 2년미만"]),
    over2y: num(r["2년이상"]),
  });
}

// ---------- 6) 시설현황 (침실 구성·공용 공간) ----------
for (const r of sheet("시설현황")) {
  const d = dataOf(r);
  if (!d) continue;
  d.rooms = {
    bedroomsTotal: num(r["침실 (계)"]),
    single: num(r["1인실"]),
    double: num(r["2인실"]),
    triple: num(r["3인실"]),
    quad: num(r["4인실"]),
    special: num(r["특수 침실"]),
    office: num(r["사무실"]),
    nursingRoom: num(r["의료/ 간호사실"]),
    rehabRoom: num(r["물리 (작업) 치료실"]),
    programRoom: num(r["프로 그램실"]),
    diningRoom: num(r["식당/ 조리실"]),
    restroom: num(r["화장실"]),
    bathroom: num(r["세면장/ 목욕실"]),
    laundry: num(r["세탁장/ 건조장"]),
  };
}

// ---------- 7) 치매전담실 — 있다는 사실 자체가 중요한 차별 정보 ----------
for (const r of sheet("치매전담실_시설현황")) {
  const d = dataOf(r);
  if (!d) continue;
  (d.dementiaUnits ??= []).push({
    type: str(r["급여형태"]),
    bedrooms: num(r["침실 (계)"]),
    commonRoom: num(r["공동거실"]),
  });
}

// ---------- 8) 비급여비용 ----------
for (const r of sheet("비급여비용")) {
  const d = dataOf(r);
  if (!d) continue;
  (d.nonCoveredFees ??= []).push({
    name: str(r["비급여항목"]),
    basis: str(r["산출근거(일 or 월)"]) || undefined,
    daily: num(r["금액(1일)"]),
    monthly: num(r["금액(월31일)"]),
    note: str(r["비고"]) || undefined,
    registeredAt: str(r["등록일"]) || undefined,
  });
}

// ---------- 9) 프로그램운영 ----------
for (const r of sheet("프로그램운영")) {
  const d = dataOf(r);
  if (!d) continue;
  (d.programs ??= []).push({
    category: str(r["프로그램 종류"]),
    name: str(r["프로그램명"]),
    target: str(r["대상(명)"]),
    frequency: str(r["주기(시간)"]),
    location: str(r["장소"]),
  });
}

// ---------- 통계 ----------
const all = [...institutions.values()];
const stat = (k) => all.filter((i) => i.data[k]).length;
console.log(
  `\n채움 현황 — 정원: ${stat("capacity")} / 인력: ${stat("staff")} / 재가인력: ${stat("staffHomecare")} / 근속: ${stat("tenure")} / 시설: ${stat("rooms")} / 치매전담: ${stat("dementiaUnits")} / 비급여: ${stat("nonCoveredFees")} / 프로그램: ${stat("programs")}`
);

if (!WRITE) {
  console.log("\n미리보기 모드입니다. --write 를 붙이면 Institution 테이블에 반영합니다.");
  console.log("샘플:", JSON.stringify(all[0], null, 2).slice(0, 1500));
  process.exit(0);
}

// ---------- DB 반영 (파일이 항상 전체 스냅샷이므로 delete-then-insert) ----------
const env = loadEnv();
const client = new pg.Client({ connectionString: env.DIRECT_URL });
await client.connect();

await client.query(`DELETE FROM "Institution"`);
console.log("\n기존 데이터 삭제 후 삽입 시작…");

const BATCH = 500;
for (let i = 0; i < all.length; i += BATCH) {
  const chunk = all.slice(i, i + BATCH);
  const values = [];
  const params = [];
  chunk.forEach((inst, j) => {
    const base = j * 10;
    values.push(
      `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},now())`
    );
    params.push(
      inst.id, inst.instCode, inst.name, inst.sido, inst.serviceCode,
      inst.serviceName, inst.address, inst.phone, JSON.stringify(inst.data), inst.sourceDate
    );
  });
  await client.query(
    `INSERT INTO "Institution" (id,"instCode",name,sido,"serviceCode","serviceName",address,phone,data,"sourceDate","updatedAt")
     VALUES ${values.join(",")}
     ON CONFLICT (id) DO NOTHING`,
    params
  );
  if ((i / BATCH) % 10 === 0) console.log(`  ${Math.min(i + BATCH, all.length)}/${all.length}`);
}

console.log("완료:", all.length, "건 삽입됨.");
await client.end();
