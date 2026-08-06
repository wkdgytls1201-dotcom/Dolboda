// 공단 시설사진 zip → 시설별 대표사진/갤러리를 뽑아 리사이징하고 R2에 올려 DB에 반영한다.
//
// 두 단계로 나눈 이유: zip이 지역당 30GB가 넘는데, R2 키가 아직 없어도 변환까지는
// 지금 미리 해둘 수 있다. convert는 로컬에 결과만 쌓고(디스크·네트워크 안전),
// upload는 그걸 나중에 R2·DB로 밀어넣는다 — 둘 다 중단해도 다시 돌리면 이어서 한다.
//
// 사용법:
//   node scripts/photo-import.mjs convert <zip경로> <출력폴더> [--limit N]
//   node scripts/photo-import.mjs upload  <출력폴더>            [--write] [--limit N] [--cleanup]
//
// convert는 안전(로컬에만 씀, DB·외부 요청 없음). upload는 --write 없이는 미리보기만 한다.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import yauzl from "yauzl";
import sharp from "sharp";
import { classifyArea, groupByFacility, selectPhotos } from "./photo-classify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 실측(샘플 60곳) 기준 800px/1400px 두 벌은 컸다 — 한 장(1000px)으로 합쳐서
// 변환·업로드 절반으로 줄인다. 카드에도 팝업 확대에도 이 한 장으로 충분한 화질.
//
// 프로그램(행사·활동) 사진은 화질을 한 단계 더 낮춘다 — 대표사진이 아니라
// "이런 활동을 한다"는 증빙 정도라 디테일이 덜 중요하고, 선별 사진의 38%를
// 차지해 여기서 아끼는 게 전체 용량에 가장 크게 영향을 준다.
const SPEC = { width: 1000, quality: 72 };
const SPEC_PROGRAM = { width: 720, quality: 52 };
// 선별에서 빠진 사진(시설당 12장 초과분) — 지금은 화면에 안 쓰지만, 원본 zip을 지운 뒤에도
// "나중에 장수를 늘리거나 분류를 바꿀" 여지를 남기려고 R2에 함께 보관한다.
// 당장 쓰지 않으므로 프로그램 사진과 같은 낮은 규격으로 저장한다.
const SPEC_EXTRA = { width: 720, quality: 52 };

function loadEnv() {
  const env = {};
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && !line.startsWith("#")) {
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
    }
  }
  for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v;
  return env;
}

/** zip 최상위 폴더명("47_경상북도")에서 시도를 뽑는다 — DB 주소의 첫 토큰과 같은 표기다. */
function sidoOf(facility) {
  const top = facility.photos?.[0]?.path?.split("/")[0] ?? "";
  return top.replace(/^\d+_/, "");
}

/**
 * zip 시설 → 우리 DB facilityId 매칭.
 *
 * 1차는 기관기호(`extra.instCode`) 정확 일치다. 그런데 공단 사진 zip의 기관기호가
 * 우리가 가진 값과 어긋나는 시설이 실제로 있다 — 5개 지역 실측(2026-08-06)에서
 * **361곳**이 "사진은 있는데 코드가 안 맞아" 버려지고 있었다. 매칭에서 빠지면
 * convert 자체를 안 하므로, 원본 zip을 지우는 순간 그 사진은 영영 사라진다
 * (서울·경기·경북·강원 254곳이 실제로 그렇게 유실됐다).
 *
 * 그래서 2차로 **이름 + 시도**를 본다. 다만 이름 매칭은 틀리면 남의 시설에 남의 사진을
 * 붙이는 사고라, 세 조건을 **모두** 만족할 때만 인정한다:
 *   ① 같은 시도에 같은 이름이 **정확히 1곳** (2곳 이상이면 포기 — 어느 쪽인지 알 수 없다)
 *   ② 그 시설에 아직 사진이 없다 (있으면 덮어쓸 위험)
 *   ③ 이미 다른 zip 시설이 그 id를 가져가지 않았다
 * 전남광주·대전 실측: 미매칭 287곳 중 68곳 인정, 위험한 39곳(동명 2곳 이상)은 제외.
 */
async function matchFacilities(client, facilities) {
  const codes = [...facilities.keys()];
  const { rows } = await client.query(
    `SELECT id, extra->>'instCode' AS "instCode" FROM "Facility" WHERE extra->>'instCode' = ANY($1)`,
    [codes]
  );
  const idByCode = new Map(rows.map((r) => [r.instCode, r.id]));
  const exact = idByCode.size;

  const unmatched = [...facilities.values()].filter((f) => !idByCode.has(f.instCode));
  const taken = new Set(idByCode.values());
  let byName = 0;

  if (unmatched.length > 0) {
    // 이름+시도로 후보를 한 번에 받아 자바스크립트에서 유일성을 판정한다
    const names = [...new Set(unmatched.map((f) => f.name))];
    const sidos = [...new Set(unmatched.map(sidoOf).filter(Boolean))];
    const { rows: cand } = await client.query(
      `SELECT id, name, split_part(address,' ',1) AS sido,
              jsonb_array_length(COALESCE(extra->'photos','[]'::jsonb)) AS photos
         FROM "Facility"
        WHERE "dataSource" <> 'mock' AND name = ANY($1) AND split_part(address,' ',1) = ANY($2)`,
      [names, sidos]
    );
    const byKey = new Map();
    for (const r of cand) {
      const k = `${r.sido} ${r.name}`;
      (byKey.get(k) ?? byKey.set(k, []).get(k)).push(r);
    }
    for (const f of unmatched) {
      const hits = byKey.get(`${sidoOf(f)} ${f.name}`) ?? [];
      if (hits.length !== 1) continue; // ① 유일해야 한다
      const hit = hits[0];
      if (hit.photos > 0) continue; // ② 이미 사진이 있으면 건드리지 않는다
      if (taken.has(hit.id)) continue; // ③ 중복 배정 금지
      idByCode.set(f.instCode, hit.id);
      taken.add(hit.id);
      byName++;
    }
  }

  console.log(
    `DB 매칭: ${idByCode.size} / ${codes.length}  (기관기호 ${exact}곳 + 이름·시도 ${byName}곳)`
  );
  return idByCode;
}

function openZip(file) {
  return new Promise((res, rej) =>
    yauzl.open(file, { lazyEntries: true, autoClose: false }, (e, z) => (e ? rej(e) : res(z)))
  );
}
function readEntry(zip, entry) {
  return new Promise((res, rej) => {
    zip.openReadStream(entry, (err, s) => {
      if (err) return rej(err);
      const c = [];
      s.on("data", (d) => c.push(d));
      s.on("end", () => res(Buffer.concat(c)));
      s.on("error", rej);
    });
  });
}

async function toWebp(buf, spec) {
  return sharp(buf)
    .rotate()
    .resize({ width: spec.width, withoutEnlargement: true })
    .webp({ quality: spec.quality })
    .toBuffer();
}

/** 후보 목록을 앞에서부터 시도해 처음 성공하는 변환 결과를 돌려준다(BMP 등 실패는 건너뜀).
 *  path를 그대로 들고 있어야 호출부가 "이미 쓴 파일"을 정확히 걸러낼 수 있다
 *  (캡션이 같은 사진이 여러 장 있는 시설이 있어 area+caption으로는 못 걸러낸다). */
async function convertFirstWorking(candidates, entryByPath, zip, max, spec = SPEC) {
  const out = [];
  for (const cand of candidates) {
    if (out.length >= max) break;
    const entry = entryByPath.get(cand.path);
    if (!entry) continue;
    try {
      const raw = await readEntry(zip, entry);
      const webp = await toWebp(raw, spec);
      out.push({ path: cand.path, area: cand.area, caption: cand.caption, buf: webp });
    } catch {
      // 이 파일만 건너뛰고 다음 후보로 — BMP 등 sharp가 못 읽는 형식
    }
  }
  return out;
}

// ---------------------------------------------------------------- inventory

// zip 안에 "무엇이 들어 있었는지"를 이미지 없이 텍스트로만 남긴다.
//
// 왜 필요한가: convert는 시설당 12장만 뽑고 나머지 40%대는 변환조차 안 한다.
// 원본 zip을 지우면 그 사진들의 존재 자체를 알 방법이 없어져서, 나중에
// "사진을 20장으로 늘리자"거나 "분류 규칙을 바꾸면 뭐가 달라지나"를 검토할 수 없다.
// 목록만 남겨두면(용량은 zip당 수 MB) 원본이 손에 없어도 판단은 할 수 있고,
// 원본을 다시 구했을 때 정확히 무엇을 더 가져와야 하는지 지정할 수 있다.
//
// zip의 중앙 디렉터리만 읽으므로 36GB짜리도 수십 초면 끝난다(이미지 디코딩 없음).
async function writeInventory(entryByPath, facilities, idByCode, outDir) {
  const invPath = path.join(outDir, "inventory.jsonl");
  const stream = fs.createWriteStream(invPath);
  let totalPhotos = 0;

  for (const f of facilities.values()) {
    const photos = f.photos.map((p) => {
      const entry = entryByPath.get(p.path);
      return {
        path: p.path,
        category: p.category,
        caption: p.caption,
        area: classifyArea(p), // 지금 규칙 기준 — 나중에 규칙이 바뀌면 이 값만 다시 계산하면 된다
        ext: p.ext,
        bytes: entry?.uncompressedSize ?? null,
      };
    });
    totalPhotos += photos.length;
    stream.write(
      JSON.stringify({
        instCode: f.instCode,
        name: f.name,
        facilityId: idByCode.get(f.instCode) ?? null, // null이면 우리 DB에 없는 시설
        photoCount: photos.length,
        photos,
      }) + "\n"
    );
  }

  await new Promise((res) => stream.end(res));
  const mb = (fs.statSync(invPath).size / 1024 / 1024).toFixed(1);
  console.log(`전체 목록 기록: ${facilities.size}곳 / 사진 ${totalPhotos}장 → ${invPath} (${mb}MB)`);
}

async function cmdInventory(zipPath, outDir) {
  loadEnv();
  const { Client } = pg;
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();

  fs.mkdirSync(outDir, { recursive: true });
  console.log(`zip 목록 읽는 중: ${zipPath}`);
  const zip = await openZip(zipPath);
  const entryByPath = new Map();
  await new Promise((res, rej) => {
    zip.on("entry", (e) => {
      if (!e.fileName.endsWith("/")) entryByPath.set(e.fileName, e);
      zip.readEntry();
    });
    zip.on("end", res);
    zip.on("error", rej);
    zip.readEntry();
  });

  const facilities = groupByFacility([...entryByPath.keys()]);
  const idByCode = await matchFacilities(client, facilities);
  await client.end();

  await writeInventory(entryByPath, facilities, idByCode, outDir);
  zip.close();
}

// ---------------------------------------------------------------- convert

async function cmdConvert(zipPath, outDir, limit) {
  loadEnv();
  const { Client } = pg;
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();

  fs.mkdirSync(outDir, { recursive: true });
  const manifestPath = path.join(outDir, "manifest.jsonl");
  const progressPath = path.join(outDir, "convert-progress.json");
  const done = fs.existsSync(progressPath) ? new Set(JSON.parse(fs.readFileSync(progressPath, "utf8"))) : new Set();

  // ⚠️ progress에는 **매칭 실패로 건너뛴 시설도 "처리됨"으로 들어간다.** 그래서 매칭 규칙을
  //    고친 뒤 다시 돌리면 새로 매칭된 시설이 그대로 건너뛰어진다(2026-08-06에 실제로 겪었다 —
  //    "처리 0곳"이 나온다). 매칭을 바꾼 뒤 재실행할 때는 **manifest에 없는데 inventory에는
  //    facilityId가 있는 instCode**를 progress에서 빼고 돌릴 것(convert·extras 양쪽 모두).
  //    manifest.jsonl이 "실제로 변환된 것"의 진실이고, progress는 "시도한 것"일 뿐이다.
  const converted = fs.existsSync(manifestPath)
    ? new Set(
        fs
          .readFileSync(manifestPath, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l).instCode)
      )
    : new Set();
  const skippedButMatched = [...done].filter((c) => !converted.has(c)).length;
  if (skippedButMatched > 0) {
    console.log(
      `참고: progress에 있으나 manifest에 없는 시설 ${skippedButMatched}곳 — 매칭 실패로 건너뛴 분입니다.\n` +
        `      매칭 규칙을 고쳤다면 그중 새로 매칭된 것을 progress에서 빼야 다시 변환됩니다.`
    );
  }

  console.log(`zip 여는 중: ${zipPath}`);
  const zip = await openZip(zipPath);
  const entryByPath = new Map();
  await new Promise((res, rej) => {
    zip.on("entry", (e) => {
      if (!e.fileName.endsWith("/")) entryByPath.set(e.fileName, e);
      zip.readEntry();
    });
    zip.on("end", res);
    zip.on("error", rej);
    zip.readEntry();
  });

  const facilities = groupByFacility([...entryByPath.keys()]);
  console.log(`zip 내 시설: ${facilities.size}곳 / 이미 처리됨: ${done.size}곳`);

  // instCode → facilityId 일괄 조회 (기관기호 → 이름·시도 2차, matchFacilities 주석 참조)
  const idByCode = await matchFacilities(client, facilities);
  await client.end();

  // 원본 zip을 지우기 전에 "무엇이 있었는지"를 먼저 남긴다 — 한 번 쓰면 다시 안 쓴다
  const inventoryPath = path.join(outDir, "inventory.jsonl");
  if (!fs.existsSync(inventoryPath)) {
    await writeInventory(entryByPath, facilities, idByCode, outDir);
  }

  const manifestStream = fs.createWriteStream(manifestPath, { flags: "a" });
  let processed = 0;
  let unmatched = 0;
  let totalPhotos = 0;
  let totalBytes = 0;
  const startedAt = Date.now();

  for (const f of facilities.values()) {
    if (limit && processed >= limit) break;
    if (done.has(f.instCode)) continue;
    const facilityId = idByCode.get(f.instCode);
    if (!facilityId) {
      unmatched++;
      done.add(f.instCode);
      continue;
    }

    const sel = selectPhotos(f.photos);
    const hero = await convertFirstWorking(sel.heroCandidates, entryByPath, zip, 1);
    const usedPaths = new Set(hero.map((h) => h.path));
    const galleryPool = [...sel.gallery, ...sel.galleryBackup].filter((c) => !usedPaths.has(c.path));
    const gallery = await convertFirstWorking(galleryPool, entryByPath, zip, 8);
    const programPool = [...sel.programs, ...sel.programBackup];
    const programs = await convertFirstWorking(programPool, entryByPath, zip, 3, SPEC_PROGRAM);

    const items = [
      ...hero.map((p) => ({ ...p, role: "hero" })),
      ...gallery.map((p) => ({ ...p, role: "gallery" })),
      ...programs.map((p) => ({ ...p, role: "program" })),
    ];

    const facilityDir = path.join(outDir, "files", facilityId);
    fs.mkdirSync(facilityDir, { recursive: true });
    const manifestItems = [];
    items.forEach((it, i) => {
      const fname = `${i}.webp`;
      fs.writeFileSync(path.join(facilityDir, fname), it.buf);
      totalBytes += it.buf.length;
      // srcPath를 남겨야 2차 패스(extras)가 "이미 변환한 것"을 정확히 뺄 수 있다.
      // 규칙만으로 다시 계산하면 BMP 폴백이 일어난 시설에서 어긋난다.
      manifestItems.push({ file: fname, role: it.role, area: it.area, caption: it.caption, srcPath: it.path });
    });
    totalPhotos += manifestItems.length;

    manifestStream.write(
      JSON.stringify({ instCode: f.instCode, facilityId, name: f.name, items: manifestItems }) + "\n"
    );

    done.add(f.instCode);
    processed++;
    if (processed % 100 === 0) {
      fs.writeFileSync(progressPath, JSON.stringify([...done]));
      const mb = (totalBytes / 1024 / 1024).toFixed(0);
      const sec = ((Date.now() - startedAt) / 1000).toFixed(0);
      console.log(`  ${processed}곳 처리, 사진 ${totalPhotos}장, ${mb}MB, ${sec}초 경과`);
    }
  }

  fs.writeFileSync(progressPath, JSON.stringify([...done]));
  manifestStream.end();
  zip.close();

  console.log(`\n=== convert 완료 ===`);
  console.log(`처리: ${processed}곳 / 매칭 안 됨: ${unmatched}곳`);
  console.log(`사진: ${totalPhotos}장, ${(totalBytes / 1024 / 1024).toFixed(1)}MB`);
  console.log(`결과 폴더: ${outDir}`);
  console.log(`다음: node scripts/photo-import.mjs upload "${outDir}" --write`);
}

// ---------------------------------------------------------------- extras

// 1차 convert가 고르지 않은 나머지 사진을 낮은 화질로 변환한다.
//
// 별도 패스로 둔 이유: convert는 시설당 12장만 뽑는데, 원본 zip을 지우기로 하면
// 나머지 40%대가 영영 사라진다. 그렇다고 convert를 고쳐 처음부터 다시 돌리면
// 이미 끝낸 변환을 통째로 버리게 된다 — 이 패스는 manifest.jsonl을 읽어
// "이미 변환한 것"을 정확히 건너뛰므로 진행 중인 작업을 낭비하지 않는다.
//
// 결과물은 files/{facilityId}/e{N}.webp 로 저장해 1차 산출물(0.webp…)과 안 겹친다.
// DB에는 넣지 않는다 — 화면에 쓰는 건 어디까지나 선별된 사진뿐이다.
async function cmdExtras(zipPath, outDir, limit) {
  const manifestPath = path.join(outDir, "manifest.jsonl");
  if (!fs.existsSync(manifestPath)) {
    console.error(`manifest.jsonl이 없습니다. convert를 먼저 끝내주세요: ${manifestPath}`);
    process.exit(1);
  }

  // 1차에서 어떤 원본 경로를 이미 썼는지 — inventory와 대조해 나머지를 찾는다
  const invPath = path.join(outDir, "inventory.jsonl");
  if (!fs.existsSync(invPath)) {
    console.error(`inventory.jsonl이 없습니다. 먼저 만들어주세요: ${invPath}`);
    process.exit(1);
  }

  // 1차 manifest에서 facilityId → 실제 변환한 원본 경로 집합
  const manifestPaths = new Map();
  for (const line of fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    const rec = JSON.parse(line);
    const paths = new Set(rec.items.map((it) => it.srcPath).filter(Boolean));
    manifestPaths.set(rec.facilityId, paths);
  }

  const extrasPath = path.join(outDir, "extras.jsonl");
  const progressPath = path.join(outDir, "extras-progress.json");
  const done = fs.existsSync(progressPath) ? new Set(JSON.parse(fs.readFileSync(progressPath, "utf8"))) : new Set();

  console.log(`zip 여는 중: ${zipPath}`);
  const zip = await openZip(zipPath);
  const entryByPath = new Map();
  await new Promise((res, rej) => {
    zip.on("entry", (e) => {
      if (!e.fileName.endsWith("/")) entryByPath.set(e.fileName, e);
      zip.readEntry();
    });
    zip.on("end", res);
    zip.on("error", rej);
    zip.readEntry();
  });

  const facilities = groupByFacility([...entryByPath.keys()]);
  const stream = fs.createWriteStream(extrasPath, { flags: "a" });
  let processed = 0;
  let totalPhotos = 0;
  let totalBytes = 0;
  const startedAt = Date.now();

  // inventory에서 facilityId를 가져온다(1차와 같은 매핑을 재사용)
  const facilityIdByCode = new Map();
  for (const line of fs.readFileSync(invPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    const rec = JSON.parse(line);
    if (rec.facilityId) facilityIdByCode.set(rec.instCode, rec.facilityId);
  }

  for (const f of facilities.values()) {
    if (limit && processed >= limit) break;
    if (done.has(f.instCode)) continue;
    const facilityId = facilityIdByCode.get(f.instCode);
    if (!facilityId) {
      done.add(f.instCode);
      continue;
    }

    // 1차에서 실제로 변환한 원본 경로를 manifest에서 그대로 읽어 제외한다.
    // srcPath가 없는 옛 manifest(이 필드 추가 전에 돌린 것)면 규칙으로 다시 계산해
    // 근사한다 — BMP 폴백이 있었던 시설에선 몇 장이 중복될 수 있으나(전체의 0.1% 미만)
    // 파일명 네임스페이스가 달라(e*.webp) 덮어쓰기나 오류는 나지 않는다.
    const fromManifest = manifestPaths.get(facilityId);
    let selectedPaths;
    if (fromManifest && fromManifest.size > 0) {
      selectedPaths = fromManifest;
    } else {
      const sel = selectPhotos(f.photos);
      selectedPaths = new Set([
        ...(sel.hero ? [sel.hero.path] : []),
        ...sel.gallery.map((p) => p.path),
        ...sel.programs.map((p) => p.path),
      ]);
    }
    const leftovers = f.photos.filter((p) => !selectedPaths.has(p.path));
    if (leftovers.length === 0) {
      done.add(f.instCode);
      continue;
    }

    const facilityDir = path.join(outDir, "files", facilityId);
    fs.mkdirSync(facilityDir, { recursive: true });
    const items = [];
    let i = 0;
    for (const cand of leftovers) {
      const entry = entryByPath.get(cand.path);
      if (!entry) continue;
      try {
        const raw = await readEntry(zip, entry);
        const webp = await toWebp(raw, SPEC_EXTRA);
        const fname = `e${i}.webp`;
        fs.writeFileSync(path.join(facilityDir, fname), webp);
        items.push({ file: fname, area: classifyArea(cand), caption: cand.caption });
        totalBytes += webp.length;
        i++;
      } catch {
        // BMP 등 못 읽는 형식은 건너뛴다
      }
    }
    totalPhotos += items.length;
    if (items.length > 0) {
      stream.write(JSON.stringify({ instCode: f.instCode, facilityId, name: f.name, items }) + "\n");
    }

    done.add(f.instCode);
    processed++;
    if (processed % 100 === 0) {
      fs.writeFileSync(progressPath, JSON.stringify([...done]));
      console.log(
        `  ${processed}곳, 여분 ${totalPhotos}장, ${(totalBytes / 1024 / 1024).toFixed(0)}MB, ${((Date.now() - startedAt) / 1000).toFixed(0)}초`
      );
    }
  }

  fs.writeFileSync(progressPath, JSON.stringify([...done]));
  await new Promise((res) => stream.end(res));
  zip.close();

  console.log(`\n=== extras 완료 ===`);
  console.log(`시설 ${processed}곳 / 여분 사진 ${totalPhotos}장, ${(totalBytes / 1024 / 1024).toFixed(1)}MB`);
}

// ---------------------------------------------------------------- upload

async function cmdUpload(outDir, write, limit, cleanup) {
  loadEnv();
  const { isR2Configured, uploadToR2 } = await import("../lib/r2Storage.ts");
  if (!isR2Configured()) {
    console.error("R2 환경변수가 없습니다 (.env.local에 R2_ACCOUNT_ID 등). 업로드를 시작할 수 없어요.");
    process.exit(1);
  }

  const { Client } = pg;
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();

  const manifestPath = path.join(outDir, "manifest.jsonl");
  const progressPath = path.join(outDir, "upload-progress.json");
  const done = fs.existsSync(progressPath) ? new Set(JSON.parse(fs.readFileSync(progressPath, "utf8"))) : new Set();

  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).filter(Boolean);
  console.log(`manifest: ${lines.length}곳 / 이미 업로드됨: ${done.size}곳`);

  // 여분 사진(extras) — R2에는 올리되 DB에는 넣지 않는다.
  // 화면에 쓰는 건 선별분뿐이고, 이건 원본 zip을 지운 뒤를 대비한 보관분이다.
  const extrasPath = path.join(outDir, "extras.jsonl");
  const extrasByFacility = new Map();
  if (fs.existsSync(extrasPath)) {
    for (const line of fs.readFileSync(extrasPath, "utf8").split(/\r?\n/).filter(Boolean)) {
      const rec = JSON.parse(line);
      extrasByFacility.set(rec.facilityId, rec.items);
    }
    console.log(`extras: ${extrasByFacility.size}곳 (R2 보관용, DB 미반영)`);
  }
  if (!write) console.log("--write 없이 미리보기만 합니다. 실제로 올리려면 --write를 붙이세요.\n");

  let uploaded = 0;
  let photoCount = 0;
  let extraCount = 0;

  for (const line of lines) {
    if (limit && uploaded >= limit) break;
    const rec = JSON.parse(line);
    if (done.has(rec.instCode)) continue;

    const facilityDir = path.join(outDir, "files", rec.facilityId);
    const photos = [];
    const photoItems = [];

    for (const item of rec.items) {
      const localFile = path.join(facilityDir, item.file);
      if (!fs.existsSync(localFile)) continue;
      let url;
      if (write) {
        const buf = fs.readFileSync(localFile);
        const remotePath = `${rec.facilityId}/${item.file}`;
        url = await uploadToR2(remotePath, buf, "image/webp");
      } else {
        url = `[preview] ${rec.facilityId}/${item.file}`;
      }
      photos.push(url);
      photoItems.push({ url, area: item.area, caption: item.caption });
      photoCount++;
    }

    // 같은 시설의 여분 사진도 함께 올린다(DB에는 안 들어감)
    for (const item of extrasByFacility.get(rec.facilityId) ?? []) {
      const localFile = path.join(facilityDir, item.file);
      if (!fs.existsSync(localFile)) continue;
      if (write) {
        const buf = fs.readFileSync(localFile);
        await uploadToR2(`${rec.facilityId}/${item.file}`, buf, "image/webp");
      }
      extraCount++;
    }

    if (write && photos.length > 0) {
      const { rows } = await client.query(`SELECT extra FROM "Facility" WHERE id = $1`, [rec.facilityId]);
      const currentExtra = rows[0]?.extra ?? {};
      const nextExtra = { ...currentExtra, photos, photoItems };
      await client.query(`UPDATE "Facility" SET extra = $2::jsonb WHERE id = $1`, [
        rec.facilityId,
        JSON.stringify(nextExtra),
      ]);
    }

    if (write && cleanup && photos.length > 0) {
      fs.rmSync(facilityDir, { recursive: true, force: true });
    }

    done.add(rec.instCode);
    uploaded++;
    if (uploaded % 50 === 0) {
      fs.writeFileSync(progressPath, JSON.stringify([...done]));
      console.log(`  ${uploaded}곳 업로드, 사진 ${photoCount}장 (+여분 ${extraCount}장)`);
    }
  }

  fs.writeFileSync(progressPath, JSON.stringify([...done]));
  await client.end();

  console.log(`\n=== upload ${write ? "완료" : "미리보기 완료"} ===`);
  console.log(`시설: ${uploaded}곳, 화면용 사진: ${photoCount}장, 보관용 여분: ${extraCount}장`);
  if (!write) console.log("실제 반영하려면: --write 붙여서 다시 실행");
}

// ---------------------------------------------------------------- main

const [, , cmd, ...rest] = process.argv;
const limitArg = rest.find((a) => a.startsWith("--limit"));
const limit = limitArg ? Number(rest[rest.indexOf(limitArg) + 1] ?? limitArg.split("=")[1]) : undefined;
const write = rest.includes("--write");
const cleanup = rest.includes("--cleanup");
const positional = rest.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));

if (cmd === "inventory") {
  const [zipPath, outDir] = positional;
  if (!zipPath || !outDir) {
    console.error("사용법: node scripts/photo-import.mjs inventory <zip경로> <출력폴더>");
    process.exit(1);
  }
  await cmdInventory(zipPath, outDir);
} else if (cmd === "convert") {
  const [zipPath, outDir] = positional;
  if (!zipPath || !outDir) {
    console.error("사용법: node scripts/photo-import.mjs convert <zip경로> <출력폴더> [--limit N]");
    process.exit(1);
  }
  await cmdConvert(zipPath, outDir, limit);
} else if (cmd === "extras") {
  const [zipPath, outDir] = positional;
  if (!zipPath || !outDir) {
    console.error("사용법: node scripts/photo-import.mjs extras <zip경로> <출력폴더> [--limit N]");
    process.exit(1);
  }
  await cmdExtras(zipPath, outDir, limit);
} else if (cmd === "upload") {
  const [outDir] = positional;
  if (!outDir) {
    console.error("사용법: node scripts/photo-import.mjs upload <출력폴더> [--write] [--limit N] [--cleanup]");
    process.exit(1);
  }
  await cmdUpload(outDir, write, limit, cleanup);
} else {
  console.error("사용법:");
  console.error("  node scripts/photo-import.mjs inventory <zip경로> <출력폴더>              (전체 목록만 기록)");
  console.error("  node scripts/photo-import.mjs convert   <zip경로> <출력폴더> [--limit N]  (선별분 변환)");
  console.error("  node scripts/photo-import.mjs extras    <zip경로> <출력폴더> [--limit N]  (나머지 변환, 낮은 화질)");
  console.error("  node scripts/photo-import.mjs upload    <출력폴더>          [--write] [--limit N] [--cleanup]");
  process.exit(1);
}
