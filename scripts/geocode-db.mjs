// DB에 있는 시설 중 좌표(lat/lng)가 없는 곳을 카카오 로컬 API로 지오코딩해서 채운다.
// scripts/geocode-nhis.mjs(예전 JSON 파일 버전)와 같은 방식이지만, 이번엔 데이터가
// Supabase DB에 있으므로 Prisma로 직접 읽고 쓴다. 주소는 이미 실제 공공데이터이므로
// 좌표만 API로 보강하는 것 — 임의 좌표를 넣지 않는다.
// 사용법: node scripts/geocode-db.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envText = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      const key = l.slice(0, i).trim();
      const value = l.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
      return [key, value];
    })
);
const KAKAO_KEY = env.KAKAO_REST_API_KEY;

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(address, retries = 3) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
    address
  )}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
    if (res.status === 429) {
      await sleep(500 * (attempt + 1));
      continue;
    }
    const json = await res.json();
    const doc = json.documents?.[0];
    return doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null;
  }
  return null;
}

// 상세주소(건물 동/호/층 등)로 실패하면 지번/도로명 앞부분만 잘라서 재시도
function fallbackAddress(addr) {
  return addr.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+\d+층.*$/, "").trim();
}

async function main() {
  const workerCount = Number(process.env.WORKER_COUNT || 1);
  const workerId = Number(process.env.WORKER_ID || 0);

  const all = await prisma.facility.findMany({
    where: { lat: null },
    select: { id: true, address: true },
  });
  // 여러 워커를 동시에 돌릴 때 서로 겹치지 않게 인덱스 나머지로 나눠 맡는다
  const targets = all.filter((_, i) => i % workerCount === workerId);

  console.log(`[worker ${workerId}/${workerCount}] 대상: ${targets.length}건 (전체 남은 건: ${all.length})`);

  let ok = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (let i = 0; i < targets.length; i++) {
    const f = targets[i];
    let coord = null;
    try {
      coord = await geocode(f.address);
      if (!coord) coord = await geocode(fallbackAddress(f.address));
    } catch (err) {
      console.error(`에러 (id=${f.id}):`, err.message);
    }

    if (coord) {
      await prisma.facility.update({
        where: { id: f.id },
        data: { lat: coord.lat, lng: coord.lng },
      });
      ok++;
    } else {
      failed++;
    }

    if (i % 200 === 0) {
      const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
      console.log(`[worker ${workerId}] ${i}/${targets.length} (성공 ${ok}, 실패 ${failed}, 경과 ${elapsedMin}분)`);
    }
    await sleep(60);
  }

  console.log(`[worker ${workerId}] 완료: 성공 ${ok}건, 실패(카카오맵 미등록 등) ${failed}건`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("치명적 에러:", err);
  process.exit(1);
});
