// 돌봄 요청서에서 고르는 선택지 모음.
// 케어닥이 여러 화면에 나눠 받는 항목들을 성격별로 묶어 한 화면에서 고르게 했다.

export const RECIPIENT_RELATIONS = [
  "부모님",
  "조부모님",
  "배우자",
  "형제·자매",
  "본인",
  "친척·지인",
] as const;

export const RECIPIENT_GENDERS = ["여성", "남성"] as const;

export const AGE_BANDS = ["60대 이하", "70대", "80대", "90대 이상"] as const;

// 체중은 부축·체위 변경 난이도와 직결돼서 시터가 가장 궁금해하는 정보 중 하나.
export const WEIGHT_BANDS = [
  "50kg 미만",
  "50~60kg",
  "60~70kg",
  "70~80kg",
  "80kg 이상",
] as const;

export const MOBILITY_LEVELS = [
  "혼자 거동 가능",
  "지팡이·보행기 사용",
  "부축 필요",
  "휠체어 이용",
  "거의 누워 지냄",
] as const;

export const MEAL_ASSIST_LEVELS = [
  "스스로 하실 수 있어요",
  "곁에서 조금만 도우면 돼요",
  "직접 떠먹여 드려야 해요",
  "콧줄·위루관을 쓰고 계세요",
] as const;

export const TOILET_ASSIST_LEVELS = [
  "스스로 하실 수 있어요",
  "화장실까지 부축이 필요해요",
  "기저귀를 사용하세요",
  "소변줄을 쓰고 계세요",
] as const;

// 의료행위는 제공할 수 없으므로, 해당하면 안내 문구를 띄우는 용도로만 쓴다.
export const MEDICAL_ONLY_OPTIONS = ["콧줄·위루관을 쓰고 계세요", "소변줄을 쓰고 계세요"];

export const HOSPITAL_ENTRY_OPTIONS = [
  "출입 절차 없음",
  "병원 검사 필요",
  "문진표 작성",
  "감염병 음성확인서 필요",
] as const;

export const ROOM_TYPES = ["다인실", "2~3인실", "1인실", "무균실·격리실"] as const;

export const ADMISSION_REASONS = [
  "수술 후 회복",
  "만성질환 관리",
  "재활 치료",
  "낙상·골절",
  "인지저하 관리",
  "기타",
] as const;

export const SURGERY_PLANS = ["예정 없음", "수술 예정", "아직 미정"] as const;

export const CONDITION_SUGGESTIONS = [
  "치매·인지저하",
  "뇌졸중 후유증",
  "당뇨",
  "고혈압",
  "파킨슨병",
  "욕창 관리",
  "투석 중",
  "산소호흡기 사용",
] as const;

export const SPECIAL_REQUESTS = [
  "식사는 천천히 도와주세요",
  "응급 상황 시 바로 연락 주세요",
  "말동무가 되어 주세요",
  "낙상에 특히 주의해 주세요",
  "정해진 시간에 약을 챙겨주세요",
  "가벼운 산책을 함께해 주세요",
] as const;

export const GENDER_PREFS = ["무관", "여성", "남성"] as const;

export const BUDGET_UNITS = ["일", "시간"] as const;

// 하루 단위 시간 선택지 (30분 단위는 과해서 정시 기준으로만)
export const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

export function formatTimeRange(
  roundTheClock: boolean,
  startTime?: string | null,
  endTime?: string | null
): string | null {
  if (roundTheClock) return "24시간 상주";
  if (!startTime || !endTime) return null;
  return `${startTime} ~ ${endTime}`;
}

export function daysBetween(start: string | Date, end: string | Date): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}
