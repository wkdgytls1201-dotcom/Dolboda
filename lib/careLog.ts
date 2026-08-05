// 돌봄일지 — 매니저와 보호자가 서로 확인하는 하루 기록. 설계: docs/care-log-spec.md
//
// 진입 경로는 /care-request/agreement·/care-request/confirmation과 같은 방식이다 —
// 이 앱은 아직 "지금 진행 중인 돌봄 요청 하나"를 기준으로 화면이 짜여 있어(가장 최근
// 확정된 건), 여기서도 URL에 careRequestId를 박지 않고 세션에서 역할·대상을 찾는다.

export const MEAL_OPTIONS = ["잘 드심", "조금 드심", "거의 못 드심"] as const;
export const MOOD_OPTIONS = ["좋으심", "평소 같으심", "힘들어하심"] as const;
export const DAY_STATUS_OPTIONS = ["별일 없었어요", "알려드릴 일이 있어요"] as const;
export const SLEEP_OPTIONS = ["잘 주무심", "뒤척이심", "거의 못 주무심"] as const;
export const BOWEL_OPTIONS = ["정상", "변비", "설사", "실금"] as const;
export const MEDICATION_OPTIONS = ["복용함", "거르심", "해당 없음"] as const;

/** 빠른 알림 버튼 종류 — kind가 "custom"이면 body에 자유 입력 내용이 들어간다 */
export const QUICK_NOTE_KINDS = [
  { kind: "meal", label: "식사 하셨어요", emoji: "🍚", message: "방금 식사하셨어요" },
  { kind: "medication", label: "약 드셨어요", emoji: "💊", message: "약 드셨어요" },
  { kind: "walk", label: "산책 다녀왔어요", emoji: "🚶", message: "산책 다녀오셨어요" },
  { kind: "hospital", label: "병원 도착했어요", emoji: "🏥", message: "병원 도착했어요" },
  { kind: "sleep", label: "주무세요", emoji: "😴", message: "지금 주무세요" },
] as const;
export type QuickNoteKind = (typeof QUICK_NOTE_KINDS)[number]["kind"] | "custom";

/** 같은 버튼 재전송 제한 — 실수로 여러 번 눌러 보호자를 놀라게 하지 않는다 */
export const QUICK_NOTE_COOLDOWN_MS = 30 * 60 * 1000;
/** 오발송 취소 허용 시간 */
export const QUICK_NOTE_CANCEL_WINDOW_MS = 60 * 1000;

/** 오늘 KST 날짜 (YYYY-MM-DD) */
export function todayKst(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/** Date → KST 날짜 문자열. careDate가 문자열이라 비교하려면 같은 표기로 맞춰야 한다. */
export function toKstDate(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/** 돌봄이 끝난 뒤 일지를 채울 수 있는 유예 (2026-08-06 사용자 결정).
 *  "어제 것을 오늘 쓰는" 정당한 지각 작성은 살리고, 몇 달 뒤 기록 생성은 막는다. */
export const CARE_LOG_GRACE_DAYS = 7;

/** n일 뒤/전 KST 날짜 */
function shiftKst(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export interface CareLogWindow {
  /** 기록 가능한 가장 이른 날 = 돌봄 시작일 */
  min: string;
  /** 기록 가능한 가장 늦은 날 = 돌봄 종료일과 오늘 중 이른 쪽 */
  max: string;
  /** 이 날짜를 지나면 새 기록 자체를 받지 않는다(종료일 + 유예) */
  closesAfter: string;
  /** 지금 기록을 받을 수 있는 상태인가 */
  open: boolean;
  /** 못 받는 이유 — 화면에 그대로 보여줄 수 있는 문장 */
  reason: string | null;
}

/**
 * 일지를 쓸 수 있는 날짜 창을 계산한다.
 *
 * 왜 필요한가: 지금까지 가드는 "미래 날짜 금지" 하나뿐이라, 돌봄이 시작도 안 한
 * 날짜나 이미 끝난 기간 밖 날짜로 기록이 남을 수 있었다(2026-08-06 실측 4건).
 * 일지는 "그날 무슨 일이 있었나"의 기록이므로 돌봄 기간 밖의 날은 뜻이 없다.
 */
export function careLogWindow(
  request: { startDate: Date; endDate: Date },
  today = todayKst()
): CareLogWindow {
  const start = toKstDate(request.startDate);
  const end = toKstDate(request.endDate);
  const closesAfter = shiftKst(end, CARE_LOG_GRACE_DAYS);
  const max = today < end ? today : end;

  if (today < start) {
    return { min: start, max, closesAfter, open: false, reason: "돌봄 시작 전이라 아직 기록할 수 없어요." };
  }
  if (today > closesAfter) {
    return {
      min: start,
      max,
      closesAfter,
      open: false,
      reason: `돌봄이 끝난 지 ${CARE_LOG_GRACE_DAYS}일이 지나 기록을 마감했어요. 지난 기록은 계속 보실 수 있어요.`,
    };
  }
  return { min: start, max, closesAfter, open: true, reason: null };
}

/** careDate가 창 안에 있는지 — 벗어나면 화면에 쓸 문장을 돌려준다 */
export function careDateError(careDate: string, w: CareLogWindow): string | null {
  if (!w.open) return w.reason;
  if (careDate < w.min) return `돌봄 시작일(${w.min}) 이전은 기록할 수 없어요.`;
  if (careDate > w.max) {
    return careDate > todayKst()
      ? "미래 날짜는 기록할 수 없어요."
      : `돌봄 종료일(${w.max}) 이후는 기록할 수 없어요.`;
  }
  return null;
}

/**
 * 돌봄 요청의 업무 범위에서 "오늘 한 일" 칩 목록을 만든다. 그 돌봄에 없는 항목은
 * 안 보이게 한다(방문요양인데 "병원 동행" 칩이 뜨면 방해만 된다).
 */
export function taskChipsFor(request: {
  locationType: string;
  householdTasks: string[];
}): string[] {
  const chips = ["세면", "말벗"];
  if (request.locationType === "HOSPITAL") chips.push("병원 동행");
  if (request.locationType !== "HOSPITAL") chips.push("산책");
  for (const t of request.householdTasks) {
    // "세면·위생 보조" 같은 긴 항목명 대신 짧은 칩 이름으로
    if (t.includes("식사")) chips.push("식사 준비");
    else if (t.includes("빨래")) chips.push("빨래");
    else if (t.includes("청소") || t.includes("정리")) chips.push("집안 정리");
  }
  return Array.from(new Set(chips));
}

/** 작성 시각이 대상 날짜보다 며칠 늦었는지 — 화면에 "N일 늦게 작성됨"으로 보여주기 위함 */
export function daysLate(careDate: string, createdAt: Date): number {
  const created = createdAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const diffMs = new Date(created).getTime() - new Date(careDate).getTime();
  return Math.max(0, Math.round(diffMs / 86_400_000));
}
