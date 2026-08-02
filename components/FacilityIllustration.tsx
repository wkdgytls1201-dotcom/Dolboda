import { FacilityType } from "@/lib/types";

// 실제 시설 사진이 없는 곳(dataSource: "public")에 쓰는 사람 없는 플랫 일러스트.
// 특정 실제 건물을 묘사하지 않는 추상적인 그림이라 "이 시설의 실제 모습"으로 오인될 위험이 없다.
//
// 이전 버전은 정사각 건물 + 가로 지붕 막대라 "그리다 만 집"처럼 보였다. 지금은 창에 불이
// 켜진 두 동짜리 건물 + 언덕·나무·길로 바꿔, 사진이 없어도 카드가 휑해 보이지 않게 했다.
// 사람은 여전히 그리지 않는다(어르신을 특정 이미지로 고정하지 않기 위해).
const THEME: Record<
  FacilityType,
  { sky: string; sky2: string; hill: string; wall: string; roof: string; accent: string; warm: string }
> = {
  NURSING_HOSPITAL: {
    sky: "#FFF3F1",
    sky2: "#FFE2DD",
    hill: "#FFD3CB",
    wall: "#FFFFFF",
    roof: "#EB4632",
    accent: "#EB4632",
    warm: "#FFD84D",
  },
  NURSING_HOME: {
    sky: "#ECFDF9",
    sky2: "#D2FBF1",
    hill: "#B6F3E6",
    wall: "#FFFFFF",
    roof: "#14B8A6",
    accent: "#2DD4BF",
    warm: "#FFD84D",
  },
  DAY_NIGHT_CARE: {
    sky: "#F3F7FF",
    sky2: "#E0EBFF",
    hill: "#C9DDFF",
    wall: "#FFFFFF",
    roof: "#5B8DEF",
    accent: "#5B8DEF",
    warm: "#FFD84D",
  },
  HOME_CARE: {
    sky: "#FFF8F0",
    sky2: "#FFEEDC",
    hill: "#FFE0C2",
    wall: "#FFFFFF",
    roof: "#E07E2E",
    accent: "#FFA35C",
    warm: "#FFD84D",
  },
  SILVER_TOWN: {
    sky: "#F8F3FF",
    sky2: "#EDE0FB",
    hill: "#DCC7F3",
    wall: "#FFFFFF",
    roof: "#7C42BD",
    accent: "#9C60D0",
    warm: "#FFD84D",
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
  // 그라데이션 id는 문서 전체에서 유일해야 한다 — 한 화면에 유형이 섞여도 서로 덮어쓰지
  // 않도록 유형별로 이름을 나눈다(같은 유형끼리는 정의가 같아 공유해도 무방).
  const skyId = `fi-sky-${facilityType}`;

  return (
    <svg
      viewBox="0 0 200 130"
      className={`h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.sky2} />
          <stop offset="100%" stopColor={t.sky} />
        </linearGradient>
      </defs>
      <rect width="200" height="130" fill={`url(#${skyId})`} />

      {/* 아침 해 — 은은한 겹원. 카드 좌우 상단 모서리에는 찜하기·비교 버튼이 얹히므로
          가운데 위에 둔다(구석에 두면 버튼에 가려 잘린 달처럼 보였다) */}
      <circle cx="100" cy="24" r="17" fill={t.accent} opacity="0.12" />
      <circle cx="100" cy="24" r="10" fill={t.warm} opacity="0.5" />

      {/* 뒤쪽 언덕 두 겹 */}
      <path d="M0 92c34-16 56 6 84-2s52-24 116-6v46H0z" fill={t.hill} opacity="0.55" />
      <path d="M0 102c40-14 70 8 108 0s58-14 92-4v32H0z" fill={t.hill} opacity="0.8" />

      {/* 왼쪽 낮은 동 */}
      <rect x="34" y="66" width="42" height="38" rx="7" fill={t.wall} />
      <rect x="34" y="66" width="42" height="9" rx="4.5" fill={t.roof} opacity="0.85" />
      {[42, 58].map((x) => (
        <rect key={x} x={x} y={82} width="10" height="10" rx="2.5" fill={t.warm} opacity="0.85" />
      ))}

      {/* 가운데 본동 — 위쪽 모서리를 둥글게 해 딱딱하지 않게 */}
      <path d="M78 104V64a14 14 0 0 1 14-14h32a14 14 0 0 1 14 14v40z" fill={t.wall} />
      <path d="M78 64a14 14 0 0 1 14-14h32a14 14 0 0 1 14 14z" fill={t.roof} />
      {/* 창문 — 두 줄, 일부만 불이 켜진 느낌 */}
      {[
        [88, 70],
        [104, 70],
        [120, 70],
        [88, 86],
        [120, 86],
      ].map(([x, y], i) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="10"
          height="10"
          rx="2.5"
          fill={i % 2 === 0 ? t.warm : t.accent}
          opacity={i % 2 === 0 ? 0.85 : 0.28}
        />
      ))}
      {/* 아치형 현관 */}
      <path d="M100 104V94a8 8 0 0 1 16 0v10z" fill={t.roof} opacity="0.75" />

      {/* 현관 앞 길 */}
      <path d="M104 104h8l10 18h-28z" fill={t.wall} opacity="0.65" />

      {/* 나무 두 그루 */}
      <rect x="156" y="88" width="4" height="16" rx="2" fill={t.roof} opacity="0.45" />
      <circle cx="158" cy="82" r="13" fill={t.accent} opacity="0.35" />
      <rect x="176" y="94" width="3" height="11" rx="1.5" fill={t.roof} opacity="0.4" />
      <circle cx="177.5" cy="90" r="9" fill={t.accent} opacity="0.25" />

      {/* 유형 배지 — 요양병원은 십자, 그 외는 하트 */}
      <circle cx="150" cy="58" r="12" fill={t.roof} />
      {isHospital ? (
        <path d="M150 52v12M144 58h12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path
          d="M150 64c-5.6-4.2-8.4-7.2-8.4-10.4a4.5 4.5 0 0 1 8.4-2.2 4.5 4.5 0 0 1 8.4 2.2c0 3.2-2.8 6.2-8.4 10.4z"
          fill="#FFFFFF"
        />
      )}

      {/* 바닥 */}
      <rect x="0" y="104" width="200" height="26" fill={t.hill} opacity="0.6" />
    </svg>
  );
}
