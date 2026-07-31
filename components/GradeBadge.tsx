import { Crown } from "lucide-react";
import { FacilityType } from "@/lib/types";

const TYPE_BADGE_STYLE: Record<FacilityType, string> = {
  NURSING_HOSPITAL: "bg-primary-100 text-primary-700",
  NURSING_HOME: "bg-mint-100 text-mint-700",
  DAY_NIGHT_CARE: "bg-mint-100 text-mint-700",
  HOME_CARE: "bg-mint-100 text-mint-700",
  SILVER_TOWN: "bg-accent-100 text-accent-600",
};

export function TypeBadge({ type, label }: { type: FacilityType; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGE_STYLE[type]}`}
    >
      {label}
    </span>
  );
}

export const NHIS_GRADE_LETTER = ["A", "B", "C", "D", "E"];

export function GradeBadge({
  grade,
  gradeSource,
}: {
  grade: number | null;
  gradeSource?: "HIRA" | "NHIS";
}) {
  if (grade === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
        등급 제외
      </span>
    );
  }

  const isTop = grade === 1;
  const style = isTop
    ? "bg-primary-500 text-white shadow-sm"
    : grade === 2
    ? "bg-accent-400 text-ink-900"
    : grade === 3
    ? "bg-mint-500 text-white"
    : "bg-ink-100 text-ink-500";

  // NHIS(요양원 등)는 공단이 실제로 A~E 알파벳 등급을 공개함 — 1~5 숫자는 심평원(HIRA) 표기
  const label =
    gradeSource === "NHIS" ? `${NHIS_GRADE_LETTER[grade - 1] ?? grade}등급` : `${grade}등급`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${style}`}
    >
      {isTop && <Crown size={12} fill="currentColor" />}
      {label}
    </span>
  );
}
