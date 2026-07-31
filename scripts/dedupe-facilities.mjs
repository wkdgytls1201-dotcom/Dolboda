// 같은 시설이 두 번 들어간 중복 레코드를 정리한다.
// 요양병원 초기 수집 때 배치가 두 번 돌면서 같은 병원이 `hira-<랜덤>`과
// `hira-<N>-JDQ4MTg4MSM1` 두 가지 id로 들어갔다. 이름+주소가 같은 그룹에서
// extra가 더 풍부한 쪽(=랜덤 id 쪽)을 남기고 나머지를 지운다.
//
// 중복이 남아 있으면 같은 내용의 상세페이지가 두 개 색인돼 검색엔진이 대표 URL을
// 못 고르고, 지역 페이지 목록에도 같은 시설이 두 번 나와 신뢰를 잃는다.
//
// 사용법: node scripts/dedupe-facilities.mjs          (미리보기)
//         node scripts/dedupe-facilities.mjs --write  (반영)

import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WRITE = process.argv.includes("--write");

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !line.startsWith("#")) {
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  }
}

const client = new pg.Client({ connectionString: env.DIRECT_URL });
await client.connect();

const { rows } = await client.query(`
  SELECT id, name, address, length(extra::text) AS extra_len, "sourceUpdatedAt"
  FROM "Facility"
  WHERE (name, address) IN (
    SELECT name, address FROM "Facility"
    WHERE "dataSource" != 'mock'
    GROUP BY name, address HAVING count(*) > 1
  )
  ORDER BY name, address
`);

// 그룹별로 남길 것 하나와 지울 것들을 가른다
const groups = new Map();
for (const r of rows) {
  const key = `${r.name}|${r.address}`;
  groups.set(key, [...(groups.get(key) ?? []), r]);
}

const keepers = [];
const doomed = [];
for (const [, list] of groups) {
  // extra가 큰 쪽이 진료과목·비급여 등 상세가 더 채워진 레코드다
  const sorted = [...list].sort((a, b) => b.extra_len - a.extra_len);
  keepers.push(sorted[0]);
  doomed.push(...sorted.slice(1).map((d) => ({ ...d, keepId: sorted[0].id })));
}

console.log(`중복 그룹 ${groups.size}개 / 삭제 대상 ${doomed.length}건`);
for (const d of doomed.slice(0, 20)) {
  console.log(`  ${d.name}: ${d.id} → ${d.keepId} 로 통합`);
}

if (!WRITE) {
  console.log("\n미리보기 모드입니다. --write 를 붙이면 실제로 정리합니다.");
  await client.end();
  process.exit(0);
}

// 상담신청이 지워질 시설을 가리키고 있으면 살아남는 쪽으로 옮긴다(문의 이력을 잃지 않게)
let moved = 0;
for (const d of doomed) {
  const res = await client.query(
    `UPDATE "ConsultRequest" SET "facilityId" = $1 WHERE "facilityId" = $2`,
    [d.keepId, d.id]
  );
  moved += res.rowCount ?? 0;
}
console.log(`상담신청 ${moved}건을 살아남는 시설로 옮김`);

const res = await client.query(`DELETE FROM "Facility" WHERE id = ANY($1)`, [
  doomed.map((d) => d.id),
]);
console.log(`삭제 완료: ${res.rowCount}건`);
await client.end();
