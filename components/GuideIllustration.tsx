// 요양 가이드용 카테고리별 일러스트 — 외부 이미지 없이 SVG로 그려 로딩이 즉시 끝나고
// 모바일에서도 또렷하다. 브랜드 파스텔(코랄·피치·민트·보라·골드)만 사용.
// 사람 캐릭터 대신 로고·서비스 일러스트와 같은 추상·상징 언어(둥근 블롭, 하트, 점)를 쓴다.

const BG = (
  <>
    <defs>
      <linearGradient id="gi-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF3E9" />
        <stop offset="100%" stopColor="#FFFBF3" />
      </linearGradient>
    </defs>
    <rect width="400" height="130" fill="url(#gi-bg)" rx="20" />
  </>
);

// 시설 선택 — 따뜻한 집과 하트, 돋보기 (좋은 곳을 찾아본다)
function FacilityScene() {
  return (
    <svg viewBox="0 0 400 130" className="h-auto w-full" role="img" aria-label="좋은 요양시설을 찾아보는 모습을 나타낸 일러스트">
      {BG}
      <circle cx="86" cy="34" r="4" fill="#FFCC29" opacity="0.8" />
      <circle cx="330" cy="96" r="5" fill="#2DD4BF" opacity="0.7" />
      {/* 집 */}
      <rect x="140" y="58" width="76" height="48" rx="10" fill="#FFE3CC" />
      <path d="M132 62 L178 28 L224 62 Z" fill="#FF9F8C" />
      <rect x="166" y="76" width="24" height="30" rx="6" fill="#FFFBF3" />
      <path d="M178 46 c-5-6-14-2-14 4 c0 6 14 12 14 12 s14-6 14-12 c0-6-9-10-14-4Z" fill="#EB4632" />
      {/* 돋보기 */}
      <circle cx="262" cy="66" r="22" fill="none" stroke="#7C42BD" strokeWidth="8" opacity="0.85" />
      <rect x="276" y="82" width="26" height="10" rx="5" transform="rotate(45 276 82)" fill="#7C42BD" opacity="0.85" />
      <circle cx="262" cy="66" r="13" fill="#F1E8FB" opacity="0.7" />
    </svg>
  );
}

// 비용 — 동전과 지갑, 새싹 (아껴서 준비한다)
function CostScene() {
  return (
    <svg viewBox="0 0 400 130" className="h-auto w-full" role="img" aria-label="요양 비용을 계산하고 준비하는 모습을 나타낸 일러스트">
      {BG}
      <circle cx="92" cy="92" r="5" fill="#FF9F8C" opacity="0.7" />
      <circle cx="322" cy="34" r="4" fill="#7C42BD" opacity="0.5" />
      {/* 지갑 */}
      <rect x="142" y="52" width="86" height="56" rx="12" fill="#FFBB85" />
      <rect x="142" y="52" width="86" height="18" rx="9" fill="#E07E2E" opacity="0.6" />
      <circle cx="212" cy="82" r="7" fill="#FFFBF3" />
      {/* 동전 */}
      <circle cx="256" cy="52" r="17" fill="#FFCC29" />
      <circle cx="256" cy="52" r="17" fill="none" stroke="#E07E2E" strokeWidth="2.5" opacity="0.6" />
      <text x="256" y="58" textAnchor="middle" fontSize="16" fontWeight="800" fill="#B15E13">₩</text>
      <circle cx="282" cy="78" r="12" fill="#FFCC29" opacity="0.85" />
      <circle cx="282" cy="78" r="12" fill="none" stroke="#E07E2E" strokeWidth="2" opacity="0.5" />
      {/* 새싹 — 차곡차곡 자라는 준비 */}
      <path d="M120 106 c0-14 -10-20 -18-20 c2 12 8 18 18 20Z" fill="#2DD4BF" />
      <path d="M120 106 c0-10 8-16 14-16 c-2 10-6 14-14 16Z" fill="#3FD9BE" opacity="0.8" />
      <rect x="118" y="100" width="4" height="10" rx="2" fill="#178578" opacity="0.6" />
    </svg>
  );
}

// 제도 — 서류와 커다란 체크, 도장 (절차를 하나씩 통과)
function SystemScene() {
  return (
    <svg viewBox="0 0 400 130" className="h-auto w-full" role="img" aria-label="장기요양 제도 절차를 확인하는 모습을 나타낸 일러스트">
      {BG}
      <circle cx="84" cy="40" r="4" fill="#2DD4BF" opacity="0.7" />
      <circle cx="326" cy="92" r="5" fill="#FFCC29" opacity="0.8" />
      {/* 서류 */}
      <rect x="150" y="26" width="72" height="88" rx="10" fill="#FFFFFF" stroke="#F1E8FB" strokeWidth="3" />
      <rect x="162" y="42" width="48" height="6" rx="3" fill="#D9D4E8" />
      <rect x="162" y="56" width="40" height="6" rx="3" fill="#E8E4F3" />
      <rect x="162" y="70" width="46" height="6" rx="3" fill="#E8E4F3" />
      <rect x="162" y="84" width="32" height="6" rx="3" fill="#E8E4F3" />
      {/* 체크 배지 */}
      <circle cx="248" cy="80" r="26" fill="#2DD4BF" />
      <path d="M236 80 l9 9 l17 -18" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      {/* 도장 */}
      <rect x="286" y="42" width="26" height="16" rx="5" fill="#EB4632" opacity="0.85" />
      <rect x="293" y="30" width="12" height="14" rx="4" fill="#FF9F8C" />
    </svg>
  );
}

export function GuideIllustration({ category }: { category: "비용" | "제도" | "시설 선택" }) {
  const Scene =
    category === "비용" ? CostScene : category === "제도" ? SystemScene : FacilityScene;
  return (
    <div className="mx-auto mb-6 max-w-[360px]">
      <Scene />
    </div>
  );
}

// 목록 페이지 상단용 — 세 카테고리를 아우르는 인사 장면 (하트를 든 손)
export function GuideListHero() {
  return (
    <div className="mx-auto mb-6 max-w-[300px]">
      <svg viewBox="0 0 400 140" className="h-auto w-full" role="img" aria-label="돌봄 정보를 전하는 마음을 나타낸 일러스트">
        <defs>
          <linearGradient id="glh-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF3E9" />
            <stop offset="100%" stopColor="#FFFBF3" />
          </linearGradient>
          <linearGradient id="glh-heart" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF9F8C" />
            <stop offset="100%" stopColor="#EB4632" />
          </linearGradient>
        </defs>
        <rect width="400" height="140" fill="url(#glh-bg)" rx="22" />
        <circle cx="90" cy="42" r="4" fill="#FFCC29" opacity="0.8" />
        <circle cx="316" cy="100" r="5" fill="#2DD4BF" opacity="0.7" />
        <circle cx="330" cy="38" r="3" fill="#7C42BD" opacity="0.5" />
        {/* 펼친 책 */}
        <path d="M136 96 c22-10 42-10 64-2 c22-8 42-8 64 2 l0 14 c-22-10-42-10-64-2 c-22-8-42-8-64 2Z" fill="#FFFFFF" stroke="#FFE3CC" strokeWidth="3" />
        <path d="M200 94 l0 16" stroke="#FFD1AD" strokeWidth="3" />
        {/* 책 위로 떠오르는 하트 */}
        <path d="M200 46 c-9-11-26-4-26 8 c0 11 26 24 26 24 s26-13 26-24 c0-12-17-19-26-8Z" fill="url(#glh-heart)" />
        <path d="M170 66 c-4-5-12-2-12 4 c0 5 12 11 12 11 s12-6 12-11 c0-6-8-9-12-4Z" fill="#71E9D3" opacity="0.9" />
        <path d="M232 62 c-3-4-10-1-10 3 c0 4 10 9 10 9 s10-5 10-9 c0-4-7-7-10-3Z" fill="#FFCC29" opacity="0.9" />
      </svg>
    </div>
  );
}
