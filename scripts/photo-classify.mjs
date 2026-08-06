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
  // 공간 이름이 활동 이름과 겹치는 경우를 먼저 정리한다.
  // "프로그램실"은 활동이 아니라 방이다 — 아래 활동 규칙에 먼저 걸리면 안 된다.
  { area: "common", kw: ["프로그램실", "활동실", "다목적실"] },
  // 활동을 가리키는 말이 있으면 공간이 아니라 프로그램이다.
  // (실측: "족욕 프로그램"·"목욕데이"·"봉사단과 함께하는 족욕" 42장이 아래 bath 규칙에
  //  걸려 목욕 공간으로 잘못 옮겨졌다 — 표본 검증에서 잡았다.)
  { area: "program", kw: ["프로그램", "행사", "봉사", "간담회", "캠페인", "잔치", "생신", "나들이", "공연"] },
  // 2026-08-06 신설 — 예전엔 이 셋이 전부 etc로 떨어졌다(etc 11,879장의 41%).
  // ★ entrance보다 먼저 본다: "2층 세면실 입구"가 entrance("입구")로 새면 목욕 공간이
  //   입구 사진으로 잡힌다. 공간의 성격이 위치보다 강한 신호다.
  // ★ exterior보다 먼저 본다: "사무실 전경"이 exterior("전경")로 새고 있었다(실측
  //   1,332장). 파일 첫머리의 설계 원칙("확실한 실내 신호를 먼저 걸러낸다")과 같은 맥락.
  { area: "bath", kw: ["목욕", "샤워", "세면", "화장실", "욕실", "족욕", "찜질", "위생"] },
  { area: "care", kw: ["간호사실", "간호실", "처치실", "의무실", "상담실", "진료"] },
  { area: "office", kw: ["사무실", "사무공간", "행정실", "원장실", "회의실"] },
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
    // 위 bath·care·office로 옮겨간 낱말들(화장실·목욕실·샤워실·세면·사무실·간호사실·
    // 상담실·족욕·찜질)은 여기서 뺐다 — 남기면 어느 쪽이 먼저 걸리든 헷갈린다.
    kw: ["세탁실", "이미용", "소독", "CCTV", "게시판", "안마의자", "운동기구"],
  },
];

/**
 * 캡션에서 시설명을 걷어낸다.
 * 캡션이 "정원노인요양원 전경사진"처럼 시설명으로 시작하는 경우가 많은데,
 * 시설명 안의 낱말이 규칙에 걸려 엉뚱하게 분류된다(실측: "정원"노인요양원 → outdoor,
 * "나나재활"요양원 → rehab). 시설명을 먼저 지우고 나머지만 보고 판단한다.
 */
export function stripName(caption, facilityName) {
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

/**
 * 캡션이 "사람이 주인공인 사진"을 암시하는가 — 대표 자리에서 감점한다.
 * (사용자 피드백 2026-08-05: "외관에 사람이 있으면 그건 외관이 아니라 사람" —
 * 건물·간판이 먼저 와야 한다.) 시설명을 걷어낸 텍스트에만 적용할 것 —
 * "늘봄어르신주간보호센터 전경"처럼 시설명 속 '어르신'이 걸리면 오탐이다(실측).
 * 검사 전에 neutralizeRoomNames()를 거칠 것 — "프로그램실"은 방 이름이지 사람이 아니다.
 */
export const HERO_PERSON_RE =
  /원장|직원|선생|요양보호사|사회복지사|어르신|단체|기념|행사|생신|생일|잔치|수업|참여|봉사|가족|환영|회의|회식|워크샵|워크숍|교육|세미나|간담회|모임|파티|송년|신년|체육대회|야유회|레크리에이션|레크레이션|미소|웃음|함께|축하|나들이|소풍|공연|위문|만들기|놀이|프로그램|활동|치료|운동/;

/** 문서·그래픽류(명함·로고) — 글자는 있지만 "시설 사진"이 아니라서 대표 부적합 */
export const HERO_GRAPHIC_RE = /명함|로고/;

/** 건물임을 강하게 암시하는 낱말 — 간판·입구는 "글자가 보이는 시설 사진"이라 대표 적합.
 * "오시는 길"은 넣지 않는다 — 실측상 대부분 지도·약도 이미지였다(사진이 아님). */
export const HERO_BUILDING_RE = /간판|입구|정문|현관/;

/** 지도·약도류 — 시설 "사진"이 아니라서 대표로 올리면 안 된다(실측: "오시는길 지도") */
export const HERO_MAP_RE = /지도|약도|오시는\s*길|찾아오시는/;

/** "프로그램실"·"활동실"처럼 방 이름에 들어간 낱말이 사람 규칙에 걸리지 않게 중화한다 */
export function neutralizeRoomNames(text) {
  return text.replace(/(프로그램|활동|치료|운동|재활)\s*실/g, "실");
}

/** 대표사진 후보 점수 — 높을수록 대표로 적합. "시설구조·전경 + 외부" 조합이 최고점. */
function heroScore(p) {
  const text = neutralizeRoomNames(stripName(p.caption, p.facilityName));
  let s = 0;
  if (p.area === "exterior") s += 100;
  if (p.category.includes("시설구조")) s += 50; // 사용자 요청: 시설구조·전경이 메인
  if (/외부전경|외관|건물전경|건물전면|건물사진|시설전경/.test(text)) s += 30;
  if (/전경/.test(text)) s += 10;
  if (HERO_BUILDING_RE.test(text)) s += 20;
  // 사람·행사 캡션은 크게 뒤로 — 외관(+100)+시설구조(+50)라도 사람 없는 건물 사진에
  // 밀리게 하되(-60), 대안이 하나도 없는 시설에서는 여전히 최선이 남게 한다.
  if (HERO_PERSON_RE.test(text)) s -= 60;
  // 지도·약도·명함·로고는 시설 사진이 아니다 — 화장실도 대표 자리에는 못 오게 한다
  if (HERO_MAP_RE.test(text)) s -= 40;
  if (HERO_GRAPHIC_RE.test(text)) s -= 30;
  // 목욕·위생과 사무·행정은 시설을 대표하는 얼굴이 아니다. 예전엔 "화장실"만 문자열로
  // 걸렀는데, 이제 영역이 따로 있으니 영역으로 판단한다(캡션 표현이 달라도 잡힌다).
  // 다만 대안이 하나도 없는 시설에서는 여전히 최선으로 남아야 하므로 배제가 아닌 감점.
  if (p.area === "bath") s -= 50;
  if (p.area === "office") s -= 40;
  if (/화장실/.test(text)) s -= 50;
  if (p.ext === "bmp") s -= 5; // bmp는 원본 품질이 들쭉날쭉해 동점이면 뒤로
  return s;
}

// 갤러리에 고르게 담을 때의 순회 순서(lib/types.ts의 PHOTO_AREA_ORDER와 뜻을 맞춘다).
// 사무·행정은 보호자에게 가장 덜 중요해서 맨 뒤 — 자리가 부족하면 자연히 밀린다.
const GALLERY_ORDER = [
  "exterior", "entrance", "common", "room", "dining", "rehab", "bath", "outdoor", "care", "office", "etc",
];

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
