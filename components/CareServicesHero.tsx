// 서비스 소개 페이지 상단 일러스트. 외부 이미지 없이 SVG로 그려 로딩이 즉시 끝나고
// 어느 화면 크기에서도 또렷하게 보인다. 브랜드 색(코랄·민트·피치·보라)을 그대로 쓴다.
export function CareServicesHero() {
  return (
    <svg
      viewBox="0 0 400 260"
      className="mx-auto w-full max-w-[420px]"
      role="img"
      aria-label="집, 병원, 방문 돌봄을 나타낸 일러스트"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF7E9" />
          <stop offset="100%" stopColor="#FFFBF3" />
        </linearGradient>
        <linearGradient id="roof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF7A61" />
          <stop offset="100%" stopColor="#EB4632" />
        </linearGradient>
      </defs>

      <rect width="400" height="260" fill="url(#sky)" rx="24" />

      {/* 뒤쪽 언덕 */}
      <path d="M0 200 Q 100 168 200 196 T 400 186 L400 260 L0 260Z" fill="#D2FBF1" />
      <path d="M0 218 Q 120 194 240 216 T 400 210 L400 260 L0 260Z" fill="#A8F5E4" />

      {/* 왼쪽: 집 */}
      <g>
        <rect x="38" y="150" width="86" height="70" rx="8" fill="#FFFFFF" stroke="#E7E4F0" strokeWidth="2" />
        <path d="M30 152 L81 116 L132 152 Z" fill="url(#roof)" />
        <rect x="58" y="172" width="24" height="24" rx="4" fill="#FFF0E0" stroke="#FFD1AD" strokeWidth="1.5" />
        <rect x="94" y="176" width="18" height="44" rx="4" fill="#FFE2DD" />
        <circle cx="98" cy="198" r="1.8" fill="#EB4632" />
      </g>

      {/* 가운데: 병원 */}
      <g>
        <rect x="152" y="112" width="96" height="108" rx="10" fill="#FFFFFF" stroke="#E7E4F0" strokeWidth="2" />
        <rect x="152" y="112" width="96" height="22" rx="10" fill="#7C42BD" />
        {/* 십자 표시 */}
        <rect x="194" y="146" width="12" height="34" rx="3" fill="#FF6250" />
        <rect x="183" y="157" width="34" height="12" rx="3" fill="#FF6250" />
        {[0, 1].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={164 + c * 26}
              y={188 + r * 0}
              width="16"
              height="16"
              rx="3"
              fill="#E9D9F6"
            />
          ))
        )}
      </g>

      {/* 오른쪽: 방문 돌봄 (가방 든 시터) */}
      <g>
        <circle cx="316" cy="146" r="17" fill="#FFD1AD" />
        <path d="M303 141 Q316 128 329 141 Q322 134 303 141Z" fill="#3A3452" />
        <rect x="300" y="166" width="32" height="42" rx="12" fill="#2DD4BF" />
        <rect x="292" y="172" width="10" height="26" rx="5" fill="#FFD1AD" />
        <rect x="330" y="172" width="10" height="26" rx="5" fill="#FFD1AD" />
        <rect x="336" y="192" width="26" height="20" rx="4" fill="#FFFFFF" stroke="#E7E4F0" strokeWidth="2" />
        <rect x="345" y="188" width="8" height="6" rx="2" fill="#A9A3BC" />
        <rect x="345" y="198" width="8" height="8" rx="2" fill="#FF9F8C" />
      </g>

      {/* 떠 있는 하트 — 돌봄의 온기 */}
      <g opacity="0.85">
        <path
          d="M262 84 c0-6 5-10 10-10 4 0 7 2 8 5 1-3 4-5 8-5 5 0 10 4 10 10 0 10-14 18-18 21-4-3-18-11-18-21z"
          fill="#FF9F8C"
        />
        <path
          d="M104 92 c0-4 3-7 7-7 3 0 5 2 6 4 1-2 3-4 6-4 4 0 7 3 7 7 0 7-10 13-13 15-3-2-13-8-13-15z"
          fill="#FFD84D"
        />
      </g>
    </svg>
  );
}
