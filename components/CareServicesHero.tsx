// 서비스 소개 페이지 상단 일러스트. 외부 이미지 없이 SVG로 그려 로딩이 즉시 끝나고
// 어느 화면 크기에서도 또렷하게 보인다.
// 손으로 하트를 감싸는 구상적인 그림 대신, 로고(4장 클로버 + 은은한 빛번짐)와 같은 언어로
// 두 개의 부드러운 블롭이 겹쳐 서로를 감싸고, 중심에 로고와 같은 흰 점이 빛나는 추상적인 모습으로 표현했다.
export function CareServicesHero() {
  return (
    <svg
      viewBox="0 0 400 150"
      className="mx-auto w-full max-w-[320px]"
      role="img"
      aria-label="서로 겹쳐 감싸는 두 개의 부드러운 형태로 돌봄을 표현한 일러스트"
    >
      <defs>
        <linearGradient id="csh-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3E9" />
          <stop offset="100%" stopColor="#FFFBF3" />
        </linearGradient>
        <radialGradient id="csh-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#FFD1AD" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFD1AD" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="csh-blob-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF9F8C" />
          <stop offset="100%" stopColor="#EB4632" />
        </linearGradient>
        <linearGradient id="csh-blob-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#9C60D0" />
          <stop offset="100%" stopColor="#7C42BD" />
        </linearGradient>
      </defs>

      <rect width="400" height="150" fill="url(#csh-bg)" rx="24" />
      <circle cx="200" cy="72" r="95" fill="url(#csh-glow)" />

      {/* 떠 있는 작은 점들 — 로고 배경의 은은한 빛 입자를 옮겨온 것 */}
      <circle cx="90" cy="38" r="4" fill="#FFCC29" opacity="0.8" />
      <circle cx="316" cy="112" r="5" fill="#2DD4BF" opacity="0.75" />
      <circle cx="330" cy="42" r="3" fill="#EB4632" opacity="0.55" />

      {/* 서로 겹쳐 감싸는 두 블롭 — 보호자와 돌보다 매니저가 함께 돌보는 모습을 추상적으로 표현 */}
      <path
        d="M143 100 C 95 100 68 68 78 38 C 86 14 118 4 146 14 C 168 22 176 44 172 62 C 190 58 205 70 203 90 C 201 110 178 122 158 116 C 152 111 147 106 143 100 Z"
        fill="url(#csh-blob-a)"
        opacity="0.94"
      />
      <path
        d="M257 108 C 305 112 328 82 320 52 C 314 28 284 16 256 24 C 234 30 224 52 227 70 C 210 64 194 76 195 96 C 196 116 218 130 240 125 C 246 120 252 114 257 108 Z"
        fill="url(#csh-blob-b)"
        opacity="0.92"
      />

      {/* 두 블롭이 맞닿는 중심의 흰 점 — 로고 중심점과 같은 자리 */}
      <circle cx="200" cy="75" r="9" fill="#FFFFFF" />
      <circle cx="200" cy="75" r="9" fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="6" />
    </svg>
  );
}
