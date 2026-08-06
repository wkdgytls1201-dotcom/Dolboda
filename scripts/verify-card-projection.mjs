// 카드 목록용 extra 투영본이 "점수가 읽는 값"을 하나도 바꾸지 않는지 전수 대조한다.
//
// 왜 이렇게 검증하나 — lib/facilityCardQuery.ts는 목록 응답을 가볍게 하려고 extra에서
// 큰 덩어리를 SQL 단계에서 줄인다(사진 목록 → 첫 장, 프로그램 원본 → 카테고리 종류,
// 근속 상세 → 합계 …). 줄인 값으로도 lib/dolbodaScore.ts의 계산이 **같은 답**을 내야
// 하는데, 점수 함수는 TS라 순수 node 스크립트에서 못 부른다.
//
// 그래서 함수를 부르는 대신 **점수가 실제로 읽는 입력값**이 원본과 같은지 본다.
// 점수가 그 입력만 보고 계산하므로, 입력이 같으면 결과도 같다.
//   - programs        → 카테고리 종류의 집합 (점수: new Set(...).size)
//   - tenure          → total·over2y 합 (점수: reduce 합)
//   - institutionInfo → homepage·operatingHours·transport·parkingInfo·liabilityInsurance
//   - facilityRooms   → bedrooms 5종 + medical.rehabRoom
//   - photos/photoItems → 첫 장 (카드 썸네일·alt)
//   - 그 외 키        → 통째로 동일해야 한다
//
// ⚠️ lib/dolbodaScore.ts가 새 extra 항목을 읽게 되면 이 목록과 투영 SQL을 같이 늘릴 것.
//
// 사용법: node --env-file=.env.local scripts/verify-card-projection.mjs [--limit N]

import pg from "pg";

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : 0; // 0 = 전수

// lib/facilityCardQuery.ts의 CARD_EXTRA와 **같은 식**이어야 한다.
const CARD_EXTRA = `
  (extra - 'photos' - 'photoItems' - 'facilityRooms' - 'programs' - 'tenure' - 'institutionInfo')
  || jsonb_strip_nulls(jsonb_build_object(
    'photos',
      CASE WHEN extra->'photos'->0 IS NULL THEN NULL
           ELSE jsonb_build_array(extra->'photos'->0) END,
    'photoItems',
      CASE WHEN extra->'photoItems'->0 IS NULL THEN NULL
           ELSE jsonb_build_array(extra->'photoItems'->0) END,
    'facilityRooms',
      CASE WHEN extra ? 'facilityRooms' THEN jsonb_build_object(
        'bedrooms', extra->'facilityRooms'->'bedrooms',
        'medical', jsonb_build_object('rehabRoom', extra->'facilityRooms'->'medical'->'rehabRoom')
      ) ELSE NULL END,
    'programs',
      CASE WHEN jsonb_typeof(extra->'programs') = 'array' THEN (
        SELECT jsonb_agg(jsonb_build_object('category', d.cat))
        FROM (SELECT DISTINCT (p->>'category') AS cat
              FROM jsonb_array_elements(extra->'programs') p) d
      ) ELSE NULL END,
    'tenure',
      CASE WHEN jsonb_typeof(extra->'tenure') = 'array' THEN (
        SELECT jsonb_build_array(jsonb_build_object(
          'total',  COALESCE(sum(COALESCE((t->>'total')::numeric, 0)), 0),
          'over2y', COALESCE(sum(COALESCE((t->>'over2y')::numeric, 0)), 0)))
        FROM jsonb_array_elements(extra->'tenure') t
      ) ELSE NULL END,
    'institutionInfo',
      CASE WHEN extra ? 'institutionInfo' THEN jsonb_build_object(
        'homepage',           extra->'institutionInfo'->'homepage',
        'operatingHours',     extra->'institutionInfo'->'operatingHours',
        'transport',          extra->'institutionInfo'->'transport',
        'parkingInfo',        extra->'institutionInfo'->'parkingInfo',
        'liabilityInsurance', extra->'institutionInfo'->'liabilityInsurance'
      ) ELSE NULL END,
    'programTags',
      CASE WHEN jsonb_typeof(extra->'programTags') = 'array' THEN (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'tag',     a.t->'tag',
                   'count',   a.t->'count',
                   'weekly',  a.t->'weekly',
                   'samples', '[]'::jsonb)
                 ORDER BY a.ord)
        FROM jsonb_array_elements(extra->'programTags') WITH ORDINALITY AS a(t, ord)
      ) ELSE NULL END
  ))
`;

/** 점수가 읽는 입력만 뽑아낸다 — 원본이든 투영본이든 같은 함수를 통과시켜 비교한다. */
function scoreInputs(extra) {
  const e = extra ?? {};
  const cats = new Set((e.programs ?? []).map((p) => p.category ?? "기타"));
  // 카드가 쓰는 건 tag와 **순서**뿐이다(앞 2개만 보여준다). samples는 상세 전용이라 뺐다.
  const tags = (e.programTags ?? []).map((t) => `${t.tag}:${t.count}:${t.weekly}`);
  const tenure = e.tenure ?? [];
  const info = e.institutionInfo;
  const rooms = e.facilityRooms;
  return {
    programTagsOrdered: tags,
    programCategories: [...cats].sort(),
    tenureTotal: tenure.reduce((s, t) => s + Number(t.total ?? 0), 0),
    tenureOver2y: tenure.reduce((s, t) => s + Number(t.over2y ?? 0), 0),
    institution: info
      ? {
          homepage: info.homepage ?? null,
          operatingHours: info.operatingHours ?? null,
          transport: info.transport ?? null,
          parkingInfo: info.parkingInfo ?? null,
          liabilityInsurance: info.liabilityInsurance ?? null,
        }
      : null,
    bedrooms: rooms?.bedrooms ?? null,
    rehabRoom: rooms?.medical?.rehabRoom ?? null,
    // 카드가 쓰는 값
    firstPhoto: Array.isArray(e.photos) ? (e.photos[0] ?? null) : null,
    firstCaption: Array.isArray(e.photoItems) ? (e.photoItems[0]?.caption ?? null) : null,
    // 손대지 않은 키들은 통째로 같아야 한다
    untouched: Object.fromEntries(
      Object.entries(e)
        .filter(
          ([k]) =>
            ![
              "programs",
              "programTags",
              "tenure",
              "institutionInfo",
              "facilityRooms",
              "photos",
              "photoItems",
            ].includes(k)
        )
        .sort(([a], [b]) => a.localeCompare(b))
    ),
  };
}

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
await client.connect();

const BATCH = 500;
let offset = 0;
let checked = 0;
const mismatches = [];

for (;;) {
  const take = LIMIT ? Math.min(BATCH, LIMIT - checked) : BATCH;
  if (take <= 0) break;
  const { rows } = await client.query(
    `SELECT id, name, extra AS original, ${CARD_EXTRA} AS projected
     FROM "Facility"
     ORDER BY id ASC
     LIMIT $1 OFFSET $2`,
    [take, offset]
  );
  if (rows.length === 0) break;

  for (const r of rows) {
    checked++;
    const a = JSON.stringify(scoreInputs(r.original));
    const b = JSON.stringify(scoreInputs(r.projected));
    if (a !== b && mismatches.length < 10) mismatches.push({ id: r.id, name: r.name, a, b });
    else if (a !== b) mismatches.push({ id: r.id, name: r.name });
  }
  offset += rows.length;
  if (checked % 5000 === 0) console.log(`  ${checked}곳 대조...`);
  if (rows.length < take) break;
}

await client.end();

console.log(`\n대조 완료: ${checked}곳`);
if (mismatches.length === 0) {
  console.log("✅ 점수 입력값 전부 일치 — 투영본으로 계산해도 안심지수가 달라지지 않는다.");
  process.exit(0);
}
console.log(`❌ 불일치 ${mismatches.length}곳`);
for (const m of mismatches.slice(0, 5)) {
  console.log(`  ${m.id} ${m.name}`);
  if (m.a) {
    console.log("    원본  :", m.a.slice(0, 400));
    console.log("    투영본:", m.b.slice(0, 400));
  }
}
process.exit(1);
