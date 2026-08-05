import type { LocationTypeValue } from "./careLocationTypes";

export interface Applicant {
  id: string;
  status: string;
  /** 역경매 — 매니저가 지원하며 제시한 사례비·한마디(선택) */
  proposedAmount: number | null;
  proposedUnit: string | null;
  message: string | null;
  sitterProfile: {
    id: string;
    nickname: string;
    experienceYears: number;
    intro: string | null;
    gender: string | null;
    ageBand: string | null;
    certifications: { id: string; name: string }[];
  };
  /** 돌보다 안에서 쌓인 실적 — 자기 신고 경력과 달리 플랫폼이 보증하는 숫자 */
  stats?: {
    completedCount: number;
    reviewCount: number;
    avgRating: number | null;
    /** 돌봄일지를 기록한 날 수(원본 기준) — 성실함의 신호 */
    logDayCount: number;
  };
}

// 돌봄 요청 한 건 — API 응답과 화면이 함께 쓰는 형태.
export interface CareRequestData {
  id: string;
  status: "OPEN" | "MATCHED" | "CANCELLED" | "COMPLETED";
  locationType: LocationTypeValue;
  region: string;
  locationNote: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  roundTheClock: boolean;

  recipientName: string | null;
  recipientRelation: string | null;
  recipientGender: string | null;
  recipientAgeBand: string | null;
  recipientWeightBand: string | null;

  situation: string | null;
  mobilityLevel: string | null;
  mealAssistLevel: string | null;
  toiletAssistLevel: string | null;
  conditions: string[];
  householdTasks: string[];
  visitsPerWeek: number | null;
  visitHours: number | null;

  hospitalEntry: string | null;
  roomType: string | null;
  admissionReason: string | null;
  surgeryPlan: string | null;

  sitterGenderPref: string;
  specialRequests: string[];
  requestNote: string | null;
  budgetAmount: number | null;
  budgetUnit: string | null;

  applications: Applicant[];
  /** 완료된 돌봄에 남긴 후기 — 없으면 완료 직후 화면에서 작성을 권한다 */
  review?: { id: string; rating: number } | null;
}

export const EMPTY_FORM = {
  locationType: null as LocationTypeValue | null,
  region: "",
  locationNote: "",
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "18:00",
  roundTheClock: false,
  recipientName: "",
  recipientRelation: "",
  recipientGender: "",
  recipientAgeBand: "",
  recipientWeightBand: "",
  situation: "",
  mobilityLevel: "",
  mealAssistLevel: "",
  toiletAssistLevel: "",
  conditions: [] as string[],
  householdTasks: [] as string[],
  visitsPerWeek: null as number | null,
  visitHours: null as number | null,
  hospitalEntry: "",
  roomType: "",
  admissionReason: "",
  surgeryPlan: "",
  sitterGenderPref: "무관",
  specialRequests: [] as string[],
  requestNote: "",
  budgetAmount: "" as string,
  budgetUnit: "일",
};

export type CareRequestForm = typeof EMPTY_FORM;

/** "같은 조건으로 다시 요청" — 지난 요청을 새 요청의 초안으로. 날짜만 비워 다시 고르게 한다. */
export function formFromTemplate(r: CareRequestData): CareRequestForm {
  return { ...formFromRequest(r), startDate: "", endDate: "" };
}

export function formFromRequest(r: CareRequestData): CareRequestForm {
  return {
    locationType: r.locationType,
    region: r.region,
    locationNote: r.locationNote ?? "",
    startDate: r.startDate.slice(0, 10),
    endDate: r.endDate.slice(0, 10),
    startTime: r.startTime ?? "09:00",
    endTime: r.endTime ?? "18:00",
    roundTheClock: r.roundTheClock,
    recipientName: r.recipientName ?? "",
    recipientRelation: r.recipientRelation ?? "",
    recipientGender: r.recipientGender ?? "",
    recipientAgeBand: r.recipientAgeBand ?? "",
    recipientWeightBand: r.recipientWeightBand ?? "",
    situation: r.situation ?? "",
    mobilityLevel: r.mobilityLevel ?? "",
    mealAssistLevel: r.mealAssistLevel ?? "",
    toiletAssistLevel: r.toiletAssistLevel ?? "",
    conditions: r.conditions,
    householdTasks: r.householdTasks,
    visitsPerWeek: r.visitsPerWeek,
    visitHours: r.visitHours,
    hospitalEntry: r.hospitalEntry ?? "",
    roomType: r.roomType ?? "",
    admissionReason: r.admissionReason ?? "",
    surgeryPlan: r.surgeryPlan ?? "",
    sitterGenderPref: r.sitterGenderPref,
    specialRequests: r.specialRequests,
    requestNote: r.requestNote ?? "",
    budgetAmount: r.budgetAmount ? String(r.budgetAmount) : "",
    budgetUnit: r.budgetUnit ?? "일",
  };
}
