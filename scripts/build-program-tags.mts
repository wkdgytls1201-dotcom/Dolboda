// 시설별 프로그램 태그 요약을 만들어 extra.programTags 에 저장한다.
// 검색·필터가 매번 12만 행을 훑을 수는 없어서, 미리 계산해 시설 row 안에 넣어둔다.
//
// 사용법:
//   npx tsx scripts/build-program-tags.mts          # 미리보기
//   npx tsx scripts/build-program-tags.mts --write  # 반영
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { summarizePrograms, PROGRAM_TAG_META } from "../lib/programTaxonomy";

const WRITE = process.argv.includes("--write");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface ProgramRow {
  name: string;
  category?: string;
  frequency?: string;
}

const rows = await prisma.$queryRawUnsafe<{ id: string; programs: ProgramRow[] }[]>(`
  SELECT id, extra->'programs' AS programs
  FROM "Facility"
  WHERE extra ? 'programs' AND jsonb_array_length(extra->'programs') > 0
`);

console.log(`프로그램 보유 시설 ${rows.length.toLocaleString()}곳`);

const tagTotals = new Map<string, number>();
let updated = 0;

for (const row of rows) {
  const summary = summarizePrograms(row.programs ?? []);
  if (summary.length === 0) continue;
  for (const s of summary) tagTotals.set(s.tag, (tagTotals.get(s.tag) ?? 0) + 1);

  if (WRITE) {
    // jsonb_set으로 extra의 나머지 값은 건드리지 않는다
    await prisma.$executeRawUnsafe(
      `UPDATE "Facility" SET extra = jsonb_set(extra, '{programTags}', $1::jsonb) WHERE id = $2`,
      JSON.stringify(summary),
      row.id
    );
    updated++;
    if (updated % 2000 === 0) console.log(`  ${updated.toLocaleString()}곳 반영`);
  }
}

console.log("\n태그를 가진 시설 수:");
for (const [tag, n] of [...tagTotals.entries()].sort((a, b) => b[1] - a[1])) {
  const meta = PROGRAM_TAG_META[tag as keyof typeof PROGRAM_TAG_META];
  console.log(`  ${meta.emoji} ${meta.label}: ${n.toLocaleString()}곳`);
}

if (WRITE) {
  console.log(`\n완료: ${updated.toLocaleString()}곳 반영됨.`);
} else {
  console.log("\n미리보기 모드입니다. 반영하려면 --write 를 붙여 다시 실행하세요.");
}

await prisma.$disconnect();
