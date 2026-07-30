// lib/realNhisData.json(서울 요양원 등 2,221건)의 실제 주소를 카카오 로컬 API로
// 지오코딩해서 좌표(lat/lng)를 채워넣는다. 주소는 이미 실제 공공데이터이므로
// 좌표만 별도 API로 보강하는 것 — 임의 좌표를 넣는 게 아님.
// 사용법: node scripts/geocode-nhis.mjs

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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(address) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
    address
  )}`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  const json = await res.json();
  const doc = json.documents?.[0];
  return doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null;
}

// 상세주소(건물 동/호/층 등)로 실패하면 지번/도로명 앞부분만 잘라서 재시도
function fallbackAddress(addr) {
  return addr.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+\d+층.*$/, "").trim();
}

let ok = 0,
  failed = 0;
for (let i = 0; i < facilities.length; i++) {
  const f = facilities[i];
  let coord = await geocode(f.address);
  if (!coord) {
    coord = await geocode(fallbackAddress(f.address));
  }
  if (coord) {
    f.lat = coord.lat;
    f.lng = coord.lng;
    ok++;
  } else {
    failed++;
  }
  if (i % 100 === 0) console.log(`${i}/${facilities.length} (성공 ${ok}, 실패 ${failed})`);
  await sleep(60);
}

console.log(`완료: 성공 ${ok}건, 실패 ${failed}건`);
fs.writeFileSync(DATA_PATH, JSON.stringify(facilities, null, 2), "utf8");
console.log(`저장: ${DATA_PATH}`);
