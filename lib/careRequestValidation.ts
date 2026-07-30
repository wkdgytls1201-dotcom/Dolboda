// 돌봄 요청 API(POST/PATCH)에서 공용으로 쓰는 입력 정리 유틸.

export function parseLocationType(v: unknown): "HOSPITAL" | "HOUSEKEEPING" | "HOME" | null {
  return v === "HOSPITAL" || v === "HOUSEKEEPING" || v === "HOME" ? v : null;
}

export function sanitizeTasks(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim().slice(0, 40))
    .slice(0, 20);
}

export function clampVisit(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= 1 && n <= max ? n : null;
}
