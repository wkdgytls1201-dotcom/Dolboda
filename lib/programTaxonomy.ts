// 프로그램 분류 체계 — 공단 원본의 프로그램명은 자유 텍스트라 고유값이 52,589개나 된다
// ("인지프로그램", "인지활동", "인지기능프로그램", "힘뇌체조" … 전부 사실상 같은 것).
// 보호자가 실제로 찾는 기준으로 묶어야 검색이 의미가 있어, 키워드 규칙으로 정규화한다.
//
// 임베딩(pgvector)을 쓰지 않고 규칙 기반으로 간 이유:
//  - 상위 명칭이 명확한 군집을 이루고 있어 키워드로 대부분 잡힌다
//  - 12만 행 임베딩은 비용이 들고, 매번 데이터 갱신 때마다 다시 돌려야 한다
//  - 무엇보다 "왜 이 태그가 붙었는지" 설명할 수 있어야 하는데 규칙이 훨씬 투명하다

export type ProgramTag =
  | "cognitive"
  | "physical"
  | "therapy"
  | "music"
  | "art"
  | "cooking"
  | "garden"
  | "social"
  | "outing"
  | "family"
  | "spiritual"
  | "grooming";

export const PROGRAM_TAG_META: Record<
  ProgramTag,
  { label: string; desc: string; emoji: string }
> = {
  cognitive: {
    label: "인지·치매 예방",
    desc: "기억력·판단력을 자극하는 활동",
    emoji: "🧠",
  },
  physical: { label: "신체 활동", desc: "체조·운동으로 근력과 균형 유지", emoji: "🤸" },
  therapy: { label: "재활 치료", desc: "물리·작업치료 등 전문 재활", emoji: "🩺" },
  music: { label: "음악 활동", desc: "노래교실·음악치료", emoji: "🎵" },
  art: { label: "미술·공예", desc: "그리기·만들기 활동", emoji: "🎨" },
  cooking: { label: "요리·일상생활", desc: "요리 활동과 일상 동작 훈련", emoji: "🍳" },
  garden: { label: "원예·자연", desc: "화분·텃밭 가꾸기", emoji: "🌱" },
  social: { label: "여가·교류", desc: "레크리에이션·놀이·생신잔치", emoji: "🎉" },
  outing: { label: "외출·나들이", desc: "산책과 바깥 활동", emoji: "🚶" },
  family: { label: "가족 참여", desc: "보호자가 함께하는 프로그램", emoji: "👨‍👩‍👧" },
  spiritual: { label: "종교 활동", desc: "예배·법회 등", emoji: "🙏" },
  grooming: {
    label: "위생·미용 돌봄",
    desc: "목욕·이미용·마사지 등 몸을 돌보는 서비스",
    emoji: "🛁",
  },
};

// 순서가 곧 우선순위 — 위에서 먼저 걸리면 그 태그로 본다.
// (예: "치매예방체조"는 체조지만 목적이 인지라 cognitive가 먼저)
const RULES: { tag: ProgramTag; keywords: string[] }[] = [
  {
    tag: "cognitive",
    keywords: [
      "인지", "치매", "회상", "기억", "두뇌", "힘뇌", "뇌활", "퍼즐", "칠교", "색칠",
      "숫자", "한글", "글쓰기", "독서", "낱말", "보드게임", "현실인식",
    ],
  },
  {
    tag: "therapy",
    keywords: ["물리치료", "작업치료", "재활", "기능회복", "언어치료", "도수", "온열", "찜질"],
  },
  {
    tag: "music",
    keywords: ["음악", "노래", "가요", "합창", "악기", "난타", "장구", "리듬"],
  },
  {
    tag: "art",
    keywords: ["미술", "그림", "만들기", "공예", "종이접기", "서예", "캘리", "점토", "비즈", "뜨개"],
  },
  {
    tag: "garden",
    keywords: ["원예", "텃밭", "화분", "식물", "꽃꽂이", "가드닝"],
  },
  {
    tag: "cooking",
    keywords: ["요리", "제과", "제빵", "다과", "간식만들", "일상생활동작", "adl"],
  },
  {
    tag: "family",
    keywords: ["가족참여", "가족교육", "가족간담", "보호자간담", "가족상담"],
  },
  {
    tag: "spiritual",
    keywords: ["종교", "예배", "법회", "미사", "찬양", "성경", "불경"],
  },
  {
    tag: "outing",
    keywords: ["나들이", "산책", "야외", "외출", "소풍", "견학", "바깥"],
  },
  {
    tag: "grooming",
    keywords: [
      "목욕", "족욕", "이미용", "미용", "네일", "마사지", "손발관리", "구강", "위생",
      "세면", "머리손질", "면도",
    ],
  },
  {
    tag: "physical",
    keywords: [
      "체조", "운동", "스트레칭", "요가", "근력", "걷기", "보행", "신체", "율동",
      "풍선", "볼링", "고리던지기", "탁구", "게이트볼", "낙상예방",
    ],
  },
  {
    tag: "social",
    keywords: [
      "레크", "놀이", "여가", "생신", "생일", "잔치", "행사", "영화", "윷놀이",
      "다과회", "웃음", "원예치료", "사회적응", "프로그램", "활동",
    ],
  },
];

/** 프로그램명(+공단 분류)에서 태그를 판정한다. 못 잡으면 null */
export function tagOf(name: string, category?: string): ProgramTag | null {
  const text = `${name} ${category ?? ""}`.replace(/\s/g, "").toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.tag;
  }
  return null;
}

/** "주 3회(1시간)" → 주당 횟수. 월/일/년 단위도 주 단위로 환산 */
export function weeklyCountOf(frequency?: string): number | null {
  if (!frequency) return null;
  const m = /([일주월년])\s*(\d+(?:\.\d+)?)\s*회/.exec(frequency.replace(/\s/g, ""));
  if (!m) return null;
  const [, unit, countStr] = m;
  const count = Number(countStr);
  if (!Number.isFinite(count)) return null;
  if (unit === "일") return count * 7;
  if (unit === "주") return count;
  if (unit === "월") return count / 4.345;
  return count / 52; // 년
}

export interface ProgramTagSummary {
  tag: ProgramTag;
  /** 이 태그로 묶인 프로그램 종류 수 (이름 기준 중복 제거) */
  count: number;
  /** 태그 내 프로그램들의 주당 운영 횟수 합 */
  weekly: number;
  /** 대표 프로그램명 (많이 나오는 순 최대 3개) */
  samples: string[];
}

/** 시설의 프로그램 목록 → 태그별 요약. 검색 필터와 상세 화면이 함께 쓴다. */
export function summarizePrograms(
  programs: { name: string; category?: string; frequency?: string }[]
): ProgramTagSummary[] {
  const map = new Map<ProgramTag, { names: Set<string>; weekly: number; order: string[] }>();

  for (const p of programs) {
    const tag = tagOf(p.name, p.category);
    if (!tag) continue;
    const slot = map.get(tag) ?? { names: new Set<string>(), weekly: 0, order: [] };
    const key = p.name.replace(/\s/g, "");
    if (!slot.names.has(key)) {
      slot.names.add(key);
      slot.order.push(p.name);
      // 같은 이름이 여러 번 등록된 경우가 많아 종류당 한 번만 주기를 더한다
      slot.weekly += weeklyCountOf(p.frequency) ?? 0;
    }
    map.set(tag, slot);
  }

  return [...map.entries()]
    .map(([tag, v]) => ({
      tag,
      count: v.names.size,
      weekly: Math.round(v.weekly * 10) / 10,
      samples: v.order.slice(0, 3),
    }))
    .sort((a, b) => b.weekly - a.weekly || b.count - a.count);
}
