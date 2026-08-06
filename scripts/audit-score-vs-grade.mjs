// 안심지수와 공단·심평원 평가등급을 **전수 대조**한다.
//
// 왜 필요한가: 안심지수는 이 서비스의 핵심 자산인데, 정작 "공단 등급과 얼마나 다른가"를
// 아무도 재본 적이 없다. 결과는 둘 중 하나고 어느 쪽이든 값진다.
//   - 심하게 어긋나는 무리가 있다 → 우리 계산의 버그·과대가중을 찾을 실마리
//   - 어긋나는 데 이유가 있다   → "등급만으로는 안 보이는 것"이 이 지표의 존재 이유
//
// 점수는 TS(lib/dolbodaScore.ts)라 순수 node에서 못 부른다. 그래서 **화면이 쓰는 그 경로**
// (/api/facilities?ids=...&view=card)로 받아 대조한다 — 사용자가 실제로 보는 값 그대로다.
//
// 사용법(dev 서버가 떠 있어야 한다):
//   node --env-file=.env.local scripts/audit-score-vs-grade.mjs [--base http://localhost:3000]

import pg from "pg";

const baseArg = process.argv.indexOf("--base");
const BASE = baseArg > 0 ? process.argv[baseArg + 1] : "http://localhost:3000";
const BATCH = 300;

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
await client.connect();
const { rows } = await client.query(
  `SELECT id, name, grade, "facilityType", address
   FROM "Facility"
   WHERE "dataSource" <> 'mock' AND grade IS NOT NULL
   ORDER BY id ASC`
);
await client.end();
console.log(`등급이 있는 시설 ${rows.length}곳을 대조합니다...`);

const byId = new Map(rows.map((r) => [r.id, r]));
const scored = [];

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const url = `${BASE}/api/facilities?view=card&ids=${chunk.map((r) => r.id).join(",")}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`요청 실패 ${res.status} — dev 서버가 떠 있는지 확인하세요.`);
    process.exit(1);
  }
  const json = await res.json();
  for (const item of json.items ?? []) {
    const src = byId.get(item.id);
    if (src && typeof item.dolbodaTotal === "number") {
      scored.push({ ...src, total: item.dolbodaTotal });
    }
  }
  if ((i / BATCH) % 20 === 0) console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
}

console.log(`\n점수를 받은 시설: ${scored.length}곳\n`);

// ── 1. 등급별 안심지수 분포 ────────────────────────────────────────────────
const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
console.log("등급별 안심지수 분포");
console.log("등급   n       최소  p25  중앙  p75  최대");
for (let g = 1; g <= 5; g++) {
  const t = scored.filter((s) => s.grade === g).map((s) => s.total);
  if (t.length === 0) continue;
  console.log(
    `${g}등급  ${String(t.length).padEnd(7)} ${String(Math.min(...t)).padEnd(5)} ${String(
      pct(t, 0.25)
    ).padEnd(4)} ${String(pct(t, 0.5)).padEnd(5)} ${String(pct(t, 0.75)).padEnd(4)} ${Math.max(
      ...t
    )}`
  );
}

// ── 2. 순위 상관 (스피어만) ────────────────────────────────────────────────
// 등급은 낮을수록 좋고 점수는 높을수록 좋다 — 음의 상관이 정상이다.
const n = scored.length;
const rank = (vals) => {
  const idx = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(vals.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
};
const rg = rank(scored.map((s) => s.grade));
const rs = rank(scored.map((s) => s.total));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const mg = mean(rg);
const ms = mean(rs);
let num = 0,
  dg = 0,
  ds = 0;
for (let i = 0; i < n; i++) {
  num += (rg[i] - mg) * (rs[i] - ms);
  dg += (rg[i] - mg) ** 2;
  ds += (rs[i] - ms) ** 2;
}
const rho = num / Math.sqrt(dg * ds);
console.log(`\n스피어만 순위상관(등급 vs 안심지수): ${rho.toFixed(3)}`);
console.log(
  rho < -0.3
    ? "  → 방향이 맞다(등급이 좋을수록 지수도 높다). 지표가 등급과 통째로 어긋나지는 않는다."
    : rho < 0
    ? "  → 방향은 맞지만 약하다. 지수가 등급과 다른 것을 많이 보고 있다는 뜻."
    : "  ⚠️ 방향이 반대이거나 무상관 — 계산 오류를 의심할 것."
);

// ── 3. 심한 불일치 ────────────────────────────────────────────────────────
// "1등급인데 점수 하위" / "5등급인데 점수 상위"
const allTotals = scored.map((s) => s.total);
const p20 = pct(allTotals, 0.2);
const p80 = pct(allTotals, 0.8);
const goodGradeLowScore = scored.filter((s) => s.grade === 1 && s.total <= p20);
const badGradeHighScore = scored.filter((s) => s.grade === 5 && s.total >= p80);

console.log(`\n전체 점수 하위20% 경계 ${p20}점 / 상위20% 경계 ${p80}점`);
console.log(`1등급인데 하위20%: ${goodGradeLowScore.length}곳`);
goodGradeLowScore.slice(0, 8).forEach((s) => console.log(`   ${s.total}점 ${s.name} (${s.facilityType})`));
console.log(`5등급인데 상위20%: ${badGradeHighScore.length}곳`);
badGradeHighScore.slice(0, 8).forEach((s) => console.log(`   ${s.total}점 ${s.name} (${s.facilityType})`));

// ── 4. 유형별로 지수가 쏠려 있지 않은지 ────────────────────────────────────
console.log("\n유형별 안심지수 중앙값 (한 유형만 구조적으로 높/낮으면 가중치 편향 신호)");
const types = [...new Set(scored.map((s) => s.facilityType))];
for (const t of types) {
  const v = scored.filter((s) => s.facilityType === t).map((s) => s.total);
  console.log(`  ${t.padEnd(18)} n=${String(v.length).padEnd(6)} 중앙 ${pct(v, 0.5)} (p25 ${pct(v, 0.25)} · p75 ${pct(v, 0.75)})`);
}
