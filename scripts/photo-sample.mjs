// 샘플 테스트 — zip에서 시설 N곳만 꺼내 실제로 리사이징해보고 용량을 잰다.
// zip 전체를 풀지 않고 필요한 엔트리만 스트리밍으로 읽는다(디스크에 36GB를 풀 필요 없음).
//
// 사용법: node scripts/photo-sample.mjs <zip경로> [시설수] [출력폴더]

import fs from "fs";
import path from "path";
import yauzl from "yauzl";
import sharp from "sharp";
import { groupByFacility, selectPhotos } from "./photo-classify.mjs";

const ZIP = process.argv[2];
const LIMIT = Number(process.argv[3] ?? 50);
const OUT = process.argv[4] ?? path.join(process.cwd(), "tmp-photo-sample");

if (!ZIP) {
  console.error("사용법: node scripts/photo-sample.mjs <zip경로> [시설수] [출력폴더]");
  process.exit(1);
}

// 출력 규격 — 모바일에서 가볍게 뜨는 게 최우선(사용자 요구사항).
// 카드/대표: 화면에 가로 100%로 깔려도 레티나에서 충분한 800px
// 갤러리(팝업): 확대해서 볼 수 있게 1400px
const SPECS = {
  thumb: { width: 800, quality: 70 },
  full: { width: 1400, quality: 76 },
};

function openZip(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true, autoClose: false }, (err, zip) =>
      err ? reject(err) : resolve(zip)
    );
  });
}

function readEntry(zip, entry) {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (err, stream) => {
      if (err) return reject(err);
      const chunks = [];
      stream.on("data", (c) => chunks.push(c));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  });
}

// 1단계: 엔트리 목록만 훑어 시설별로 묶는다(내용은 안 읽는다)
console.log("zip 목록 읽는 중...");
const zip = await openZip(ZIP);
const entryByPath = new Map();
await new Promise((resolve, reject) => {
  zip.on("entry", (e) => {
    if (!e.fileName.endsWith("/")) entryByPath.set(e.fileName, e);
    zip.readEntry();
  });
  zip.on("end", resolve);
  zip.on("error", reject);
  zip.readEntry();
});
console.log(`엔트리 ${entryByPath.size}개`);

const facilities = groupByFacility([...entryByPath.keys()]);
const picked = [...facilities.values()].slice(0, LIMIT);
console.log(`시설 ${facilities.size}곳 중 ${picked.length}곳 샘플 처리\n`);

fs.mkdirSync(OUT, { recursive: true });

let originalBytes = 0;
let thumbBytes = 0;
let fullBytes = 0;
let count = 0;
let failed = 0;
const perFacility = [];

for (const f of picked) {
  const sel = selectPhotos(f.photos);
  const chosen = [
    ...(sel.hero ? [{ ...sel.hero, role: "hero" }] : []),
    ...sel.gallery.map((p) => ({ ...p, role: "gallery" })),
    ...sel.programs.map((p) => ({ ...p, role: "program" })),
  ];

  let fBytesIn = 0;
  let fBytesOut = 0;

  for (const p of chosen) {
    const entry = entryByPath.get(p.path);
    if (!entry) continue;
    try {
      const buf = await readEntry(zip, entry);
      originalBytes += buf.length;
      fBytesIn += buf.length;

      const base = `${f.instCode}_${p.role}_${p.area}_${count}`;
      const thumb = await sharp(buf)
        .rotate()
        .resize({ width: SPECS.thumb.width, withoutEnlargement: true })
        .webp({ quality: SPECS.thumb.quality })
        .toBuffer();
      const full = await sharp(buf)
        .rotate()
        .resize({ width: SPECS.full.width, withoutEnlargement: true })
        .webp({ quality: SPECS.full.quality })
        .toBuffer();

      thumbBytes += thumb.length;
      fullBytes += full.length;
      fBytesOut += thumb.length + full.length;

      // 대표사진만 눈으로 확인할 수 있게 저장(용량 측정은 전부)
      if (p.role === "hero") {
        fs.writeFileSync(path.join(OUT, `${base}_thumb.webp`), thumb);
        fs.writeFileSync(path.join(OUT, `${base}_full.webp`), full);
      }
      count++;
    } catch (e) {
      failed++;
      console.warn(`  실패: ${p.path.split("/").pop()} — ${e.message}`);
    }
  }

  perFacility.push({
    name: f.name,
    instCode: f.instCode,
    total: sel.total,
    selected: chosen.length,
    heroArea: sel.hero?.area ?? "-",
    heroCaption: sel.hero?.caption ?? "-",
    inMB: fBytesIn / 1024 / 1024,
    outKB: fBytesOut / 1024,
  });
}

zip.close();

const mb = (b) => (b / 1024 / 1024).toFixed(1);
const kb = (b) => (b / 1024).toFixed(0);

console.log("\n=== 결과 ===");
console.log(`처리한 사진: ${count}장 (실패 ${failed})`);
console.log(`원본 합계:   ${mb(originalBytes)} MB  (장당 평균 ${kb(originalBytes / count)} KB)`);
console.log(`썸네일 합계: ${mb(thumbBytes)} MB  (장당 평균 ${kb(thumbBytes / count)} KB)`);
console.log(`갤러리 합계: ${mb(fullBytes)} MB  (장당 평균 ${kb(fullBytes / count)} KB)`);
console.log(`저장 총합:   ${mb(thumbBytes + fullBytes)} MB`);
console.log(`압축률:      원본 대비 ${((1 - (thumbBytes + fullBytes) / originalBytes) * 100).toFixed(1)}% 감소`);

const perFacilityKB = (thumbBytes + fullBytes) / picked.length / 1024;
console.log(`\n시설당 평균 저장량: ${perFacilityKB.toFixed(0)} KB`);
console.log(`→ 전국 28,844곳 환산: ${((perFacilityKB * 28844) / 1024 / 1024).toFixed(1)} GB`);
console.log(`\n첫 화면(대표사진 1장)만 받을 때: 약 ${kb(thumbBytes / count)} KB`);

console.log("\n=== 시설별 (앞 15곳) ===");
for (const r of perFacility.slice(0, 15)) {
  console.log(
    `${r.name.slice(0, 18).padEnd(20)} ${String(r.total).padStart(3)}장→${String(r.selected).padStart(2)}장  ` +
      `${r.inMB.toFixed(1)}MB→${r.outKB.toFixed(0)}KB  대표:${r.heroArea}/${r.heroCaption.slice(0, 16)}`
  );
}
console.log(`\n대표사진 미리보기 저장됨: ${OUT}`);
