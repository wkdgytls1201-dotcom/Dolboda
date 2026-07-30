import { FacilityType } from "@/lib/types";

// 실제 시설 사진이 없는 곳(dataSource: "public")에 쓰는 사람 없는 플랫 일러스트.
// 특정 실제 건물을 묘사하지 않는 추상적인 그림이라 "이 시설의 실제 모습"으로 오인될 위험이 없다.
const THEME: Record<FacilityType, { bg: string; bg2: string; building: string; roof: string; accent: string }> = {
  NURSING_HOSPITAL: {
    bg: "#FFF3F1",
    bg2: "#FFE2DD",
    building: "#FFFFFF",
    roof: "#EB4632",
    accent: "#EB4632",
  },
  NURSING_HOME: {
    bg: "#ECFDF9",
    bg2: "#D2FBF1",
    building: "#FFFFFF",
    roof: "#2DD4BF",
    accent: "#2DD4BF",
  },
  DAY_NIGHT_CARE: {
    bg: "#ECFDF9",
    bg2: "#D2FBF1",
    building: "#FFFFFF",
    roof: "#2DD4BF",
    accent: "#2DD4BF",
  },
  HOME_CARE: {
    bg: "#ECFDF9",
    bg2: "#D2FBF1",
    building: "#FFFFFF",
    roof: "#2DD4BF",
    accent: "#2DD4BF",
  },
  SILVER_TOWN: {
    bg: "#FFF8F0",
    bg2: "#FFF0E0",
    building: "#FFFFFF",
    roof: "#FFA35C",
    accent: "#FFA35C",
  },
};

export function FacilityIllustration({
  facilityType,
  className = "",
}: {
  facilityType: FacilityType;
  className?: string;
}) {
  const t = THEME[facilityType];
  const isHospital = facilityType === "NURSING_HOSPITAL";

  return (
    <svg
      viewBox="0 0 200 130"
      className={`h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`sky-${facilityType}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.bg2} />
          <stop offset="100%" stopColor={t.bg} />
        </linearGradient>
      </defs>
      <rect width="200" height="130" fill={`url(#sky-${facilityType})`} />

      {/* 해 + 구름 */}
      <circle cx="168" cy="26" r="12" fill={t.accent} opacity="0.25" />
      <circle cx="30" cy="22" r="8" fill="#FFFFFF" opacity="0.6" />
      <circle cx="40" cy="24" r="10" fill="#FFFFFF" opacity="0.6" />
      <circle cx="50" cy="22" r="7" fill="#FFFFFF" opacity="0.6" />

      {/* 나무 */}
      <rect x="26" y="82" width="4" height="18" rx="2" fill={t.accent} opacity="0.35" />
      <circle cx="28" cy="76" r="12" fill={t.accent} opacity="0.3" />

      {/* 건물 */}
      <rect x="56" y="52" width="96" height="48" rx="6" fill={t.building} stroke={t.roof} strokeWidth="2.5" />
      {/* 지붕 */}
      <rect x="50" y="44" width="108" height="12" rx="5" fill={t.roof} />

      {/* 창문 */}
      {[68, 92, 116, 132].map((x) => (
        <rect key={x} x={x} y={64} width="12" height="12" rx="2.5" fill={t.roof} opacity="0.5" />
      ))}
      {/* 문 */}
      <rect x="94" y="80" width="16" height="20" rx="2" fill={t.roof} opacity="0.7" />

      {/* 배지 아이콘 */}
      <circle cx="150" cy="52" r="13" fill={t.accent} />
      {isHospital ? (
        <path d="M150 45v14M143 52h14" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path
          d="M150 58c-6-4.5-9-7.7-9-11.2a4.8 4.8 0 0 1 9-2.3 4.8 4.8 0 0 1 9 2.3c0 3.5-3 6.7-9 11.2z"
          fill="#FFFFFF"
        />
      )}

      {/* 바닥선 */}
      <rect x="0" y="100" width="200" height="30" fill={t.bg2} opacity="0.5" />
    </svg>
  );
}
