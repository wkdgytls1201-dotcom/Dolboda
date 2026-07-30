// 노인장기요양보험 "장기요양인정조사표"의 5개 영역 52개 항목을 그대로 반영한 예상 테스트.
//
// ⚠️ 중요: 공단의 실제 요양인정점수는 영역별 점수를 8개 서비스군별 수형분석에 넣어
// 산출하며, 그 알고리즘은 공개된 단순 공식이 아니다. 여기서는 "도움이 필요한 정도"를
// 영역별로 환산해 참고용 구간을 보여줄 뿐이며, 화면에도 반드시 그렇게 안내한다.
// 실제 등급은 공단 직원의 방문조사 + 의사소견서 + 등급판정위원회 심의로 결정된다.

export type AreaKey = "physical" | "cognitive" | "behavior" | "nursing" | "rehab";

export interface TestItem {
  id: string;
  label: string;
}

export interface TestArea {
  key: AreaKey;
  title: string;
  subtitle: string;
  /** 3단계(도움 정도) or 2단계(있음/없음) */
  scale: "assist" | "yesno" | "motion";
  items: TestItem[];
  /** 이 영역이 최종 점수에서 차지하는 비중 */
  weight: number;
}

export const ASSIST_OPTIONS = [
  { label: "혼자 하실 수 있어요", short: "혼자 가능", score: 0 },
  { label: "조금 도와드리면 돼요", short: "일부 도움", score: 1 },
  { label: "대부분 도와드려야 해요", short: "완전 도움", score: 2 },
] as const;

export const YESNO_OPTIONS = [
  { label: "아니요", short: "없음", score: 0 },
  { label: "예", short: "있음", score: 2 },
] as const;

export const MOTION_OPTIONS = [
  { label: "불편함이 없어요", short: "정상", score: 0 },
  { label: "조금 불편해요", short: "부분 제한", score: 1 },
  { label: "거의 움직이기 어려워요", short: "심한 제한", score: 2 },
] as const;

export function optionsFor(scale: TestArea["scale"]) {
  if (scale === "assist") return ASSIST_OPTIONS;
  if (scale === "motion") return MOTION_OPTIONS;
  return YESNO_OPTIONS;
}

export const TEST_AREAS: TestArea[] = [
  {
    key: "physical",
    title: "신체 기능",
    subtitle: "일상생활 동작을 혼자 하실 수 있는지 알려주세요.",
    scale: "assist",
    weight: 0.4,
    items: [
      { id: "p1", label: "옷 벗고 입기" },
      { id: "p2", label: "세수하기" },
      { id: "p3", label: "양치질하기" },
      { id: "p4", label: "목욕하기" },
      { id: "p5", label: "식사하기" },
      { id: "p6", label: "누운 자세 바꾸기" },
      { id: "p7", label: "일어나 앉기" },
      { id: "p8", label: "옮겨 앉기" },
      { id: "p9", label: "방 밖으로 나오기" },
      { id: "p10", label: "화장실 사용하기" },
      { id: "p11", label: "대변 조절하기" },
      { id: "p12", label: "소변 조절하기" },
    ],
  },
  {
    key: "cognitive",
    title: "인지 기능",
    subtitle: "최근 한 달 사이에 아래와 같은 모습이 있었나요?",
    scale: "yesno",
    weight: 0.2,
    items: [
      { id: "c1", label: "방금 있었던 일을 기억하지 못하세요" },
      { id: "c2", label: "오늘이 며칠인지 모르세요" },
      { id: "c3", label: "지금 계신 장소를 모르세요" },
      { id: "c4", label: "나이나 생년월일을 모르세요" },
      { id: "c5", label: "간단한 부탁을 이해하지 못하세요" },
      { id: "c6", label: "상황을 판단하는 힘이 떨어지셨어요" },
      { id: "c7", label: "하고 싶은 말을 전달하기 어려워하세요" },
    ],
  },
  {
    key: "behavior",
    title: "행동 변화",
    subtitle: "돌보시는 데 어려움을 주는 행동이 있는지 알려주세요.",
    scale: "yesno",
    weight: 0.15,
    items: [
      { id: "b1", label: "사실이 아닌 것을 사실로 믿으세요" },
      { id: "b2", label: "없는 것을 보거나 들으신다고 해요" },
      { id: "b3", label: "슬퍼하거나 서럽게 우세요" },
      { id: "b4", label: "밤에 잠을 못 주무시고 뒤척이세요" },
      { id: "b5", label: "도와드리려 하면 저항하세요" },
      { id: "b6", label: "길을 잃거나 헤매신 적이 있어요" },
      { id: "b7", label: "화를 내거나 위협하는 말을 하세요" },
      { id: "b8", label: "자꾸 밖으로 나가려고 하세요" },
      { id: "b9", label: "물건을 부수거나 던지세요" },
      { id: "b10", label: "같은 행동을 의미 없이 반복하세요" },
      { id: "b11", label: "돈이나 물건을 감추세요" },
      { id: "b12", label: "상황에 맞지 않는 옷을 입으세요" },
      { id: "b13", label: "대소변을 만지거나 옷에 묻히세요" },
      { id: "b14", label: "집 안을 계속 서성이세요" },
    ],
  },
  {
    key: "nursing",
    title: "의료·간호 처치",
    subtitle: "현재 받고 계신 처치가 있다면 알려주세요.",
    scale: "yesno",
    weight: 0.15,
    items: [
      { id: "n1", label: "기관지 절개관을 하고 계세요" },
      { id: "n2", label: "가래 흡인(석션)이 필요하세요" },
      { id: "n3", label: "산소 치료를 받고 계세요" },
      { id: "n4", label: "욕창 치료를 받고 계세요" },
      { id: "n5", label: "콧줄·위루관으로 영양을 공급받으세요" },
      { id: "n6", label: "암으로 인한 통증 관리를 받고 계세요" },
      { id: "n7", label: "소변줄을 사용하고 계세요" },
      { id: "n8", label: "장루(인공항문)를 사용하고 계세요" },
      { id: "n9", label: "투석을 받고 계세요" },
    ],
  },
  {
    key: "rehab",
    title: "재활·관절",
    subtitle: "팔다리 움직임과 관절 상태를 알려주세요.",
    scale: "motion",
    weight: 0.1,
    items: [
      { id: "r1", label: "오른팔 움직이기" },
      { id: "r2", label: "왼팔 움직이기" },
      { id: "r3", label: "오른다리 움직이기" },
      { id: "r4", label: "왼다리 움직이기" },
      { id: "r5", label: "어깨 관절" },
      { id: "r6", label: "팔꿈치 관절" },
      { id: "r7", label: "손목·손가락 관절" },
      { id: "r8", label: "고관절(엉덩이)" },
      { id: "r9", label: "무릎 관절" },
      { id: "r10", label: "발목 관절" },
    ],
  },
];

export const TOTAL_ITEMS = TEST_AREAS.reduce((sum, a) => sum + a.items.length, 0);

export type Answers = Record<string, number>;

export interface AreaScore {
  key: AreaKey;
  title: string;
  /** 0~100, 높을수록 도움이 많이 필요함 */
  percent: number;
}

export interface TestResult {
  /** 0~100 종합 지표 */
  score: number;
  areaScores: AreaScore[];
  band: GradeBand;
  hasDementiaSigns: boolean;
  /** 도움이 가장 많이 필요한 영역 (상위 2개) */
  topNeeds: AreaScore[];
}

export interface GradeBand {
  id: string;
  label: string;
  summary: string;
  detail: string;
  tone: "high" | "mid" | "low" | "none";
  /** 이 구간에서 주로 이용하는 서비스 */
  services: string[];
}

// 공단이 안내하는 등급별 상태 설명을 우리 문장으로 풀어 쓴 것.
// 점수 구간은 참고용 추정이며, 실제 인정점수 산정식과는 다르다.
export const GRADE_BANDS: GradeBand[] = [
  {
    id: "1",
    label: "1등급이 예상돼요",
    summary: "일상생활 대부분에서 다른 분의 도움이 필요한 상태로 보여요.",
    detail:
      "거의 누워 지내시거나 모든 일상 동작에 도움이 필요한 경우예요. 시설 입소와 24시간 돌봄을 함께 검토해보시는 것을 권해요.",
    tone: "high",
    services: ["요양원 입소", "24시간 방문요양", "요양병원"],
  },
  {
    id: "2",
    label: "2등급이 예상돼요",
    summary: "일상생활 상당 부분에서 도움이 필요한 상태로 보여요.",
    detail:
      "혼자 움직이기 어려워 대부분의 활동에 도움이 필요한 경우예요. 요양원 입소가 가능하고, 자택에서는 방문요양을 길게 이용하시는 편이에요.",
    tone: "high",
    services: ["요양원 입소", "방문요양", "주야간보호"],
  },
  {
    id: "3",
    label: "3등급이 예상돼요",
    summary: "부분적으로 도움이 필요한 상태로 보여요.",
    detail:
      "일부 동작은 혼자 하시지만 여러 활동에서 도움이 필요한 경우예요. 재가급여(방문요양·주야간보호)를 주로 이용하시고, 조건에 따라 시설 입소도 가능해요.",
    tone: "mid",
    services: ["방문요양", "주야간보호", "단기보호"],
  },
  {
    id: "4",
    label: "4등급이 예상돼요",
    summary: "일정 부분 도움이 필요한 상태로 보여요.",
    detail:
      "많은 일상 동작은 스스로 하시지만 거들어드릴 부분이 있는 경우예요. 방문요양·주야간보호로 낮 시간을 채우는 방식이 잘 맞아요.",
    tone: "mid",
    services: ["방문요양", "주야간보호", "복지용구"],
  },
  {
    id: "5",
    label: "5등급(치매 특별등급)이 예상돼요",
    summary: "신체 기능은 비교적 유지되지만 인지 저하가 두드러져요.",
    detail:
      "치매 진단이 확인된 경우에 받을 수 있는 등급이에요. 인지 자극 프로그램이 있는 주야간보호센터를 함께 알아보시면 좋아요.",
    tone: "low",
    services: ["주야간보호(치매전담)", "방문요양", "치매가족휴가제"],
  },
  {
    id: "cognitive",
    label: "인지지원등급이 예상돼요",
    summary: "신체 기능은 대체로 괜찮지만 기억력 저하가 보여요.",
    detail:
      "치매 진단을 받으셨다면 인지지원등급 대상이 될 수 있어요. 주야간보호 중심으로 이용하며 상태를 살펴보는 단계예요.",
    tone: "low",
    services: ["주야간보호(치매전담)", "치매안심센터 연계"],
  },
  {
    id: "none",
    label: "등급 판정이 어려울 수 있어요",
    summary: "지금은 일상생활을 대체로 혼자 하시는 것으로 보여요.",
    detail:
      "현재 상태로는 등급이 나오지 않을 가능성이 있어요. 다만 상태는 달라질 수 있으니, 걱정되는 부분이 생기면 다시 확인해보세요.",
    tone: "none",
    services: ["지역 치매안심센터 상담", "노인맞춤돌봄서비스"],
  },
];

function bandById(id: string) {
  return GRADE_BANDS.find((b) => b.id === id)!;
}

export function calculateResult(answers: Answers): TestResult {
  const areaScores: AreaScore[] = TEST_AREAS.map((area) => {
    const maxPerItem = area.scale === "yesno" ? 2 : 2;
    const max = area.items.length * maxPerItem;
    const got = area.items.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0);
    return {
      key: area.key,
      title: area.title,
      percent: max === 0 ? 0 : Math.round((got / max) * 100),
    };
  });

  const score = Math.round(
    TEST_AREAS.reduce((sum, area) => {
      const s = areaScores.find((a) => a.key === area.key)!;
      return sum + s.percent * area.weight;
    }, 0)
  );

  const cognitive = areaScores.find((a) => a.key === "cognitive")!.percent;
  const physical = areaScores.find((a) => a.key === "physical")!.percent;
  // 인지 저하는 뚜렷한데 신체 기능은 유지되는 경우가 치매 특별등급(5등급·인지지원)의 전형이다.
  const hasDementiaSigns = cognitive >= 30 && physical < 40;

  let band: GradeBand;
  if (hasDementiaSigns) {
    band = cognitive >= 55 ? bandById("5") : bandById("cognitive");
  } else if (score >= 70) band = bandById("1");
  else if (score >= 52) band = bandById("2");
  else if (score >= 36) band = bandById("3");
  else if (score >= 17) band = bandById("4");
  else if (cognitive >= 25) band = bandById("5");
  else band = bandById("none");

  const topNeeds = [...areaScores].sort((a, b) => b.percent - a.percent).slice(0, 2);

  return { score, areaScores, band, hasDementiaSigns, topNeeds };
}

// 결과 화면에서 안내할 신청 절차 (공단 공식 절차를 우리 문장으로 정리)
export const APPLY_STEPS = [
  {
    title: "인정 신청",
    desc: "공단 지사에 방문하거나 노인장기요양보험 홈페이지·앱으로 신청해요. 본인이나 가족이 대신 신청할 수 있어요.",
  },
  {
    title: "방문 조사",
    desc: "공단 직원이 댁으로 찾아와 오늘 답하신 것과 같은 항목을 직접 확인해요.",
  },
  {
    title: "의사소견서 제출",
    desc: "다니시는 병원에서 의사소견서를 발급받아 제출해요. 공단에서 발급 의뢰서를 보내드려요.",
  },
  {
    title: "등급판정위원회 심의",
    desc: "조사 결과와 소견서를 함께 검토해 등급을 결정해요. 신청일로부터 보통 30일 안에 나와요.",
  },
  {
    title: "인정서 수령 후 이용",
    desc: "장기요양인정서와 표준장기요양이용계획서를 받으면 원하는 기관과 계약하고 서비스를 시작해요.",
  },
];
