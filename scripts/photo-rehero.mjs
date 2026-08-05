// 이미 업로드된 시설의 대표사진(photos[0]·photoItems[0])을 캡션 기준으로 재선정한다.
//
// 배경(2026-08-05 사용자 피드백): 외관으로 분류된 사진이라도 캡션이 "직원회의실",
// "프로그램 활동"처럼 사람이 주인공인 경우가 있다 — 건물·간판(글자가 보이는) 사진이
// 대표로 먼저 와야 한다. 분류기(photo-classify.mjs)의 heroScore에는 이제 사람 감점이
// 들어갔지만, 이미 DB에 반영된 경기도 6,000여 곳은 이 스크립트로 순서만 고친다.
//
// 안전 장치:
//  - 사진 파일·R2는 건드리지 않는다. extra.photos / extra.photoItems의 "순서"만 바꾼다.
//  - photos와 photoItems가 같은 URL 집합일 때만 손댄다(콘솔 업로드 등 다른 경로로
//    들어온 데이터는 건너뛰고 개수만 보고).
//  - 더 나은 후보가 "확실히"(점수가 현 대표보다 높을 때만) 있을 때만 바꾼다.
//  - 기본은 dry-run — --write를 붙여야 실제 UPDATE. 원 순서는 manifest.jsonl에 남아
//    있어 언제든 되돌릴 수 있다.
//
// 사용: node scripts/photo-rehero.mjs [--write] [--sample=20]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  stripName,
  neutralizeRoomNames,
  HERO_PERSON_RE,
  HERO_BUILDING_RE,
  HERO_MAP_RE,
  HERO_GRAPHIC_RE,
} from "./photo-classify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && !line.startsWith("#")) {
      const k = line.slice(0, i).trim();
      if (!process.env[k]) process.env[k] = line.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
    }
  }
}
loadEnv();

const write = process.argv.includes("--write");
const sampleN = Number((process.argv.find((a) => a.startsWith("--sample=")) ?? "").split("=")[1] || 20);

/** 영역별 대표 적합 서열 — 외관>입구>공용>생활실 순. 프로그램은 음수라 "다른 영역의
 * 사람 사진을 피해 프로그램 사진으로 도망가는" 교체가 일어나지 않는다(1차 dry-run에서
 * "야외 나들이" → "감나무 만들기"(program) 같은 역효과가 실제로 나왔다). */
const AREA_BASE = {
  exterior: 100,
  entrance: 80,
  common: 45,
  room: 40,
  dining: 35,
  rehab: 30,
  outdoor: 25,
  etc: 5,
  program: -30,
};

/** DB에 저장된 photoItems 한 장의 대표 적합 점수 — 분류기의 heroScore와 같은 정신.
 * (category·ext는 DB에 없으므로 area+캡션으로만 계산한다) */
function itemScore(item, facilityName) {
  const text = neutralizeRoomNames(stripName(item.caption ?? "", facilityName));
  let s = AREA_BASE[item.area] ?? 5;
  if (/외부전경|외관|건물전경|건물전면|건물사진|시설전경/.test(text)) s += 30;
  else if (/전경/.test(text)) s += 10;
  if (HERO_BUILDING_RE.test(text)) s += 20;
  if (HERO_PERSON_RE.test(text)) s -= 60;
  if (HERO_MAP_RE.test(text)) s -= 40; // 지도·약도는 시설 "사진"이 아니다
  if (HERO_GRAPHIC_RE.test(text)) s -= 30; // 명함·로고 그래픽도 마찬가지
  if (/화장실/.test(text)) s -= 50; // 화장실이 대표인 것은 최악의 결과
  return s;
}

/** 이만큼은 확실히 나아야 바꾼다 — "전경"↔"입간판" 같은 옆걸음 교체(churn)를 막는다 */
const SWAP_MARGIN = 15;

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(`
  SELECT id, name, extra->'photos' AS photos, extra->'photoItems' AS items
  FROM "Facility"
  WHERE extra ? 'photoItems'
`);

let changed = 0;
let unchanged = 0;
let skippedMismatch = 0;
const samples = [];

for (const row of rows) {
  const items = row.items;
  const photos = row.photos;
  if (!Array.isArray(items) || !Array.isArray(photos) || items.length < 2) {
    unchanged++;
    continue;
  }
  // photos와 photoItems가 같은 사진 집합인지 — 다르면 다른 경로로 관리되는 데이터
  const itemUrls = items.map((x) => x?.url);
  if (photos.length !== items.length || !photos.every((u) => itemUrls.includes(u))) {
    skippedMismatch++;
    continue;
  }

  const currentScore = itemScore(items[0], row.name);
  let bestIdx = 0;
  let bestScore = currentScore;
  for (let i = 1; i < items.length; i++) {
    const s = itemScore(items[i], row.name);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }

  // 확실히 나은 후보가 있을 때만 교체하고, 프로그램 사진으로의 "도피성 교체"는 막는다
  // (현 대표가 프로그램이 아닌데 새 대표가 프로그램이면 개선이 아니고, 프로그램끼리의
  // 교체는 캡션만으로 우열을 가릴 수 없어 의미가 없다).
  if (
    bestIdx === 0 ||
    bestScore - currentScore < SWAP_MARGIN ||
    items[bestIdx].area === "program"
  ) {
    unchanged++;
    continue;
  }

  const newItems = [items[bestIdx], ...items.filter((_, i) => i !== bestIdx)];
  const newPhotos = newItems.map((x) => x.url);

  if (samples.length < sampleN) {
    samples.push(
      `${row.name} | 대표: "${items[0].caption ?? "(없음)"}"(${items[0].area}) → "${newItems[0].caption ?? "(없음)"}"(${newItems[0].area})`
    );
  }

  if (write) {
    await client.query(
      `UPDATE "Facility"
       SET extra = extra || jsonb_build_object('photos', $2::jsonb, 'photoItems', $3::jsonb)
       WHERE id = $1`,
      [row.id, JSON.stringify(newPhotos), JSON.stringify(newItems)]
    );
  }
  changed++;
  if (write && changed % 200 === 0) console.log(`  ${changed}곳 반영...`);
}

await client.end();

console.log(`\n=== photo-rehero ${write ? "반영 완료" : "미리보기 (--write 없음)"} ===`);
console.log(`검토: ${rows.length}곳 / 대표 교체: ${changed}곳 / 유지: ${unchanged}곳 / 건너뜀(불일치): ${skippedMismatch}곳`);
console.log(`\n교체 샘플 ${samples.length}건:`);
for (const s of samples) console.log("-", s);
