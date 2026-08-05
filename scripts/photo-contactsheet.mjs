// 샘플 결과를 눈으로 확인하는 대조표(contact sheet) 생성.
// 로컬 이미지를 data URI로 박아 단일 HTML로 만든다(외부 요청 0건 — 아티팩트로 바로 발행 가능).
//
// 사용법: node scripts/photo-contactsheet.mjs <zip경로> [시설수] [출력html]

import fs from "fs";
import path from "path";
import yauzl from "yauzl";
import sharp from "sharp";
import { groupByFacility, selectPhotos } from "./photo-classify.mjs";

const ZIP = process.argv[2];
const LIMIT = Number(process.argv[3] ?? 50);
const OUT = process.argv[4] ?? path.join(process.cwd(), "tmp-photo-sample", "contact-sheet.html");

const AREA_LABEL = {
  exterior: "외관",
  entrance: "입구·로비",
  common: "거실·공용",
  room: "생활실",
  program: "프로그램",
  dining: "식당",
  rehab: "재활·치료",
  outdoor: "마당·산책로",
  etc: "기타",
};

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

const zip = await openZip(ZIP);
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
const picked = [...facilities.values()].slice(0, LIMIT);

const cards = [];
for (const f of picked) {
  const sel = selectPhotos(f.photos);
  if (!sel.hero) continue;
  const entry = entryByPath.get(sel.hero.path);
  if (!entry) continue;
  try {
    const buf = await readEntry(zip, entry);
    // 대조표용이라 더 작게 — 실제 서비스 규격(800px)이 아니라 확인용 360px
    const small = await sharp(buf)
      .rotate()
      .resize({ width: 360, height: 240, fit: "cover" })
      .webp({ quality: 62 })
      .toBuffer();
    // 실제 서비스에 올라갈 규격의 용량도 같이 잰다
    const real = await sharp(buf)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    const counts = {};
    for (const p of [sel.hero, ...sel.gallery, ...sel.programs]) {
      counts[p.area] = (counts[p.area] ?? 0) + 1;
    }

    cards.push({
      name: f.name,
      instCode: f.instCode,
      area: sel.hero.area,
      caption: sel.hero.caption,
      isExterior: sel.hero.area === "exterior",
      total: sel.total,
      selected: 1 + sel.gallery.length + sel.programs.length,
      realKB: Math.round(real.length / 1024),
      origKB: Math.round(buf.length / 1024),
      counts,
      dataUri: `data:image/webp;base64,${small.toString("base64")}`,
    });
  } catch (e) {
    cards.push({ name: f.name, instCode: f.instCode, error: e.message, area: "-", caption: "-" });
  }
}
zip.close();

const okCount = cards.filter((c) => !c.error).length;
const extCount = cards.filter((c) => c.isExterior).length;
const avgKB = Math.round(cards.filter((c) => !c.error).reduce((s, c) => s + c.realKB, 0) / okCount);
const avgOrig = Math.round(cards.filter((c) => !c.error).reduce((s, c) => s + c.origKB, 0) / okCount);

const html = `<title>시설 대표사진 자동선별 — 샘플 검증</title>
<style>
  :root{--bg:#0f0e14;--panel:rgba(255,255,255,.05);--edge:rgba(255,255,255,.12);
    --text:#f2f0f7;--muted:#b6b0c8;--faint:#8e88a4;--ok:#4be8d6;--warn:#f5a95c;
    --font:"Pretendard Variable",Pretendard,-apple-system,"Malgun Gothic",sans-serif;
    --mono:ui-monospace,"Cascadia Code",Consolas,monospace}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font);
    line-height:1.6;word-break:keep-all;overflow-wrap:break-word}
  .wrap{max-width:1100px;margin:0 auto;padding:2.5rem 1.25rem 4rem}
  h1{font-size:clamp(1.5rem,4vw,2.1rem);letter-spacing:-.02em;margin:0 0 .5rem}
  .sub{color:var(--muted);font-size:.9rem;margin:0 0 2rem;max-width:44rem}
  .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--edge);
    border:1px solid var(--edge);border-radius:16px;overflow:hidden;margin-bottom:2.5rem}
  @media(min-width:640px){.stats{grid-template-columns:repeat(4,1fr)}}
  .stat{background:#15131d;padding:1.1rem 1rem;text-align:center}
  .stat b{display:block;font-family:var(--mono);font-size:1.5rem;color:var(--ok);
    font-variant-numeric:tabular-nums}
  .stat span{font-size:.72rem;color:var(--faint);display:block;margin-top:.25rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1rem}
  .card{border:1px solid var(--edge);border-radius:14px;overflow:hidden;background:var(--panel)}
  .card img{display:block;width:100%;aspect-ratio:3/2;object-fit:cover;background:#000}
  .meta{padding:.7rem .8rem}
  .nm{font-size:.84rem;font-weight:700;margin-bottom:.3rem;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
  .cap{font-size:.72rem;color:var(--muted);margin-bottom:.5rem;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
  .row{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap}
  .tag{font-family:var(--mono);font-size:.62rem;padding:.1rem .4rem;border-radius:4px}
  .tag.ok{color:var(--ok);background:rgba(75,232,214,.13)}
  .tag.alt{color:var(--warn);background:rgba(245,169,92,.13)}
  .tag.n{color:var(--faint);border:1px solid var(--edge)}
  .err{padding:1rem;font-size:.75rem;color:var(--warn)}
  .note{margin-top:2.5rem;border:1px solid var(--edge);border-radius:14px;
    background:var(--panel);padding:1.1rem 1.3rem;font-size:.8rem;color:var(--muted)}
  .note b{color:var(--text)}
</style>
<div class="wrap">
  <h1>시설 대표사진 자동선별 — 샘플 검증</h1>
  <p class="sub">공단 사진 zip에서 시설 ${cards.length}곳의 대표사진을 규칙만으로 자동 선별한 결과입니다.
  사람이 고른 게 아니라 파일명·캡션을 읽어 판정했습니다. 아래 이미지는 확인용으로 360px까지 줄인 것이고,
  실제 서비스에는 800px로 올라갑니다.</p>

  <div class="stats">
    <div class="stat"><b>${cards.length}</b><span>검증 시설</span></div>
    <div class="stat"><b>${Math.round((extCount / okCount) * 100)}%</b><span>외관 자동판정</span></div>
    <div class="stat"><b>${avgOrig}KB</b><span>원본 평균</span></div>
    <div class="stat"><b>${avgKB}KB</b><span>변환 후 평균</span></div>
  </div>

  <div class="grid">
${cards
  .map((c) =>
    c.error
      ? `    <div class="card"><div class="err">${c.name}<br/>실패: ${c.error}</div></div>`
      : `    <div class="card">
      <img src="${c.dataUri}" alt="${c.name} 대표사진" loading="lazy"/>
      <div class="meta">
        <div class="nm">${c.name}</div>
        <div class="cap">${c.caption}</div>
        <div class="row">
          <span class="tag ${c.isExterior ? "ok" : "alt"}">${AREA_LABEL[c.area] ?? c.area}</span>
          <span class="tag n">${c.total}장→${c.selected}장</span>
          <span class="tag n">${c.realKB}KB</span>
        </div>
      </div>
    </div>`
  )
  .join("\n")}
  </div>

  <div class="note">
    <b>초록 배지</b>는 규칙이 실제 외관 사진을 찾아낸 경우,
    <b>주황 배지</b>는 그 시설 사진 안에 외관이 아예 없어 다른 영역으로 대체한 경우입니다.
    주황이라고 잘못 고른 게 아니라, 공단에 제출된 사진 자체에 건물 외부 사진이 없는 시설입니다.
  </div>
</div>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");
console.log(`대조표 저장: ${OUT}`);
console.log(`시설 ${cards.length}곳 / 외관 판정 ${extCount} (${Math.round((extCount / okCount) * 100)}%)`);
console.log(`HTML 용량: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
