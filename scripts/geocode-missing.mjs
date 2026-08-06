// 좌표가 비어 있는 시설의 lat/lng를 카카오 로컬 API로 채운다.
//
// 왜 필요한가: 좌표가 없으면 그 시설은 **지도 모드에도, "내 주변"에도, 거리순 정렬에도
// 존재하지 않는다.** 2026-08-06 실측 1,163곳(4%)이 그랬고, 주야간보호는 전체의 10%였다.
//
// 왜 예전 스크립트로 안 되나(scripts/geocode-nhis.mjs):
//   그건 옛 JSON 파일(lib/realNhisData.json)을 대상으로 하고, 상세주소를 지우는 규칙이
//   `123층`·`1~3층` 형태만 다룬다. 실패한 주소들의 실제 모양은 훨씬 지저분했다 —
//   `5,6층501호` · `601,702호` · `3· 4층` · `201-1호` · `577번지 1호`.
//   그래서 "층·호를 지운다"가 아니라 **"건물번호까지만 남긴다"**로 뒤집었다.
//   표본 15곳 시험에서 3/15 → 14/15가 됐다(나머지 1곳은 주소가 "(돌산읍)"뿐인 원본 결손).
//
// 안전장치 — 잘못된 좌표는 없는 것보다 나쁘다(지도에 엉뚱한 곳이 찍힌다):
//   ① 대한민국 위경도 범위를 벗어나면 버린다
//   ② 카카오가 돌려준 시·도가 주소의 시·도와 다르면 버린다
//   ③ 이미 좌표가 있는 행은 절대 건드리지 않는다(WHERE lat IS NULL)
//
// 사용법:
//   node --env-file=.env.local scripts/geocode-missing.mjs            # 미리보기
//   node --env-file=.env.local scripts/geocode-missing.mjs --write    # 실제 반영
//   ... --limit 50    # 일부만

import pg from "pg";

const WRITE = process.argv.includes("--write");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : 0;

const KEY = process.env.KAKAO_REST_API_KEY;
if (!KEY) {
  console.error("KAKAO_REST_API_KEY가 필요합니다 (.env.local).");
  process.exit(1);
}

// 대한민국 본토+제주 범위. 이 밖은 지오코딩이 엉뚱한 곳을 잡은 것으로 본다.
const KR_BOUNDS = { minLat: 33.0, maxLat: 38.7, minLng: 124.5, maxLng: 132.0 };

/** 시·도 표기 흔들림 흡수 — 카카오와 공단 표기가 다르다("전남광주통합특별시" 등) */
function sidoKey(s) {
  return String(s ?? "")
    .replace(/특별자치도|특별자치시|광역시|특별시|자치도|통합특별시|자치시|도$/g, "")
    .replace(/\s/g, "")
    .slice(0, 2);
}

/**
 * 좌표를 정하는 부분은 "도로명(또는 리·동) + 건물번호"까지다.
 * 그 뒤(층·호·건물명)는 상세주소라 지오코딩을 방해하기만 한다.
 */
function trimToBuildingNo(addr) {
  const s = addr
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const toks = s.split(" ");
  for (let i = toks.length - 1; i >= 0; i--) {
    if (/(로|길|대로)$/.test(toks[i]) || /(리|동|가)$/.test(toks[i])) {
      const num = toks[i + 1];
      const m = num && num.match(/^\d+(-\d+)?/);
      return m ? toks.slice(0, i + 1).join(" ") + " " + m[0] : toks.slice(0, i + 1).join(" ");
    }
  }
  return s;
}

async function geocode(query) {
  const res = await fetch(
    "https://dapi.kakao.com/v2/local/search/address.json?query=" + encodeURIComponent(query),
    { headers: { Authorization: "KakaoAK " + KEY } }
  );
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const json = await res.json();
  const doc = json.documents?.[0];
  if (!doc) return null;
  return {
    lat: Number(doc.y),
    lng: Number(doc.x),
    sido: doc.address?.region_1depth_name ?? doc.road_address?.region_1depth_name ?? "",
  };
}

/** 원본 → 공백정리 → 건물번호까지, 순서대로 시도한다(덜 자른 쪽이 더 정확하다). */
function candidatesOf(address) {
  const compact = address.replace(/\s+/g, " ").trim();
  const trimmed = trimToBuildingNo(address);
  return [...new Set([address.trim(), compact, trimmed])].filter(Boolean);
}

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
await client.connect();

const { rows } = await client.query(
  `SELECT id, name, address, "facilityType"
   FROM "Facility"
   WHERE "dataSource" <> 'mock' AND (lat IS NULL OR lng IS NULL)
   ORDER BY id ASC
   ${LIMIT ? `LIMIT ${LIMIT}` : ""}`
);
console.log(`좌표 없는 시설: ${rows.length}곳${WRITE ? "" : "  (미리보기 — 반영하려면 --write)"}`);

const stat = { ok: 0, rejectedBounds: 0, rejectedSido: 0, notFound: 0, apiError: 0 };
const unresolved = [];
let done = 0;

for (const f of rows) {
  let hit = null;
  for (const q of candidatesOf(f.address)) {
    const r = await geocode(q);
    await new Promise((s) => setTimeout(s, 110)); // 카카오 초당 제한 여유
    if (r?.error) {
      stat.apiError++;
      break;
    }
    if (!r) continue;

    if (
      r.lat < KR_BOUNDS.minLat ||
      r.lat > KR_BOUNDS.maxLat ||
      r.lng < KR_BOUNDS.minLng ||
      r.lng > KR_BOUNDS.maxLng
    ) {
      stat.rejectedBounds++;
      continue;
    }
    if (sidoKey(r.sido) && sidoKey(f.address) && sidoKey(r.sido) !== sidoKey(f.address)) {
      stat.rejectedSido++;
      continue;
    }
    hit = r;
    break;
  }

  if (hit) {
    stat.ok++;
    if (WRITE) {
      // 이미 좌표가 생긴 행은 건드리지 않는다(동시 실행·재실행 안전)
      await client.query(
        `UPDATE "Facility" SET lat = $1, lng = $2, "updatedAt" = now()
         WHERE id = $3 AND (lat IS NULL OR lng IS NULL)`,
        [hit.lat, hit.lng, f.id]
      );
    }
  } else {
    stat.notFound++;
    unresolved.push({ id: f.id, name: f.name, address: f.address });
  }

  if (++done % 100 === 0) console.log(`  ${done}/${rows.length} 처리 — 성공 ${stat.ok}곳`);
}

await client.end();

console.log(`\n=== ${WRITE ? "반영 완료" : "미리보기 완료"} ===`);
console.log(`좌표 확보: ${stat.ok}곳 / 실패: ${stat.notFound}곳`);
console.log(
  `버린 결과: 범위 밖 ${stat.rejectedBounds} · 시도 불일치 ${stat.rejectedSido} · API 오류 ${stat.apiError}`
);
if (unresolved.length > 0) {
  console.log(`\n못 찾은 주소 ${unresolved.length}곳 (앞 15개) — 원본 결손일 가능성이 높다:`);
  unresolved.slice(0, 15).forEach((u) => console.log(`  ${u.name} | ${u.address}`));
}
if (!WRITE) console.log("\n실제 반영하려면 --write 를 붙여 다시 실행하세요.");
