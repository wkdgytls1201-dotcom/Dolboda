// Institution(업체 마스터) 데이터를 기존 Facility에 매핑해 extra를 채운다.
// 기존 좌표·평가등급·평가세부점수는 그대로 두고, 상세정보만 덮어쓴다.
//
// 매핑 키: 기관명(정규화) + 시군구 + 시설유형.
// 공단 파일에는 우리 Facility에 없는 고유키(기관번호)가 있으므로, 매칭에 성공하면
// extra.instCode 로 심어둔다 — 다음 갱신부터는 이름이 바뀌어도 기관번호로 바로 붙는다.
//
// 사용법: node scripts/map-institutions-to-facilities.mjs          (미리보기)
//         node scripts/map-institutions-to-facilities.mjs --write  (반영)

import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

// 급여종류코드 → 우리 시설유형. 치매전담실(G/H/I/M)은 독립 시설이 아니라 부속 공간이라
// 여기서 매핑하지 않고, 아래에서 "치매전담실 보유" 플래그로만 쓴다.
const TYPE_BY_SERVICE = {
  A03: "NURSING_HOME",
  A04: "NURSING_HOME",
  B01: "HOME_CARE",
  C01: "HOME_CARE",
  B03: "DAY_NIGHT_CARE",
  C03: "DAY_NIGHT_CARE",
};

// 같은 기관이 함께 제공하는 다른 서비스 — 상세페이지에 "이것도 함께 해요"로 보여준다
const SERVICE_LABEL = {
  B01: "방문요양", C01: "방문요양",
  B02: "방문목욕", C02: "방문목욕",
  B03: "주야간보호", C03: "주야간보호",
  B04: "단기보호", C04: "단기보호", S41: "단기보호",
  B05: "방문간호", C05: "방문간호",
  B06: "복지용구", C06: "복지용구",
  A03: "요양원", A04: "노인요양공동생활가정",
};

const normName = (s) =>
  String(s ?? "").replace(/\(.*?\)/g, "").replace(/[\s·ㆍ_\-.]/g, "").toLowerCase();
const sigunguOf = (addr) => String(addr ?? "").trim().split(/\s+/)[1] ?? "";

const env = loadEnv();
const client = new pg.Client({ connectionString: env.DIRECT_URL });
await client.connect();

console.log("불러오는 중…");
const { rows: institutions } = await client.query(
  `SELECT id, "instCode", name, "serviceCode", address, phone, data FROM "Institution"`
);
const { rows: facilities } = await client.query(
  `SELECT id, name, address, "facilityType", extra FROM "Facility" WHERE id LIKE 'nhis%'`
);
console.log(`업체 ${institutions.length}건 / 시설 ${facilities.length}건`);

// 기관번호별로 묶어 "함께 제공하는 서비스" 목록을 만든다
const servicesByInstCode = new Map();
for (const inst of institutions) {
  const label = SERVICE_LABEL[inst.serviceCode];
  if (!label) continue;
  const set = servicesByInstCode.get(inst.instCode) ?? new Set();
  set.add(label);
  servicesByInstCode.set(inst.instCode, set);
}

// 치매전담실을 가진 기관번호
const dementiaInstCodes = new Set(
  institutions.filter((i) => (i.data?.dementiaUnits?.length ?? 0) > 0).map((i) => i.instCode)
);

// 매칭 인덱스: 이름+시군구+유형 → 업체행
const byKey = new Map();
for (const inst of institutions) {
  const type = TYPE_BY_SERVICE[inst.serviceCode];
  if (!type) continue;
  const key = `${normName(inst.name)}|${sigunguOf(inst.address)}|${type}`;
  const list = byKey.get(key) ?? [];
  list.push(inst);
  byKey.set(key, list);
}

const updates = [];
let unmatched = 0;
let ambiguous = 0;

for (const f of facilities) {
  const key = `${normName(f.name)}|${sigunguOf(f.address)}|${f.facilityType}`;
  const candidates = byKey.get(key);
  if (!candidates) {
    unmatched++;
    continue;
  }
  if (candidates.length > 1) {
    ambiguous++;
    continue; // 같은 이름·같은 구·같은 유형이 여럿이면 잘못 붙이느니 건너뛴다
  }
  const inst = candidates[0];
  const d = inst.data ?? {};
  const extra = { ...f.extra };

  extra.instCode = inst.instCode;

  // --- 정원·현원·대기 (남녀 합산) ---
  if (d.capacity) {
    const cur = (d.capacity.currentMale ?? 0) + (d.capacity.currentFemale ?? 0);
    const wait = (d.capacity.waitMale ?? 0) + (d.capacity.waitFemale ?? 0);
    if (d.capacity.capacity > 0) extra.capacity = d.capacity.capacity;
    if (d.capacity.currentMale != null || d.capacity.currentFemale != null) {
      extra.currentOccupancy = cur;
    }
    if (d.capacity.waitMale != null || d.capacity.waitFemale != null) {
      extra.waitlistCount = wait;
    }
    if (d.capacity.availableSlots != null) extra.availableSlots = d.capacity.availableSlots;
  }

  // --- 인력현황 — 입소·주야간은 staff, 방문요양은 staffHomecare 시트를 쓴다 ---
  const s = f.facilityType === "HOME_CARE" ? d.staffHomecare : d.staff;
  if (s) {
    const careWorkers = (s.careWorkers1 ?? 0) + (s.careWorkers2 ?? 0) + (s.careWorkersProvisional ?? 0);
    extra.staff = {
      careWorkers,
      nurses: (s.nurses ?? 0) + (s.nursingAssistants ?? 0),
      socialWorkers: s.socialWorkers ?? 0,
      physicalTherapists: s.physicalTherapists ?? 0,
    };
    extra.staffDetail = {
      administrative: {
        facilityHead: s.facilityHead ?? 0,
        officeManager: s.officeManager ?? 0,
        staff: s.officeStaff ?? 0,
      },
      socialCare: {
        socialWorkers: s.socialWorkers ?? 0,
        physicalTherapists: s.physicalTherapists ?? 0,
        occupationalTherapists: s.occupationalTherapists ?? 0,
      },
      medical: {
        fullTimeDoctors: s.fullTimeDoctors ?? 0,
        partTimeDoctors: s.partTimeDoctors ?? 0,
        nurses: s.nurses ?? 0,
        nursingAssistants: s.nursingAssistants ?? 0,
      },
    };
    // 요양보호사 수는 기존 타입에 자리가 없어 별도 필드로 — 상세페이지에서 따로 보여준다
    extra.careWorkerDetail = {
      level1: s.careWorkers1 ?? 0,
      level2: s.careWorkers2 ?? 0,
      provisional: s.careWorkersProvisional ?? 0,
      total: careWorkers,
    };
    extra.staffTotal = s.total ?? 0;
  }

  // --- 시설현황 (침실 구성·공용 공간) ---
  if (d.rooms) {
    const r = d.rooms;
    extra.facilityRooms = {
      bedrooms: {
        single: r.single ?? 0,
        double: r.double ?? 0,
        triple: r.triple ?? 0,
        quad: r.quad ?? 0,
        special: r.special ?? 0,
      },
      medical: { nursingRoom: r.nursingRoom ?? 0, rehabRoom: r.rehabRoom ?? 0 },
      dining: {
        diningRoom: r.diningRoom ?? 0,
        restroom: r.restroom ?? 0,
        bathroom: r.bathroom ?? 0,
      },
    };
    extra.programRoomCount = r.programRoom ?? 0;
    const types = [];
    if (r.single > 0) types.push("1인실");
    if (r.double > 0) types.push("2인실");
    if (r.triple > 0) types.push("3인실");
    if (r.quad > 0) types.push("4인실");
    if (r.special > 0) types.push("특수침실");
    if (types.length > 0) extra.roomTypes = types;
  }

  // --- 프로그램 운영 ---
  if (d.programs?.length) {
    extra.programs = d.programs.map((p) => ({
      name: p.name,
      targetCount: Number(String(p.target).replace(/[^\d]/g, "")) || 0,
      frequency: p.frequency,
      location: p.location,
      category: p.category,
    }));
  }

  // --- 비급여비용 ---
  if (d.nonCoveredFees?.length) {
    extra.nonCoveredFees = d.nonCoveredFees.map((fee) => ({
      name: fee.name,
      monthly: fee.monthly ?? 0,
      daily: fee.daily ?? 0,
      basis: fee.basis,
      note: fee.note,
    }));
  }

  // --- 근속현황 — 요양보호사가 오래 다니는 곳이 돌봄도 안정적 ---
  if (d.tenure?.length) {
    extra.tenure = d.tenure
      .filter((t) => t.total > 0)
      .map((t) => ({
        role: t.role,
        total: t.total,
        over2y: t.over2y,
        y1to2: t.y1to2,
        under1y: (t.under3m ?? 0) + (t.m3to6 ?? 0) + (t.m6to1y ?? 0),
      }));
  }

  // --- 기관 운영 정보 ---
  if (d.basic) {
    extra.institutionInfo = {
      homepage: d.basic.homepage,
      email: d.basic.email,
      transport: d.basic.transport,
      operatingHours: d.basic.operatingHours,
      parkingInfo: d.basic.parkingInfo,
      designatedAt: d.basic.designatedAt,
      liabilityInsurance: d.basic.liabilityInsurance,
      professionalLiabilityInsurance: d.basic.professionalLiabilityInsurance,
      integratedHomeCare: d.basic.integratedHomeCare,
    };
  }

  // --- 함께 제공하는 다른 서비스 / 치매전담실 ---
  const others = [...(servicesByInstCode.get(inst.instCode) ?? [])].filter(
    (l) => l !== SERVICE_LABEL[inst.serviceCode]
  );
  if (others.length > 0) extra.otherServices = others;
  if (dementiaInstCodes.has(inst.instCode)) extra.hasDementiaUnit = true;

  // 전화번호가 비어 있던 시설은 업체 데이터로 채운다
  updates.push({ id: f.id, extra, phone: inst.phone || null });
}

const withPrograms = updates.filter((u) => u.extra.programs?.length).length;
const withStaff = updates.filter((u) => (u.extra.staffTotal ?? 0) > 0).length;
const withRooms = updates.filter((u) => u.extra.facilityRooms?.bedrooms.single != null).length;
const withFees = updates.filter((u) => u.extra.nonCoveredFees?.length).length;
const withDementia = updates.filter((u) => u.extra.hasDementiaUnit).length;
const withHomepage = updates.filter((u) => u.extra.institutionInfo?.homepage).length;

console.log(
  `\n매칭: ${updates.length}건 / 이름 못 찾음 ${unmatched}건 / 동명이인 모호 ${ambiguous}건`
);
console.log(
  `채워지는 정보 — 프로그램 ${withPrograms} / 인력 ${withStaff} / 시설현황 ${withRooms} / 비급여 ${withFees} / 치매전담실 ${withDementia} / 홈페이지 ${withHomepage}`
);

if (!WRITE) {
  const sample = updates.find((u) => u.extra.programs?.length);
  console.log("\n미리보기 모드입니다. --write 를 붙이면 반영합니다.");
  if (sample) {
    console.log(
      "샘플:",
      JSON.stringify(
        {
          id: sample.id,
          instCode: sample.extra.instCode,
          staff: sample.extra.staff,
          careWorkerDetail: sample.extra.careWorkerDetail,
          roomTypes: sample.extra.roomTypes,
          programs: sample.extra.programs?.slice(0, 3),
          otherServices: sample.extra.otherServices,
          institutionInfo: sample.extra.institutionInfo,
        },
        null,
        2
      ).slice(0, 2000)
    );
  }
  await client.end();
  process.exit(0);
}

console.log("\n반영 시작…");
let done = 0;
for (const u of updates) {
  await client.query(
    `UPDATE "Facility" SET extra = $1, phone = COALESCE(NULLIF(phone,''), $2) WHERE id = $3`,
    [JSON.stringify(u.extra), u.phone, u.id]
  );
  done++;
  if (done % 1000 === 0) console.log(`  ${done}/${updates.length}`);
}
console.log(`완료: ${done}건 반영됨.`);
await client.end();
