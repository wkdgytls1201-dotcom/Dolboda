// 공단 시설사진 zip의 파일명을 읽어 시설별·영역별로 분류한다.
// 실제 이미지를 건드리지 않고 "무엇을 어디에 넣을지"만 계산하는 순수 함수 모음 —
// 샘플 테스트와 본 업로드가 같은 규칙을 쓰도록 여기 한 곳에만 둔다.
//
// zip 내부 경로 형식(실측):
//   41_경기도/{시설명}({기관기호})/{시설명}_{카테고리}_{번호}_{설명}.jpg
//   카테고리는 3종뿐: 시설구조·전경 / 시설설비상태(1|2) / 프로그램

/** 파일명에서 시설·카테고리·설명을 뽑는다. 형식이 안 맞으면 null. */
export function parseEntry(fullPath) {
  const parts = fullPath.split("/");
  if (parts.length < 3) return null;

  const folder = parts[parts.length - 2];
  const m = folder.match(/^(.*)\((\d{6,})\)$/);
  if (!m) return null;

  const fileName = parts[parts.length - 1];
  const ext = (fileName.match(/\.([a-zA-Z]+)$/)?.[1] ?? "").toLowerCase();
  if (!["jpg", "jpeg", "png", "bmp", "gif", "webp"].includes(ext)) return null;

  const stem = fileName.replace(/\.[a-zA-Z]+$/, "");
  const seg = stem.split("_");
  // {시설명}_{카테고리}_{번호}_{설명} — 시설명 자체에 _가 있을 수 있어 뒤에서 센다
  const category = seg.length >= 2 ? seg[1].replace(/\d+$/, "") : "";
  const caption = seg.length >= 4 ? seg.slice(3).join("_") : stem;

  return {
    path: fullPath,
    instCode: m[2],
    facilityName: m[1],
    category,
    caption,
    ext,
  };
}

// 캡션 키워드 → 영역. 위에서부터 먼저 맞는 것을 쓴다(순서가 곧 우선순위).
// "전경"은 실내전경/내부전경처럼 안을 가리키는 경우가 있어 반드시 뒤쪽 규칙보다 나중에 본다.
const RULES = [
  // 확실한 실내 신호를 먼저 걸러낸다 — "실내전경"이 exterior로 새는 걸 막는다
  { area: "room", kw: ["생활실", "침실", "인실", "병실", "요양실"] },
  { area: "dining", kw: ["식당", "주방", "조리실", "급식", "배식"] },
  { area: "rehab", kw: ["물리치료", "재활", "작업치료", "치료실", "운동실"] },
  { area: "entrance", kw: ["로비", "현관", "안내데스크", "접수", "출입구", "정문", "입구"] },
  {
    area: "common",
    kw: [
      "거실", "복도", "휴게실", "면회실", "프로그램실", "강당", "카페", "도서",
      "실내전경", "내부전경", "시설내부", "내부사진", "엘리베이터", "계단",
    ],
  },
  {
    area: "outdoor",
    kw: [
      "산책로", "정원", "텃밭", "옥상", "야외", "테라스", "쉼터", "마당",
      "하늘정원", "치유정원", "주차장", "주차",
    ],
  },
  // 여기까지 안 걸리면 바깥 신호를 본다
  {
    area: "exterior",
    kw: ["외부전경", "외관", "외경", "건물전경", "시설전경", "요양원전경", "센터전경", "전경", "건물", "외부", "전면"],
  },
  {
    area: "program",
    kw: [
      "프로그램", "행사", "잔치", "생신", "어버이날", "나들이", "공연", "교실",
      "활동", "치료", "체조", "만들기", "봉사", "교육", "간담회", "캠페인",
      "크리스마스", "명절", "생일", "레크", "노래", "미술", "원예", "웃음",
    ],
  },
  {
    area: "etc",
    kw: [
      "화장실", "목욕실", "세면장", "샤워실", "사무실", "간호사실", "상담실",
      "세탁실", "이미용", "족욕", "찜질", "소독", "CCTV", "게시판", "세면",
    ],
  },
];

/**
 * 캡션에서 시설명을 걷어낸다.
 * 캡션이 "정원노인요양원 전경사진"처럼 시설명으로 시작하는 경우가 많은데,
 * 시설명 안의 낱말이 규칙에 걸려 엉뚱하게 분류된다(실측: "정원"노인요양원 → outdoor,
 * "나나재활"요양원 → rehab). 시설명을 먼저 지우고 나머지만 보고 판단한다.
 */
function stripName(caption, facilityName) {
  if (!facilityName) return caption;
  let out = caption.split(facilityName).join(" ");
  // 시설명이 띄어쓰기만 다르게 들어간 경우까지 잡는다
  const compact = facilityName.replace(/\s+/g, "");
  if (compact && compact !== facilityName) out = out.split(compact).join(" ");
  // 시설 유형 접미사만 남아도 오분류를 만든다("재활요양원" 등)
  return out.replace(/(요양원|요양병원|주간보호센터|데이케어센터|재가복지센터|방문요양센터|요양센터|센터)/g, " ");
}

/**
 * 한 장의 사진이 어느 영역인지 정한다.
 * 파일명 카테고리(시설구조·전경 / 시설설비상태 / 프로그램)를 1차 신호로,
 * 캡션 키워드를 2차 신호로 쓴다 — 캡션이 더 구체적이라 캡션을 우선한다.
 */
export function classifyArea({ category, caption, facilityName }) {
  const text = stripName(caption, facilityName);
  for (const rule of RULES) {
    if (rule.kw.some((k) => text.includes(k))) return rule.area;
  }
  // 캡션으로 못 정하면 카테고리로 떨어뜨린다
  if (category.includes("프로그램")) return "program";
  if (category.includes("시설구조")) return "exterior";
  return "etc";
}

/** 대표사진 후보 점수 — 높을수록 대표로 적합. "시설구조·전경 + 외부" 조합이 최고점. */
function heroScore(p) {
  const text = stripName(p.caption, p.facilityName);
  let s = 0;
  if (p.area === "exterior") s += 100;
  if (p.category.includes("시설구조")) s += 50; // 사용자 요청: 시설구조·전경이 메인
  if (/외부전경|외관|건물전경|시설전경/.test(text)) s += 30;
  if (/전경/.test(text)) s += 10;
  if (p.ext === "bmp") s -= 5; // bmp는 원본 품질이 들쭉날쭉해 동점이면 뒤로
  return s;
}

const GALLERY_ORDER = ["exterior", "entrance", "common", "room", "dining", "rehab", "outdoor", "etc"];

/**
 * 한 시설의 사진 목록에서 실제로 올릴 것만 고른다.
 * - 대표(hero) 1장: 시설구조·전경 + 외부 우선
 * - 갤러리: 영역별로 고르게, 최대 maxGallery장
 * - 프로그램: 최대 maxProgram장 (기본 3 — 용량의 38%를 차지해 제한)
 */
export function selectPhotos(photos, { maxGallery = 8, maxProgram = 3 } = {}) {
  const enriched = photos.map((p) => ({ ...p, area: classifyArea(p) }));

  const nonProgram = enriched.filter((p) => p.area !== "program");
  const programs = enriched.filter((p) => p.area === "program");

  // hero는 후보를 여러 장 남겨둔다 — sharp가 BMP를 못 읽는 것처럼 1순위가
  // 실제로는 못 쓰는 파일일 수 있어서, 처리 단계에서 실패하면 다음 후보로 넘어간다.
  const heroCandidates = [...nonProgram].sort((a, b) => heroScore(b) - heroScore(a));
  const hero = heroCandidates[0] ?? programs[0] ?? null;

  // 갤러리는 영역을 돌아가며 하나씩 뽑는다 — 생활실 8장 같은 편중을 막는다
  const byArea = new Map();
  for (const p of nonProgram) {
    if (hero && p.path === hero.path) continue;
    if (!byArea.has(p.area)) byArea.set(p.area, []);
    byArea.get(p.area).push(p);
  }
  const gallery = [];
  const usedPaths = new Set(hero ? [hero.path] : []);
  let round = 0;
  while (gallery.length < maxGallery) {
    let added = false;
    for (const area of GALLERY_ORDER) {
      const list = byArea.get(area);
      if (list && list[round]) {
        gallery.push(list[round]);
        usedPaths.add(list[round].path);
        added = true;
        if (gallery.length >= maxGallery) break;
      }
    }
    if (!added) break;
    round++;
  }

  // 갤러리 사진 하나가 처리 실패하면 대체할 다음 후보들(영역 무관, 우선순위순)
  const galleryBackup = heroCandidates.filter((p) => !usedPaths.has(p.path));

  return {
    hero,
    heroCandidates, // [0]=hero와 동일, 실패 시 [1], [2]... 순서로 재시도
    gallery,
    galleryBackup,
    programs: programs.slice(0, maxProgram),
    programBackup: programs.slice(maxProgram),
    skipped: enriched.length - (hero ? 1 : 0) - gallery.length - Math.min(programs.length, maxProgram),
    total: enriched.length,
  };
}

/** zip 전체 엔트리를 시설별로 묶는다. */
export function groupByFacility(entryPaths) {
  const map = new Map();
  for (const raw of entryPaths) {
    const parsed = parseEntry(raw);
    if (!parsed) continue;
    if (!map.has(parsed.instCode)) {
      map.set(parsed.instCode, { instCode: parsed.instCode, name: parsed.facilityName, photos: [] });
    }
    map.get(parsed.instCode).photos.push(parsed);
  }
  return map;
}
