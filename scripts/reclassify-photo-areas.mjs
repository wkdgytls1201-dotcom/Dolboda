// 이미 업로드된 사진의 영역(area)을 새 분류 규칙으로 다시 매긴다.
//
// 왜 필요한가: 2026-08-06에 bath·care·office 영역을 신설했다(scripts/photo-classify.mjs).
// 그 전에 올린 9,238곳의 사진은 전부 옛 규칙으로 분류돼 있어, 목욕실·간호사실·사무실이
// "기타"에 묻혀 있다(실측 etc 11,879장 중 4,882장이 이 셋). 사진을 다시 올릴 필요는
// 없다 — DB의 area 라벨만 고쳐 쓰면 된다.
//
// ⚠️ 캡션만 보고 판단한다. 원본 파일명의 카테고리(시설구조·전경 등)는 photoItems에
//    저장돼 있지 않아서다. 그래서 **새로 생긴 세 영역으로 옮기는 것만** 한다 —
//    기존 분류를 캡션만으로 다시 뒤집으면 카테고리 신호를 잃은 채 판단하게 된다.
//
// ⚠️ photos(URL 배열)의 순서는 건드리지 않는다. 대표사진은 photos[0]이고, 순서를 바꾸면
//    이미 노출 중인 시설의 얼굴이 예고 없이 달라진다. 새 규칙의 대표사진 선정은
//    다음 지역 import부터 적용된다.
//
// 사용법:
//   node --env-file=.env.local scripts/reclassify-photo-areas.mjs           # 드라이런
//   node --env-file=.env.local scripts/reclassify-photo-areas.mjs --write   # 실제 반영

import { createRequire } from "module";
import { classifyArea } from "./photo-classify.mjs";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const WRITE = process.argv.includes("--write");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** 이번 개편으로 새로 생긴 영역 — 여기로 가는 이동만 반영한다 */
const NEW_AREAS = new Set(["bath", "care", "office"]);

/** program에서 빼오지 않는다 — 그 분류는 캡션뿐 아니라 파일명 카테고리("프로그램")까지
 *  보고 정해진 것이라, 캡션만 남은 지금 뒤집으면 근거가 부족하다. */
const KEEP_AS_IS = new Set(["program"]);

async function main() {
  console.log(`사진 영역 재분류${WRITE ? "" : " (드라이런)"}`);

  // jsonb 키 존재 여부(?)는 Prisma의 타입 필터로 표현하기 번거로워 raw로 고른다
  const rows = await prisma.$queryRaw`
    SELECT id, name, extra->'photoItems' AS items
    FROM "Facility" WHERE extra ? 'photoItems'
  `;
  console.log(`photoItems 보유 시설: ${rows.length.toLocaleString()}곳`);

  const moves = {};
  let changedFacilities = 0;
  let changedPhotos = 0;

  for (const f of rows) {
    const items = f.items;
    if (!Array.isArray(items)) continue;

    let touched = false;
    const next = items.map((it) => {
      const caption = typeof it?.caption === "string" ? it.caption : "";
      if (!caption) return it;
      // category는 저장돼 있지 않다 — 캡션만으로 판단한다(빈 문자열로 넘긴다)
      if (KEEP_AS_IS.has(it.area)) return it;
      const area = classifyArea({ category: "", caption, facilityName: f.name });
      if (area === it.area || !NEW_AREAS.has(area)) return it;
      moves[`${it.area} → ${area}`] = (moves[`${it.area} → ${area}`] ?? 0) + 1;
      touched = true;
      changedPhotos++;
      return { ...it, area };
    });

    if (!touched) continue;
    changedFacilities++;
    if (WRITE) {
      await prisma.$executeRaw`
        UPDATE "Facility"
        SET extra = jsonb_set(extra, '{photoItems}', ${JSON.stringify(next)}::jsonb),
            "updatedAt" = now()
        WHERE id = ${f.id}
      `;
    }
  }

  console.log(`\n이동한 사진 ${changedPhotos.toLocaleString()}장 · 시설 ${changedFacilities.toLocaleString()}곳`);
  for (const [k, n] of Object.entries(moves).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(22)} ${String(n).padStart(5)}장`);
  }
  if (!WRITE) console.log("\n드라이런 종료 — 반영하려면 --write");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
