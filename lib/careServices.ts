import { Building2, Home, Sparkles, HeartHandshake, type LucideIcon } from "lucide-react";

// /services 소개 페이지에서 쓰는 돌봄 서비스 4종.
// 앞의 3종은 돌봄 요청으로 바로 이어지고, 가족간병은 우리가 매칭할 수 있는 대상이
// 아니라(가족이 곧 돌보는 사람) 제도 안내로만 다룬다 — 할 수 있는 것처럼 보이면 안 된다.
export interface CareService {
  slug: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  accent: {
    badge: string;
    icon: string;
    ring: string;
    glow: string;
  };
  /** 이런 분께 맞아요 */
  fitFor: string[];
  /** 이런 걸 도와드려요 */
  includes: string[];
  /** 알아두실 점 */
  note: string;
  action:
    | { kind: "request"; locationType: "HOSPITAL" | "HOUSEKEEPING" | "HOME"; label: string }
    | { kind: "guide"; label: string };
}

export const CARE_SERVICES: CareService[] = [
  {
    slug: "hospital",
    label: "병원 간병",
    tagline: "입원해 계신 동안 곁을 지켜드려요",
    icon: Building2,
    accent: {
      badge: "bg-primary-50 text-primary-700",
      icon: "bg-primary-100 text-primary-600",
      ring: "hover:border-primary-300",
      glow: "from-primary-100/70",
    },
    fitFor: [
      "수술 후 회복 중이라 곁에 사람이 필요한 경우",
      "보호자가 직장 때문에 병실을 비워야 하는 경우",
      "간병인이 급하게 필요해진 경우",
    ],
    includes: [
      "식사·세면·화장실 이동 보조",
      "체위 변경과 낙상 예방",
      "병실 생활 정리와 말벗",
      "상태 변화 시 보호자에게 연락",
    ],
    note: "석션, 경관영양, 주사처치 같은 의료행위는 의료법상 간병인이 할 수 없어요. 해당 처치는 병원 의료진이 맡습니다.",
    action: { kind: "request", locationType: "HOSPITAL", label: "병원 간병 요청하기" },
  },
  {
    slug: "home",
    label: "집에서 돌봄",
    tagline: "익숙한 집에서 그대로 지내실 수 있게",
    icon: Home,
    accent: {
      badge: "bg-peach-100 text-peach-700",
      icon: "bg-peach-100 text-peach-700",
      ring: "hover:border-peach-300",
      glow: "from-peach-200/60",
    },
    fitFor: [
      "시설보다 집에서 지내고 싶어 하시는 경우",
      "퇴원 후 집에서 회복 기간을 보내는 경우",
      "낮 동안 혼자 계시는 시간이 걱정되는 경우",
    ],
    includes: [
      "일상생활 전반 보조",
      "식사 준비와 복약 챙기기",
      "가벼운 산책과 재활 동작 돕기",
      "안부 확인과 정서적 돌봄",
    ],
    note: "장기요양등급이 있으면 방문요양(재가급여)으로 본인부담금만 내고 이용하실 수도 있어요. 등급이 없거나 시간이 더 필요할 때 이 서비스를 함께 쓰시면 돼요.",
    action: { kind: "request", locationType: "HOME", label: "자택 돌봄 요청하기" },
  },
  {
    slug: "housekeeping",
    label: "가사 돌봄",
    tagline: "집안일부터 안부까지, 정기적으로 챙겨드려요",
    icon: Sparkles,
    accent: {
      badge: "bg-mint-100 text-mint-700",
      icon: "bg-mint-100 text-mint-700",
      ring: "hover:border-mint-300",
      glow: "from-mint-200/60",
    },
    fitFor: [
      "혼자 지내시는 부모님이 걱정되는 경우",
      "거동은 하시지만 집안일이 버거워진 경우",
      "멀리 살아 자주 들여다보기 어려운 경우",
    ],
    includes: [
      "설거지·빨래·분리배출",
      "식사 준비와 복약 챙기기",
      "세면·위생 보조",
      "말벗과 안부 확인",
    ],
    note: "주 1~7회, 회당 2~8시간처럼 방문 주기를 정해 이용해요. 필요한 집안일만 골라 요청하실 수 있어요.",
    action: { kind: "request", locationType: "HOUSEKEEPING", label: "가사 돌봄 요청하기" },
  },
  {
    slug: "family",
    label: "가족 간병",
    tagline: "가족이 직접 돌보고 급여도 받는 방법",
    icon: HeartHandshake,
    accent: {
      badge: "bg-royal-50 text-royal-700",
      icon: "bg-royal-100 text-royal-600",
      ring: "hover:border-royal-300",
      glow: "from-royal-100/70",
    },
    fitFor: [
      "가족이 직접 모시고 싶은 경우",
      "낯선 사람이 집에 오는 것이 부담스러운 경우",
      "이미 가족이 돌보고 있는데 지원을 받고 싶은 경우",
    ],
    includes: [
      "가족이 요양보호사 자격을 취득",
      "재가장기요양기관에 소속되어 활동",
      "돌본 시간만큼 급여를 지급받음",
      "월 인정 시간에는 한도가 있음",
    ],
    note: "가족요양은 국민건강보험공단이 운영하는 제도예요. 돌보다가 중개하지 않고, 조건과 신청 방법만 정리해드려요. 어르신이 장기요양등급을 먼저 받으셔야 해요.",
    action: { kind: "guide", label: "가족요양 조건 알아보기" },
  },
];

// 가장 많이 헷갈려하는 부분을 한 표로 정리한다.
// 금액은 매년 고시로 바뀌어 잘못 안내할 위험이 커서 넣지 않고, 부담 구조만 설명한다.
export const COMPARISON_ROWS = [
  {
    label: "어디서 지내나요",
    values: ["병원 병실", "우리 집", "우리 집", "우리 집"],
  },
  {
    label: "언제 이용하나요",
    values: ["입원해 있는 동안", "필요한 기간 내내", "정한 요일·시간에만", "가족이 돌보는 동안"],
  },
  {
    label: "장기요양등급이 필요한가요",
    values: ["없어도 돼요", "없어도 돼요", "없어도 돼요", "반드시 필요해요"],
  },
  {
    label: "누가 돌보나요",
    values: ["돌보다 매니저", "돌보다 매니저", "돌보다 매니저", "자격 취득한 가족"],
  },
  {
    label: "비용은 어떻게 되나요",
    values: [
      "전액 본인 부담",
      "전액 본인 부담",
      "전액 본인 부담",
      "공단 급여 + 본인부담금",
    ],
  },
  {
    label: "돌보다에서 되나요",
    values: ["요청 가능", "요청 가능", "요청 가능", "안내만 제공"],
  },
] as const;

// 실제 공고가 어떤 모습인지 보여주는 예시 카드.
// 진짜 요청이 아니므로 화면에서 반드시 "예시"임을 밝히고, 클릭해도 상세로 가지 않는다.
export interface SampleListing {
  type: string;
  badge: string;
  place: string;
  period: string;
  days: number;
  time: string;
  target: string;
  detail: string;
}

export const SAMPLE_LISTINGS: SampleListing[] = [
  {
    type: "병원 간병",
    badge: "bg-primary-50 text-primary-700",
    place: "OO요양병원 5층 병동",
    period: "8월 5일 ~ 8월 27일",
    days: 23,
    time: "24시간 상주",
    target: "남성 · 80대 · 70~80kg",
    detail: "고관절 수술 후 회복 · 부축 필요",
  },
  {
    type: "가사 돌봄",
    badge: "bg-mint-100 text-mint-700",
    place: "경기 성남시 분당구",
    period: "8월 3일 ~ 8월 31일",
    days: 29,
    time: "주 3회 · 회당 3시간",
    target: "여성 · 70대",
    detail: "식사 준비 · 빨래 · 말벗 외 2개",
  },
  {
    type: "집에서 돌봄",
    badge: "bg-peach-100 text-peach-700",
    place: "서울 은평구",
    period: "8월 1일 ~ 8월 30일",
    days: 30,
    time: "오전 9시 ~ 오후 6시",
    target: "여성 · 80대 · 50~60kg",
    detail: "퇴원 후 자택 회복 · 복약 확인",
  },
  {
    type: "병원 간병",
    badge: "bg-primary-50 text-primary-700",
    place: "부산 해운대구 OO병원",
    period: "8월 10일 ~ 8월 24일",
    days: 15,
    time: "24시간 상주",
    target: "남성 · 70대 · 60~70kg",
    detail: "뇌졸중 재활 중 · 거동 부축 필요",
  },
  {
    type: "가사 돌봄",
    badge: "bg-mint-100 text-mint-700",
    place: "대구 수성구",
    period: "8월 4일 ~ 8월 25일",
    days: 22,
    time: "주 2회 · 회당 4시간",
    target: "여성 · 80대",
    detail: "청소 · 장보기 · 반찬 준비",
  },
  {
    type: "집에서 돌봄",
    badge: "bg-peach-100 text-peach-700",
    place: "인천 연수구",
    period: "8월 7일 ~ 9월 5일",
    days: 30,
    time: "오후 1시 ~ 오후 7시",
    target: "남성 · 90대 · 50~60kg",
    detail: "치매 초기 · 말벗과 산책 동행",
  },
];

export const SERVICE_STEPS = [
  {
    title: "필요한 돌봄을 알려주세요",
    desc: "어떤 돌봄이 언제, 어디서 필요한지 몇 가지만 고르면 요청이 등록돼요.",
  },
  {
    title: "돌보다 매니저가 지원해요",
    desc: "요청하신 지역에서 활동하는 매니저가 프로필과 함께 지원합니다.",
  },
  {
    title: "직접 보고 정하세요",
    desc: "경력과 자격증을 확인하고 마음에 드는 분을 고르시면 매칭이 확정돼요.",
  },
];
