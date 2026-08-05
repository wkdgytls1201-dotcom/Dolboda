// 분류 규칙만 돌려보는 미리보기 — 이미지는 건드리지 않는다.
// 사용법: node scripts/photo-dryrun.mjs <엔트리목록.txt>

import fs from "fs";
import { groupByFacility, selectPhotos } from "./photo-classify.mjs";

const listFile = process.argv[2];
if (!listFile) {
  console.error("사용법: node scripts/photo-dryrun.mjs <엔트리목록.txt>");
  process.exit(1);
}

const paths = fs.readFileSync(listFile, "utf8").split(/\r?\n/).filter(Boolean);
const facilities = groupByFacility(paths);

const areaCount = {};
let heroExterior = 0;
let heroFallback = 0;
let noHero = 0;
let totalSelected = 0;
let totalPhotos = 0;
const noExteriorFacilities = [];

for (const f of facilities.values()) {
  const sel = selectPhotos(f.photos);
  totalPhotos += sel.total;
  totalSelected += (sel.hero ? 1 : 0) + sel.gallery.length + sel.programs.length;

  for (const p of [sel.hero, ...sel.gallery, ...sel.programs]) {
    if (!p) continue;
    areaCount[p.area] = (areaCount[p.area] ?? 0) + 1;
  }

  if (!sel.hero) noHero++;
  else if (sel.hero.area === "exterior") heroExterior++;
  else {
    heroFallback++;
    if (noExteriorFacilities.length < 15) {
      noExteriorFacilities.push(`${f.name}(${f.instCode}) → ${sel.hero.area} / ${sel.hero.caption}`);
    }
  }
}

console.log(`시설 수: ${facilities.size}`);
console.log(`원본 사진: ${totalPhotos}장 → 선별: ${totalSelected}장 (${Math.round((totalSelected / totalPhotos) * 100)}%)`);
console.log("");
console.log("대표사진(hero) 판정:");
console.log(`  외부전경으로 잡힘: ${heroExterior} (${Math.round((heroExterior / facilities.size) * 100)}%)`);
console.log(`  외부 없어 대체:    ${heroFallback}`);
console.log(`  사진 자체 없음:    ${noHero}`);
console.log("");
console.log("선별된 사진의 영역 분포:");
for (const [area, n] of Object.entries(areaCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${area.padEnd(10)} ${n}`);
}
console.log("");
console.log("외부전경이 없어 다른 사진이 대표가 된 예시:");
for (const s of noExteriorFacilities) console.log(`  ${s}`);
