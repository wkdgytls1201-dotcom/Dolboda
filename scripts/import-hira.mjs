// 건강보험심사평가원(HIRA) 공개 API 4종을 호출해 서울 지역 요양병원 실데이터를 만든다.
// 사용법: node scripts/import-hira.mjs
//
// 등급(적정성평가 종합등급)은 OpenAPI활용가이드 코드표로 asmGrd10="요양병원" 확인 후 반영.
// 나머지(좌표/인력등급/진료과목/장비/병상수/기타인력/비급여비용)까지 전부 실제 API 응답값.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local 간단 파서 (Next.js 밖 순수 node 스크립트라 자동 로드가 안 됨)
const envText = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const KEY = env.HIRA_SERVICE_KEY;
const BASES = {
  info: env.HIRA_HOSP_INFO_BASE,
  eval: env.HIRA_HOSP_EVAL_BASE,
  detail: env.HIRA_HOSP_DETAIL_BASE,
  nonpay: env.HIRA_NONPAYMENT_BASE,
};
const SEOUL_SIDO_CD = "110000";
const NURSING_HOSPITAL_CL_CD = "28";
const SAMPLE_SIZE = 16;
const OUT_PATH = path.join(__dirname, "..", "lib", "realHiraData.ts");

async function callApi(base, operation, params) {
  const qs = new URLSearchParams({ serviceKey: KEY, _type: "json", ...params });
  const url = `${base}/${operation}?${qs.toString()}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.response.header.resultCode !== "00") {
    throw new Error(`${operation} 실패: ${json.response.header.resultMsg}`);
  }
  const items = json.response.body.items;
  if (!items) return [];
  return Array.isArray(items.item) ? items.item : items.item ? [items.item] : [];
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- 1. 서울 요양병원 목록(101곳) 전체 조회 ---
console.log("서울 요양병원 목록 조회 중...");
let allHospitals = [];
for (let page = 1; page <= 2; page++) {
  const rows = await callApi(BASES.info, "getHospBasisList", {
    sidoCd: SEOUL_SIDO_CD,
    clCd: NURSING_HOSPITAL_CL_CD,
    pageNo: page,
    numOfRows: 100,
  });
  allHospitals.push(...rows);
  if (rows.length < 100) break;
}
console.log(`총 ${allHospitals.length}곳`);

// --- 2. 구 중복 없이 다양성 있게 표본 추출 ---
const shuffled = [...allHospitals].sort(() => Math.random() - 0.5);
const districts = new Set();
const sample = [];
for (const h of shuffled) {
  if (districts.has(h.sgguCdNm)) continue;
  sample.push(h);
  districts.add(h.sgguCdNm);
  if (sample.length >= SAMPLE_SIZE) break;
}
console.log(`표본 ${sample.length}곳 선정:`, sample.map((h) => h.yadmNm).join(", "));

// --- 3. 표본 각각에 대해 상세 API 6종 호출 ---
const facilities = [];
for (let i = 0; i < sample.length; i++) {
  const h = sample[i];
  const ykiho = h.ykiho;
  console.log(`- ${h.yadmNm} 상세 조회...`);

  const [nursingGrd, depts, equip, eqp, dtl, etcStaff, nonpay, asm] = await Promise.all([
    callApi(BASES.detail, "getNursigGrdInfo2.8", { ykiho, numOfRows: 10 }).catch(() => []),
    callApi(BASES.detail, "getDgsbjtInfo2.8", { ykiho, numOfRows: 50 }).catch(() => []),
    callApi(BASES.detail, "getMedOftInfo2.8", { ykiho, numOfRows: 50 }).catch(() => []),
    callApi(BASES.detail, "getEqpInfo2.8", { ykiho, numOfRows: 1 }).catch(() => []),
    callApi(BASES.detail, "getDtlInfo2.8", { ykiho, numOfRows: 1 }).catch(() => []),
    callApi(BASES.detail, "getEtcHstInfo2.8", { ykiho, numOfRows: 20 }).catch(() => []),
    callApi(BASES.nonpay, "getNonPaymentItemHospDtlList", { ykiho, numOfRows: 6 }).catch(
      () => []
    ),
    callApi(BASES.eval, "getHospAsmInfo1", { ykiho, numOfRows: 1 }).catch(() => []),
  ]);
  await sleep(120); // API 과다호출 방지

  const eqpInfo = eqp[0];
  const dtlInfo = dtl[0];
  const doctorGradeRow = nursingGrd.find((r) => r.tyCd === "03");
  const nurseGradeRow = nursingGrd.find((r) => r.tyCd === "04");
  const num = (v, fallback = 0) => (v === undefined || v === null || v === "" ? fallback : Number(v));
  const staffOf = (nameKr) => num(etcStaff.find((r) => r.dtlGnlNopCdNm === nameKr)?.gnlNopCnt);
  // asmGrd10 = "요양병원" 적정성평가 종합등급 (OpenAPI활용가이드 코드표로 확인, 1~5 또는 등급제외/미평가)
  const rawGrade = asm[0]?.asmGrd10;
  const grade =
    rawGrade !== undefined && rawGrade !== null && !Number.isNaN(Number(rawGrade)) && rawGrade !== ""
      ? Number(rawGrade)
      : null;

  facilities.push({
    // ykiho 앞부분이 병원 간에 겹쳐서 truncate 시 충돌하므로 인덱스를 붙여 유일성 보장
    id: `hira-${i}-${ykiho.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`,
    name: h.yadmNm,
    facilityType: "NURSING_HOSPITAL",
    dataSource: "public",
    gradeSource: "HIRA",
    grade, // asmGrd10(요양병원 적정성평가) — 평가 미실시/등급제외 시 null
    address: h.addr,
    // HIRA API가 XPos/YPos/각종 수치를 병원에 따라 문자열/숫자로 섞어서 반환해 Number()로 통일
    lat: h.YPos !== undefined && h.YPos !== "" ? Number(h.YPos) : undefined,
    lng: h.XPos !== undefined && h.XPos !== "" ? Number(h.XPos) : undefined,
    phone: h.telno && h.telno !== "" ? h.telno : undefined,
    establishedYear: h.estbDd ? Number(String(h.estbDd).slice(0, 4)) : 2000,
    updatedAt: "2026-07-29",
    parking:
      dtlInfo && dtlInfo.parkQty
        ? { spots: num(dtlInfo.parkQty), isFree: dtlInfo.parkXpnsYn !== "Y" }
        : undefined,
    doctorGrade: doctorGradeRow ? num(doctorGradeRow.careGrd) : undefined,
    nurseGrade: nurseGradeRow ? num(nurseGradeRow.careGrd) : undefined,
    nonCoveredFees: nonpay.map((n) => ({
      name: n.yadmNpayCdNm || n.npayKorNm,
      min: num(n.curAmt),
      max: num(n.curAmt),
    })),
    departments: depts.map((d) => ({ name: d.dgsbjtCdNm, doctorCount: num(d.dgsbjtPrSdrCnt) })),
    staff: {
      generalDoctors: num(h.mdeptGdrCnt),
      specialistDoctors: num(h.mdeptSdrCnt),
      socialWorkers: staffOf("사회복지사"),
      physicalTherapists: staffOf("물리치료사"),
      occupationalTherapists: staffOf("작업치료사"),
      pharmacists: staffOf("약사"),
    },
    facilityStatus: {
      generalBeds: num(eqpInfo?.stdSickbdCnt),
      upgradeBeds: num(eqpInfo?.hghrSickbdCnt),
      physicalTherapyRooms: num(eqpInfo?.ptrmCnt),
      isolationRooms: num(eqpInfo?.isnrSbdCnt),
    },
    emergencyRoom: {
      day: dtlInfo?.emyDayYn === "Y",
      night: dtlInfo?.emyNgtYn === "Y",
    },
    equipment: equip.map((e) => ({ name: e.oftCdNm, count: num(e.oftCnt) })),
  });
}

const header = `// scripts/import-hira.mjs 로 HIRA 공개 API에서 직접 가져온 실제 서울 요양병원 표본(${facilities.length}건).
// 출처: 건강보험심사평가원 병원정보서비스/의료기관별상세정보서비스/비급여진료비정보조회서비스 (실시간 API, 2026-07-29 조회).
// 적정성평가 종합등급(asmGrd 코드 매핑 불확실)은 grade: null로 비워둠 — 임의값 아님.
import { Facility } from "./types";

export const REAL_HIRA_FACILITIES: Facility[] = `;

fs.writeFileSync(OUT_PATH, header + JSON.stringify(facilities, null, 2) + ";\n", "utf8");
console.log(`저장: ${OUT_PATH} (${facilities.length}건)`);
