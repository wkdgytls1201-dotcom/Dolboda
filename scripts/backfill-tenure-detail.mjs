// Facility.extra.tenure에 1년 미만 세 구간(under3m·m3to6·m6to1y)을 채우는 일회성 백필.
//
// 왜 매퍼(map-institutions-to-facilities.mjs)를 다시 돌리지 않는가:
// 그 스크립트는 Institution 데이터로 extra 전체를 다시 쓴다. 그런데 정원·현원·대기·등급은
// 매일 daily-nhis-sync.mjs가 더 최신 값으로 갱신하고 있어서, 매퍼를 다시 돌리면 그 값들이
// 옛 값으로 되돌아간다. 그래서 tenure 항목만 골라 덮어쓴다.
//
// 대응 규칙은 매퍼와 같다: Facility.extra.instCode + 시설 유형에 해당하는 급여종류코드.
//
//   node --env-file=.env.local scripts/backfill-tenure-detail.mjs          (드라이런)
//   node --env-file=.env.local scripts/backfill-tenure-detail.mjs --write

import { config } from "dotenv";
config({ path: ".env.local" });

const WRITE = process.argv.includes("--write");
const { prisma } = await import("../lib/prisma.ts");

// 매퍼의 TYPE_BY_SERVICE를 뒤집은 것
const SERVICE_BY_TYPE = {
  NURSING_HOME: ["A03", "A04"],
  DAY_NIGHT_CARE: ["B03", "C03"],
  HOME_CARE: ["B01", "C01"],
};

const facilities = await prisma.$queryRaw`
  SELECT id, "facilityType"::text AS ftype, extra->>'instCode' AS inst_code, extra->'tenure' AS tenure
  FROM "Facility"
  WHERE "dataSource" != 'mock' AND extra ? 'instCode' AND extra ? 'tenure'
`;
console.log(`대상 시설: ${facilities.length}곳`);

const institutions = await prisma.$queryRaw`
  SELECT "instCode", "serviceCode", data->'tenure' AS tenure FROM "Institution" WHERE data ? 'tenure'
`;
const instMap = new Map();
for (const i of institutions) instMap.set(`${i.instCode}|${i.serviceCode}`, i.tenure);
console.log(`업체 근속 행: ${institutions.length}`);

let matched = 0;
let alreadyDone = 0;
let noSource = 0;
const updates = [];

for (const f of facilities) {
  const codes = SERVICE_BY_TYPE[f.ftype];
  if (!codes) continue;

  // 이미 세분값이 있으면 건너뛴다(재실행 안전)
  if (Array.isArray(f.tenure) && f.tenure.some((t) => t && t.under3m !== undefined)) {
    alreadyDone++;
    continue;
  }

  let src = null;
  for (const c of codes) {
    const hit = instMap.get(`${f.inst_code}|${c}`);
    if (hit) {
      src = hit;
      break;
    }
  }
  if (!src) {
    noSource++;
    continue;
  }

  // 역할별로 원본을 찾아 세 구간만 덧붙인다. 기존 값(total·y1to2·over2y·under1y)은 건드리지 않는다 —
  // 그 값들은 지금 화면·지수가 쓰고 있고, 원본과 어긋나 있더라도 이 백필의 책임 범위가 아니다.
  const byRole = new Map(src.map((t) => [t.role, t]));
  const next = (f.tenure ?? []).map((t) => {
    const o = byRole.get(t.role);
    if (!o) return t;
    return {
      ...t,
      under3m: o.under3m ?? 0,
      m3to6: o.m3to6 ?? 0,
      m6to1y: o.m6to1y ?? 0,
    };
  });

  updates.push({ id: f.id, tenure: next });
  matched++;
}

console.log(
  `\n채울 대상 ${matched}곳 · 이미 있음 ${alreadyDone}곳 · 원본 못 찾음 ${noSource}곳`
);

if (updates.length > 0) {
  const s = updates[0];
  console.log("\n샘플:", s.id, JSON.stringify(s.tenure.find((t) => t.role === "요양보호사") ?? s.tenure[0]));
}

if (!WRITE) {
  console.log("\n드라이런 종료 — 반영하려면 --write");
  await prisma.$disconnect();
  process.exit(0);
}

// jsonb_set으로 tenure 키만 교체한다(다른 extra 필드는 그대로).
let done = 0;
for (const u of updates) {
  await prisma.$executeRaw`
    UPDATE "Facility"
    SET extra = jsonb_set(extra, '{tenure}', ${JSON.stringify(u.tenure)}::jsonb),
        "updatedAt" = now()
    WHERE id = ${u.id}
  `;
  done++;
  if (done % 2000 === 0) console.log(`  ${done}/${updates.length}`);
}
console.log(`\n완료: ${done}곳 갱신`);
await prisma.$disconnect();
