// 프로그램 분류 커버리지 점검 — lib/programTaxonomy.ts의 규칙이 실데이터를 얼마나 잡는지 확인.
// 사용법: npx tsx scripts/check-program-tags.mts
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tagOf, weeklyCountOf, PROGRAM_TAG_META } from "../lib/programTaxonomy";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const rows = await prisma.$queryRawUnsafe<{ name: string; category: string; frequency: string; n: bigint }[]>(`
  SELECT pr->>'name' AS name, pr->>'category' AS category, pr->>'frequency' AS frequency, count(*) AS n
  FROM "Facility", jsonb_array_elements(extra->'programs') pr
  GROUP BY 1,2,3
`);

let tagged = 0;
let total = 0;
let freqParsed = 0;
const byTag = new Map<string, number>();
const missed = new Map<string, number>();

for (const r of rows) {
  const n = Number(r.n);
  total += n;
  const tag = tagOf(r.name, r.category);
  if (tag) {
    tagged += n;
    byTag.set(tag, (byTag.get(tag) ?? 0) + n);
  } else {
    missed.set(r.name, (missed.get(r.name) ?? 0) + n);
  }
  if (weeklyCountOf(r.frequency) != null) freqParsed += n;
}

console.log(`전체 ${total.toLocaleString()}행 중 분류됨 ${tagged.toLocaleString()} (${((tagged / total) * 100).toFixed(1)}%)`);
console.log(`주기 파싱 성공 ${freqParsed.toLocaleString()} (${((freqParsed / total) * 100).toFixed(1)}%)\n`);

console.log("태그별 분포:");
for (const [tag, n] of [...byTag.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${PROGRAM_TAG_META[tag as keyof typeof PROGRAM_TAG_META].label}: ${n.toLocaleString()}`);
}

console.log("\n못 잡은 상위 20개:");
for (const [name, n] of [...missed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${n} ${name}`);
}

await prisma.$disconnect();
