// lib/realNhisData.json 시설명으로 카카오 "키워드 장소검색" API를 조회해
// 실제 등록된 전화번호를 찾아 채운다. 이름만으로 매칭하면 오매칭 위험이 있어서
// 좌표(geocode-nhis.mjs로 미리 채워둔 값)와 300m 이내로 가까운 결과만 채택한다.
// 매칭 실패(카카오맵 미등록 등)는 phone을 비워두고 절대 지어내지 않는다.
// 사용법: node scripts/find-phone-nhis.mjs (geocode-nhis.mjs 먼저 실행 필요)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envText = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const KAKAO_KEY = env.KAKAO_REST_API_KEY;
const DATA_PATH = path.join(__dirname, "..", "lib", "realNhisData.json");
const facilities = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function searchPlace(query) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  const json = await res.json();
  return json.documents || [];
}

const MATCH_RADIUS_M = 300;
let found = 0,
  notFound = 0,
  skippedNoCoord = 0;

for (let i = 0; i < facilities.length; i++) {
  const f = facilities[i];
  if (f.lat === undefined || f.lng === undefined) {
    skippedNoCoord++;
    continue;
  }

  const candidates = await searchPlace(f.name);
  const nearby = candidates.filter(
    (c) => haversineM(f.lat, f.lng, Number(c.y), Number(c.x)) <= MATCH_RADIUS_M
  );
  // 이름이 일치하면서 가장 가까운 것 우선, 없으면 그냥 가장 가까운 후보
  const best =
    nearby.find((c) => c.phone && c.place_name.replace(/\s/g, "") === f.name.replace(/\s/g, "")) ||
    nearby.find((c) => c.phone);

  if (best) {
    f.phone = best.phone;
    found++;
  } else {
    notFound++;
  }

  if (i % 100 === 0)
    console.log(`${i}/${facilities.length} (전화번호 발견 ${found}, 미발견 ${notFound})`);
  await sleep(70);
}

console.log(
  `완료: 발견 ${found}건, 미발견(카카오맵 미등록 등) ${notFound}건, 좌표없어 스킵 ${skippedNoCoord}건`
);
fs.writeFileSync(DATA_PATH, JSON.stringify(facilities, null, 2), "utf8");
console.log(`저장: ${DATA_PATH}`);
