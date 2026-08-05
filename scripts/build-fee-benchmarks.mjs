// 비급여 비용 지역 기준값 생성 — lib/feeBenchmarks.generated.ts를 만든다.
//
// 왜 생성 파일인가: 상세페이지가 매번 "이 지역 같은 유형 시설의 중앙값"을 집계하면
// 경기도 기준 1.2초가 걸린다(실측). 28,000여 페이지가 각자 그걸 하면 안 된다.
// 반면 비급여 비용은 **일일 동기화 대상이 아니다** — 정원·현원·등급만 매일 바뀌고,
// 비용은 기관 상세정보 마스터(import-institutions.mjs)를 다시 돌릴 때만 바뀐다.
// 그래서 값을 미리 구워 상수로 두면 런타임 비용이 0이 되고 숫자도 어긋나지 않는다.
//
// ⚠️ 기관 마스터를 다시 임포트하면 이 스크립트도 다시 돌릴 것.
//
// 중앙값을 쓰는 이유: 상급침실료처럼 한두 곳의 극단값이 평균을 끌어올린다.
// "보통 이 정도"를 보여주는 게 목적이라 중앙값이 맞다.
//
// 사용법: node --env-file=.env.local scripts/build-fee-benchmarks.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// 표본이 이보다 적으면 "이 지역 평균"이라 부를 수 없다 — 아예 만들지 않는다
const MIN_SAMPLE = 10;
// 공공데이터에 "월 1원" 같은 값이 섞여 있다(lib/feeQuality.ts가 화면에서 거르는 그 값들).
// 기준값을 오염시키지 않게 여기서도 뺀다.
const MIN_MONTHLY = 10_000;

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT fac."facilityType" AS type,
           CASE
             WHEN fac.address LIKE '전남광주통합특별시%'
               THEN CASE WHEN split_part(fac.address,' ',2) IN ('동구','서구','남구','북구','광산구')
                         THEN '광주' ELSE '전남' END
             ELSE split_part(fac.address,' ',1)
           END AS sido_raw,
           el->>'name' AS item,
           count(*)::int AS n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY (el->>'monthly')::numeric)::int AS median
    FROM "Facility" fac, jsonb_array_elements(fac.extra->'nonCoveredFees') AS el
    WHERE fac."dataSource" <> 'mock'
      AND el->>'monthly' IS NOT NULL
      AND (el->>'monthly')::numeric > ${MIN_MONTHLY}
    GROUP BY 1,2,3
    HAVING count(*) >= ${MIN_SAMPLE}
  `;

  // 시/도 표기를 REGIONS 라벨로 정규화(lib/regions.ts와 같은 기준).
  // 전남·광주 통합 표기는 위 SQL이 이미 구 단위로 갈라 놨다(15차 §3-3).
  const SIDO = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
  const normalize = (raw) => {
    if (SIDO.includes(raw)) return raw;
    const head = SIDO.find((s) => raw.startsWith(s));
    if (head) return head;
    if (raw.startsWith("충청북")) return "충북";
    if (raw.startsWith("충청남")) return "충남";
    if (raw.startsWith("전라북")) return "전북";
    if (raw.startsWith("전라남")) return "전남";
    if (raw.startsWith("경상북")) return "경북";
    if (raw.startsWith("경상남")) return "경남";
    return null; // 주소가 깨진 행(시/도 결손) — 기준값에 넣지 않는다
  };

  /** { [facilityType]: { [sido]: { [item]: { median, n } } } } */
  const out = {};
  let kept = 0;
  for (const r of rows) {
    const sido = normalize(r.sido_raw);
    if (!sido) continue;
    out[r.type] ??= {};
    out[r.type][sido] ??= {};
    // 같은 시/도가 두 표기로 들어오면(예: "서울"·"서울특별시") 표본이 큰 쪽을 남긴다
    const prev = out[r.type][sido][r.item];
    if (prev && prev.n >= r.n) continue;
    out[r.type][sido][r.item] = { median: Number(r.median), n: r.n };
    kept++;
  }

  const banner = `// 이 파일은 scripts/build-fee-benchmarks.mjs가 생성합니다 — 직접 고치지 마세요.
// 생성 시각: ${new Date().toISOString().slice(0, 10)}
// 기준: 시/도 × 시설유형 × 항목별 월 비용 중앙값(표본 ${MIN_SAMPLE}곳 이상, ${MIN_MONTHLY.toLocaleString()}원 초과분만).
// 기관 상세정보 마스터를 다시 임포트하면 이 스크립트를 다시 돌리세요.
`;
  const body = `${banner}
export interface FeeBenchmark {
  /** 그 지역 같은 유형 시설들의 월 비용 중앙값 */
  median: number;
  /** 표본 시설 수 — 화면에 "N곳 기준"으로 함께 밝힌다 */
  n: number;
}

export const FEE_BENCHMARKS: Record<string, Record<string, Record<string, FeeBenchmark>>> =
${JSON.stringify(out, null, 2)};

/** 이 시설이 속한 지역·유형의 항목 기준값 — 없으면 null(표본 부족·주소 결손) */
export function feeBenchmarkFor(
  facilityType: string,
  sido: string | null,
  item: string
): FeeBenchmark | null {
  if (!sido) return null;
  return FEE_BENCHMARKS[facilityType]?.[sido]?.[item] ?? null;
}
`;

  const target = path.join(__dirname, "..", "lib", "feeBenchmarks.generated.ts");
  fs.writeFileSync(target, body, "utf8");
  const types = Object.keys(out).length;
  console.log(`생성 완료: ${target}`);
  console.log(`유형 ${types}개 · 항목 기준값 ${kept}개 · ${Math.round(body.length / 1024)}KB`);
  for (const [type, bySido] of Object.entries(out)) {
    const items = new Set();
    for (const m of Object.values(bySido)) for (const k of Object.keys(m)) items.add(k);
    console.log(`  ${type}: 시도 ${Object.keys(bySido).length}곳 · 항목 ${[...items].join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
