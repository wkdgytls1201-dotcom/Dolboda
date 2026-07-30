// 돌봄 요청 API(POST/PATCH)에서 공용으로 쓰는 입력 정리 유틸.

export type LocationType = "HOSPITAL" | "HOUSEKEEPING" | "HOME";

export function parseLocationType(v: unknown): LocationType | null {
  return v === "HOSPITAL" || v === "HOUSEKEEPING" || v === "HOME" ? v : null;
}

export function sanitizeTasks(v: unknown, max = 20, maxLen = 40): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim().slice(0, maxLen))
    .slice(0, max);
}

export function clampVisit(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= 1 && n <= max ? n : null;
}

export function cleanText(v: unknown, maxLen = 200): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, maxLen) : null;
}

/** "09:00" 형태만 허용 */
export function cleanTime(v: unknown): string | null {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null;
}

/** 보호자가 적은 희망 사례비 — 상식 범위를 벗어난 값은 버린다(원 단위) */
export function cleanBudget(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= 1000 && n <= 10_000_000 ? n : null;
}

/**
 * 요청 본문에서 돌봄 요청 필드를 뽑아 Prisma에 넣을 형태로 정리한다.
 * partial=true(PATCH)면 본문에 없는 키는 결과에서 빠져 기존 값이 유지된다.
 */
export function buildCareRequestData(body: Record<string, unknown>, partial: boolean) {
  const has = (k: string) => !partial || k in body;
  const data: Record<string, unknown> = {};

  const put = (key: string, value: unknown) => {
    if (has(key)) data[key] = value;
  };

  put("locationNote", cleanText(body.locationNote, 100));
  put("startTime", cleanTime(body.startTime));
  put("endTime", cleanTime(body.endTime));
  put("roundTheClock", body.roundTheClock === true);

  put("recipientName", cleanText(body.recipientName, 20));
  put("recipientRelation", cleanText(body.recipientRelation, 20));
  put("recipientGender", cleanText(body.recipientGender, 10));
  put("recipientAgeBand", cleanText(body.recipientAgeBand, 20));
  put("recipientWeightBand", cleanText(body.recipientWeightBand, 20));

  put("situation", cleanText(body.situation, 1000));
  put("mobilityLevel", cleanText(body.mobilityLevel, 40));
  put("mealAssistLevel", cleanText(body.mealAssistLevel, 40));
  put("toiletAssistLevel", cleanText(body.toiletAssistLevel, 40));
  put("conditions", sanitizeTasks(body.conditions));
  put("householdTasks", sanitizeTasks(body.householdTasks));
  put("visitsPerWeek", clampVisit(body.visitsPerWeek, 7));
  put("visitHours", clampVisit(body.visitHours, 24));

  put("hospitalEntry", cleanText(body.hospitalEntry, 40));
  put("roomType", cleanText(body.roomType, 40));
  put("admissionReason", cleanText(body.admissionReason, 40));
  put("surgeryPlan", cleanText(body.surgeryPlan, 20));

  put("sitterGenderPref", cleanText(body.sitterGenderPref, 10) ?? "무관");
  put("specialRequests", sanitizeTasks(body.specialRequests, 10, 60));
  put("requestNote", cleanText(body.requestNote, 1000));

  put("budgetAmount", cleanBudget(body.budgetAmount));
  put("budgetUnit", body.budgetUnit === "시간" ? "시간" : body.budgetUnit === "일" ? "일" : null);

  // 구버전 요약 플래그도 함께 맞춰둔다(기존 화면/확인서 호환).
  if (has("mealAssistLevel")) {
    const lv = cleanText(body.mealAssistLevel, 40);
    data.needsMealAssist = Boolean(lv && lv !== "스스로 하실 수 있어요");
  }
  if (has("toiletAssistLevel")) {
    const lv = cleanText(body.toiletAssistLevel, 40);
    data.needsToiletAssist = Boolean(lv && lv !== "스스로 하실 수 있어요");
  }

  return data;
}
