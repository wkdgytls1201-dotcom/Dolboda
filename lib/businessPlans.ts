// 기업회원용 요금제 — 가격·구성의 단일 출처.
//
// 화면·JSON-LD·운영자 알림 메일 세 군데가 같은 값을 써야 한다. 예전에 사이트 설명의
// 시설 수가 화면 집계와 어긋났던 것과 같은 종류의 사고를 미리 막는다.
//
// ⚠️ 가격을 바꾸면 이미 계약 중인 시설의 조건이 바뀌는 문제라, 값만 고치지 말고
// "언제부터 적용인지"를 함께 정할 것.

/** 표시 가격은 전부 부가세 별도다. 화면에서 반드시 함께 밝힌다. */
export const VAT_NOTE = "부가세 별도";

/**
 * 지역 스폰서를 한 시·군·구에 몇 곳까지 파는지의 상한.
 *
 * 이 숫자가 이 사업의 핵심 안전장치다. 상한이 없으면 결국 목록 상단이 전부 광고가 되고,
 * "순위를 팔지 않는다"는 원칙이 말로만 남는다. 슬롯이 차면 대기로 받는다.
 */
export const SPONSOR_SLOTS_PER_SIGUNGU = 3;

/**
 * 지역 배너를 한 시·군·구에 몇 곳까지 파는지의 상한. 스폰서(3곳)보다 희소하게 둔다 —
 * 배너는 지역 프리미엄 이상의 대표 혜택이라, 여러 시설이 나눠 가지면 "프리미엄"의
 * 의미가 옅어진다. 1곳만 팔아 그 지역에서 가장 눈에 띄는 자리로 유지한다.
 */
export const BANNER_SLOTS_PER_SIGUNGU = 1;

/** 지역 배너가 포함된 상품 — /admin 승인·슬롯 검사·콘솔 노출 조건이 전부 이 집합을 본다. */
export const BANNER_PLANS = new Set(["premium", "silvertown"]);

export interface BusinessPlan {
  id: string;
  name: string;
  /** 월 요금(원). null이면 별도 견적 */
  monthly: number | null;
  /** 가격 옆에 붙는 한 줄 — "부터" 같은 단서 */
  priceNote?: string;
  /** 누구를 위한 상품인지 */
  audience: string;
  /** 한 줄 요약 */
  tagline: string;
  features: string[];
  /** 아래 요금제의 것을 전부 포함한다는 표시 */
  includesPrevious?: string;
  highlight?: boolean;
}

export const BUSINESS_PLANS: BusinessPlan[] = [
  {
    id: "free",
    name: "시설 기본 등록",
    monthly: 0,
    audience: "모든 요양시설",
    tagline: "이미 등록돼 있습니다. 인증만 하면 직접 관리할 수 있어요.",
    features: [
      "공공데이터 기반 시설 페이지 (이미 노출 중)",
      "기업회원 인증 후 소개글·사진·연락처 직접 수정",
      "잘못된 정보 정정 요청",
      "보호자 상담 신청 메일 수신",
      "월 조회수·상담 건수 기본 통계",
    ],
  },
  {
    id: "plus",
    name: "돌보다 비즈니스 플러스",
    monthly: 49_000,
    audience: "페이지를 적극 운영할 시설",
    tagline: "우리 시설이 어떤 곳인지 제대로 보여줍니다.",
    includesPrevious: "시설 기본 등록의 모든 기능",
    features: [
      "사진 최대 30장 + 시설 소개 영상",
      "프로그램·하루 일과·식단 상세 소개",
      "시설 소식 발행 (행사·채용·공지)",
      "상담 신청 시 문자·카카오 알림",
      "유입 검색어·조회수·상담 전환 통계",
    ],
  },
  {
    id: "sponsor",
    name: "지역 스폰서",
    monthly: 149_000,
    audience: "입소자를 모집하는 시설",
    tagline: "우리 지역에서 시설을 찾는 보호자에게 먼저 보입니다.",
    features: [
      `해당 시·군·구 검색 결과에 스폰서 노출 (지역당 ${SPONSOR_SLOTS_PER_SIGUNGU}곳 한정)`,
      "일반 목록과 분리된 자리에 '광고' 표시와 함께 노출",
      "노출수·클릭수 리포트",
      "지역·기간 단위로 신청·중단",
    ],
  },
  {
    id: "premium",
    name: "지역 프리미엄",
    monthly: 299_000,
    audience: "상단 노출과 페이지 기능이 모두 필요한 시설",
    tagline: "플러스와 스폰서를 묶고, 지역 배너까지 더합니다.",
    includesPrevious: "비즈니스 플러스 + 지역 스폰서의 모든 기능",
    features: [
      "지역 페이지 배너 노출",
      "상담 버튼 강조 표시",
      "시설 소식 지역 페이지 상단 고정",
      "월간 성과 보고서 (조회수·상담·광고 노출·클릭, 지역 평균 비교)",
      "전담 담당자 배정",
    ],
    highlight: true,
  },
  {
    id: "silvertown",
    name: "실버타운 프리미엄",
    monthly: 790_000,
    priceNote: "부터 · 규모·지역에 따라 견적",
    audience: "전국 단위로 입주자를 모집하는 실버타운·프리미엄 시설",
    tagline: "전국·광역 단위 노출과 콘텐츠 제작까지 함께합니다.",
    includesPrevious: "지역 프리미엄의 모든 기능",
    features: [
      "전국·광역 단위 스폰서 노출",
      "홈·가이드 배너",
      "상담 연결 전용 라인",
      "시설 소개 콘텐츠 제작 (촬영·기사형 소개)",
      "분기 단위 성과 리뷰 미팅",
    ],
  },
];

export function findPlan(id: string): BusinessPlan | undefined {
  return BUSINESS_PLANS.find((p) => p.id === id);
}

export function formatPlanPrice(plan: BusinessPlan): string {
  if (plan.monthly === null) return "별도 견적";
  if (plan.monthly === 0) return "무료";
  return `월 ${plan.monthly.toLocaleString()}원`;
}

/**
 * 가입 절차. 전부 비대면·이메일로 진행한다(전화 없음 — 운영 방침).
 * 사칭 방지는 서류(지정서·사업자등록증)의 기관기호·상호가 신청 내용과 일치하는지로 확인한다.
 */
export const SIGNUP_STEPS: { title: string; desc: string; badge: string }[] = [
  {
    badge: "약 2분",
    title: "우리 시설 찾고 신청하기",
    desc: "시설명과 기관기호(또는 사업자등록번호), 담당자 연락처만 남기시면 됩니다. 이미 등록된 페이지가 있어 새로 만들 것은 없어요.",
  },
  {
    badge: "서류 1건",
    title: "이메일로 운영 주체 확인",
    desc: "안내 메일로 장기요양기관 지정서 또는 사업자등록증 사본 한 건만 회신해 주세요(요양병원은 의료기관 개설신고증명서). 서류의 기관기호가 신청 내용과 맞는지 확인해 사칭을 막아요.",
  },
  {
    badge: "바로",
    title: "계정 연결 후 페이지 관리 시작",
    desc: "카카오 계정에 시설이 연결됩니다. 소개글·사진·연락처를 직접 고치고 상담 신청을 받아보세요.",
  },
];
