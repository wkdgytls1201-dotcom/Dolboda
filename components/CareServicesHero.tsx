// 서비스 소개 페이지 상단 일러스트. 외부 이미지 없이 SVG로 그려 로딩이 즉시 끝나고
// 어느 화면 크기에서도 또렷하게 보인다. 브랜드 색(코랄·민트·피치·보라)을 그대로 쓴다.
// 이전엔 집·병원·방문돌봄 3장면을 가로로 넓게 펼친 파노라마였는데, 화면을 너무 많이
// 차지해서 손으로 하트를 감싸는 단순한 상징으로 바꾸고 세로 높이도 줄였다.
export function CareServicesHero() {
  return (
    <svg
      viewBox="0 0 400 150"
      className="mx-auto w-full max-w-[320px]"
      role="img"
      aria-label="두 손으로 하트를 감싸 돌보는 모습을 나타낸 일러스트"
    >
      <defs>
        <linearGradient id="csh-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF7E9" />
          <stop offset="100%" stopColor="#FFFBF3" />
        </linearGradient>
        <linearGradient id="csh-heart" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF9F8C" />
          <stop offset="100%" stopColor="#EB4632" />
        </linearGradient>
      </defs>

      <rect width="400" height="150" fill="url(#csh-bg)" rx="24" />

      {/* 뒤쪽 물결 — 온기를 은은하게 표현 */}
      <path d="M0 118 Q 100 96 200 112 T 400 104 L400 150 L0 150Z" fill="#D2FBF1" opacity="0.7" />

      {/* 떠 있는 작은 하트 두 개 — 좌우 균형 */}
      <path
        d="M84 44c0-5 4-8 8-8 3 0 6 2 7 4 1-2 4-4 7-4 4 0 8 3 8 8 0 8-11 15-15 17-4-2-15-9-15-17z"
        fill="#FFD84D"
        opacity="0.9"
      />
      <path
        d="M282 40c0-4 3-7 6-7 3 0 5 1 6 3 1-2 3-3 6-3 3 0 6 3 6 7 0 7-9 12-12 14-3-2-12-7-12-14z"
        fill="#2DD4BF"
        opacity="0.9"
      />

      {/* 가운데: 두 손이 하트를 감싸는 모습 */}
      <g>
        <path
          d="M200 46c-14-14-38-14-50 0-12 13-11 32 4 46l46 40 46-40c15-14 16-33 4-46-12-14-36-14-50 0z"
          fill="url(#csh-heart)"
        />
        {/* 왼손 */}
        <path
          d="M118 118c-16 4-34 2-46-8-9-8-13-19-10-28 3-8 12-12 20-9 4 1 7 4 9 7"
          fill="none"
          stroke="#3A3452"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* 오른손 */}
        <path
          d="M282 118c16 4 34 2 46-8 9-8 13-19 10-28-3-8-12-12-20-9-4 1-7 4-9 7"
          fill="none"
          stroke="#3A3452"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
