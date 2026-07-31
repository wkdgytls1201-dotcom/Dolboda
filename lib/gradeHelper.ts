// AI 장기요양등급 도우미 — 공단 인정조사 52항목을 13~14문항 버튼형 스크리닝으로 축약한 버전.
//
// 구조 원칙:
// - 대화 진행과 등급 추정은 전부 이 파일의 상태 머신·코드가 통제한다.
//   LLM에 등급 계산을 맡기면 "2등급입니다"처럼 단정하는 환각 사고가 나기 때문.
// - LLM은 결과 설명 문장 생성에만 쓰고(세션당 최대 1회), 없으면 규칙 기반 문장으로 대체한다.
// - 결과는 항상 범위("2~3등급이 예상돼요")로만 출력한다. 스크리닝 축약판의 정확도 한계 때문.

export interface HelperOption {
  label: string;
  score: number;
}

export interface HelperQuestion {
  id: string;
  /** 챗봇 말풍선에 뜨는 질문 */
  ask: string;
  options: HelperOption[];
  /** 신체 40 / 인지 20 / 행동 15 / 간호 15 / 재활 10 가중과 정합되는 영역 */
  area: "physical" | "cognitive" | "behavior" | "nursing" | "rehab" | "screen";
  /** 이 답변들을 골랐을 때만 노출 (조건부 분기) */
  showIf?: (answers: HelperAnswers) => boolean;
}

export type HelperAnswers = Record<string, number>;

export const HELPER_QUESTIONS: HelperQuestion[] = [
  {
    id: "eligible",
    area: "screen",
    ask: "안녕하세요 👋 돌보다 AI등급 도우미예요. 몇 가지만 여쭤보고 예상 등급 범위를 알려드릴게요.\n\n연세가 어떻게 되세요?",
    options: [
      { label: "만 65세 이상이세요", score: 0 },
      { label: "65세 미만이지만 치매·뇌혈관질환 등이 있으세요", score: 0 },
      { label: "65세 미만이고 노인성 질병은 없으세요", score: -1 },
    ],
  },
  {
    id: "meal",
    area: "physical",
    ask: "🍚 식사는 어떻게 하고 계세요?",
    options: [
      { label: "혼자 드실 수 있어요", score: 0 },
      { label: "차려드리거나 조금 도와드려요", score: 1 },
      { label: "떠먹여 드려야 해요", score: 2 },
    ],
  },
  {
    id: "dress",
    area: "physical",
    ask: "🧼 옷 갈아입기나 세수·양치는요?",
    options: [
      { label: "혼자 하실 수 있어요", score: 0 },
      { label: "옆에서 거들어드려요", score: 1 },
      { label: "처음부터 끝까지 도와드려요", score: 2 },
    ],
  },
  {
    id: "bath",
    area: "physical",
    ask: "🛁 목욕은 어떠세요?",
    options: [
      { label: "혼자 하실 수 있어요", score: 0 },
      { label: "일부만 도와드려요", score: 1 },
      { label: "전적으로 도와드려야 해요", score: 2 },
    ],
  },
  {
    id: "toilet",
    area: "physical",
    ask: "🚻 화장실 사용과 대소변은요?",
    options: [
      { label: "혼자 하실 수 있어요", score: 0 },
      { label: "부축하거나 뒤처리를 도와드려요", score: 1 },
      { label: "기저귀를 쓰시거나 거의 다 도와드려요", score: 2 },
    ],
  },
  {
    id: "walk",
    area: "physical",
    ask: "🚶 걷기나 방 밖으로 나가는 건 어떠세요?",
    options: [
      { label: "혼자 다니실 수 있어요", score: 0 },
      { label: "지팡이·보행기나 부축이 필요해요", score: 1 },
      { label: "거의 누워 지내세요", score: 2 },
    ],
  },
  {
    id: "posture",
    area: "physical",
    ask: "🛏️ 눕고 일어나거나 앉는 자세 바꾸기는요?",
    options: [
      { label: "혼자 하실 수 있어요", score: 0 },
      { label: "조금 도와드리면 돼요", score: 1 },
      { label: "돌려 눕혀드려야 해요", score: 2 },
    ],
  },
  {
    id: "memory",
    area: "cognitive",
    ask: "🧠 기억력은 어떠세요? 오늘 날짜나 방금 있었던 일 같은 것들요.",
    options: [
      { label: "괜찮으세요", score: 0 },
      { label: "가끔 헷갈려 하세요", score: 1 },
      { label: "자주 모르시거나 기억을 못 하세요", score: 2 },
    ],
  },
  {
    id: "judgement",
    area: "cognitive",
    ask: "💬 대화나 상황 판단은요?",
    options: [
      { label: "잘 통해요", score: 0 },
      { label: "가끔 어긋나요", score: 1 },
      { label: "의사소통이 많이 어려워요", score: 2 },
    ],
  },
  {
    id: "behavior",
    area: "behavior",
    ask: "😥 혹시 돌보기 힘든 행동이 있으세요? 배회, 화내기, 도움 거부 같은 것들요.",
    showIf: (a) => (a.memory ?? 0) + (a.judgement ?? 0) > 0,
    options: [
      { label: "없어요", score: 0 },
      { label: "가끔 있어요", score: 1 },
      { label: "거의 매일 있어요", score: 2 },
    ],
  },
  {
    id: "nursing",
    area: "nursing",
    ask: "💉 받고 계신 의료 처치가 있나요? 콧줄(경관영양), 가래 흡인, 욕창 치료, 소변줄, 산소 치료 같은 것들요.",
    options: [
      { label: "없어요", score: 0 },
      { label: "한 가지 있어요", score: 1 },
      { label: "두 가지 이상이에요", score: 2 },
    ],
  },
  {
    id: "rehab",
    area: "rehab",
    ask: "🦵 팔다리 마비나 관절이 굳은 곳이 있으세요?",
    options: [
      { label: "없어요", score: 0 },
      { label: "한쪽에 있거나 조금 불편하세요", score: 1 },
      { label: "양쪽 모두 움직이기 어려우세요", score: 2 },
    ],
  },
  {
    id: "careTime",
    area: "physical",
    ask: "⏰ 하루 중 돌봄이 필요한 시간은 어느 정도인가요?",
    options: [
      { label: "잠깐씩만 봐드리면 돼요", score: 0 },
      { label: "낮 시간 대부분 곁에 있어야 해요", score: 1 },
      { label: "밤에도 돌봐드려야 해요 (24시간)", score: 2 },
    ],
  },
  {
    id: "dementia",
    area: "screen",
    ask: "🏁 마지막 질문이에요. 치매 진단을 받으신 적이 있나요?",
    options: [
      { label: "진단을 받으셨어요", score: 2 },
      { label: "의심되지만 검사는 아직이에요", score: 1 },
      { label: "아니요", score: 0 },
    ],
  },
];

export function visibleQuestions(answers: HelperAnswers): HelperQuestion[] {
  return HELPER_QUESTIONS.filter((q) => !q.showIf || q.showIf(answers));
}

export interface HelperResult {
  /** 신청 대상이 아닌 경우 */
  ineligible: boolean;
  /** 예: "2~3등급" / "5등급 또는 인지지원등급" / null(등급 판정이 어려움) */
  rangeLabel: string | null;
  /** 범위에 걸친 등급 id 목록 (GRADE_BANDS 참조용) */
  bandIds: string[];
  score: number;
  areaPercents: { area: string; label: string; percent: number }[];
  /** LLM 미사용 시 보여줄 규칙 기반 설명 */
  fallbackExplanation: string;
  /** LLM 프롬프트에 넣을 요약 (개인정보 없음) */
  summaryForLlm: string;
}

const AREA_LABEL: Record<string, string> = {
  physical: "신체 기능",
  cognitive: "인지 기능",
  behavior: "행동 변화",
  nursing: "의료·간호 처치",
  rehab: "재활·관절",
};

const AREA_WEIGHT: Record<string, number> = {
  physical: 0.4,
  cognitive: 0.2,
  behavior: 0.15,
  nursing: 0.15,
  rehab: 0.1,
};

function scoreToGrade(score: number): number | null {
  if (score >= 70) return 1;
  if (score >= 52) return 2;
  if (score >= 36) return 3;
  if (score >= 17) return 4;
  return null; // 등급 판정이 어려운 구간
}

export function calcHelperResult(answers: HelperAnswers): HelperResult {
  if (answers.eligible === -1) {
    return {
      ineligible: true,
      rangeLabel: null,
      bandIds: [],
      score: 0,
      areaPercents: [],
      fallbackExplanation:
        "장기요양보험은 만 65세 이상이거나, 65세 미만이라도 치매·뇌혈관질환 같은 노인성 질병이 있는 분이 신청할 수 있어요. 지금은 신청 대상이 아닐 가능성이 높지만, 건강 상태가 달라지면 언제든 다시 확인해 보세요.",
      summaryForLlm: "",
    };
  }

  const byArea: Record<string, { got: number; max: number }> = {};
  for (const q of visibleQuestions(answers)) {
    if (q.area === "screen") continue;
    const slot = (byArea[q.area] ??= { got: 0, max: 0 });
    slot.got += answers[q.id] ?? 0;
    slot.max += 2;
  }

  const areaPercents = Object.entries(byArea).map(([area, v]) => ({
    area,
    label: AREA_LABEL[area],
    percent: v.max === 0 ? 0 : Math.round((v.got / v.max) * 100),
  }));

  const score = Math.round(
    areaPercents.reduce((sum, a) => sum + a.percent * (AREA_WEIGHT[a.area] ?? 0), 0)
  );

  const cognitive = areaPercents.find((a) => a.area === "cognitive")?.percent ?? 0;
  const physical = areaPercents.find((a) => a.area === "physical")?.percent ?? 0;
  const dementia = answers.dementia ?? 0;

  // 신체는 비교적 유지되는데 인지 저하가 두드러지면 치매 특별등급 경로
  if (dementia >= 1 && cognitive >= 30 && physical < 40) {
    const rangeLabel = "5등급 또는 인지지원등급";
    return {
      ineligible: false,
      rangeLabel,
      bandIds: ["5", "cognitive"],
      score,
      areaPercents,
      fallbackExplanation:
        "신체 기능은 비교적 유지되고 계시지만 인지 저하가 두드러져 보여요. 치매 진단이 확인되면 5등급이나 인지지원등급 대상이 될 수 있어요. 인지 자극 프로그램이 있는 주야간보호센터를 함께 알아보시면 좋아요.",
      summaryForLlm: buildSummary(answers, areaPercents, rangeLabel),
    };
  }

  const grade = scoreToGrade(score);
  if (grade == null) {
    // 등급이 어려운 구간 — 치매 의심이 있으면 인지지원 가능성만 언급
    const maybeCognitive = dementia >= 1 && cognitive >= 25;
    const rangeLabel = maybeCognitive ? "인지지원등급" : null;
    return {
      ineligible: false,
      rangeLabel,
      bandIds: maybeCognitive ? ["cognitive"] : ["none"],
      score,
      areaPercents,
      fallbackExplanation: maybeCognitive
        ? "일상생활은 대체로 혼자 하시는 것으로 보이지만, 기억력 저하가 있어 치매 진단을 받으시면 인지지원등급 대상이 될 수 있어요."
        : "지금 상태로는 등급이 나오지 않을 가능성이 있어요. 다만 상태는 달라질 수 있으니, 걱정되는 부분이 생기면 다시 확인해 보세요.",
      summaryForLlm: buildSummary(answers, areaPercents, rangeLabel ?? "등급 판정이 어려움"),
    };
  }

  // 스크리닝 축약판의 오차를 반영해 항상 인접 등급을 포함한 범위로 출력
  const scoreLo = score - 8;
  const scoreHi = score + 8;
  const gradeHi = scoreToGrade(scoreHi) ?? grade; // 숫자가 작을수록 높은 등급
  const gradeLo = scoreToGrade(scoreLo) ?? Math.min(grade + 1, 4);
  const hi = Math.min(gradeHi, gradeLo);
  const lo = Math.max(gradeHi, gradeLo);
  const rangeLabel = hi === lo ? `${hi}~${Math.min(lo + 1, 4)}등급` : `${hi}~${lo}등급`;
  const bandIds = hi === lo ? [String(hi), String(Math.min(lo + 1, 4))] : [String(hi), String(lo)];

  const topNeeds = [...areaPercents].sort((a, b) => b.percent - a.percent).slice(0, 2);
  return {
    ineligible: false,
    rangeLabel,
    bandIds,
    score,
    areaPercents,
    fallbackExplanation: `답변해주신 내용으로 보면 ${topNeeds
      .map((t) => t.label)
      .join("과 ")} 영역에서 도움이 가장 많이 필요해 보여요. 실제 등급은 공단 방문조사와 의사소견서를 바탕으로 등급판정위원회가 결정하니, 이 범위는 참고로만 봐주세요.`,
    summaryForLlm: buildSummary(answers, areaPercents, rangeLabel),
  };
}

function buildSummary(
  answers: HelperAnswers,
  areaPercents: { label: string; percent: number }[],
  rangeLabel: string
): string {
  const answered = visibleQuestions(answers)
    .filter((q) => q.area !== "screen" && answers[q.id] != null)
    .map((q) => `${q.id}:${answers[q.id]}`)
    .join(",");
  const areas = areaPercents.map((a) => `${a.label} ${a.percent}%`).join(", ");
  return `예상범위=${rangeLabel} / 영역별 도움필요도: ${areas} / 응답: ${answered}`;
}
