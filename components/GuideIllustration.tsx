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

// 글 하나마다 다른 그림을 준다(2026-08-07) — 카테고리 셋으로만 나누면 같은 카테고리 안
// 8편이 전부 같은 그림을 반복해서 보게 된다. 배경·점 악센트는 같은 틀을 쓰되(브랜드 통일감),
// 가운데 아이콘은 글의 실제 주제에서 뽑아 슬러그마다 다르게 그린다.
function Scene({
  label,
  dots,
  children,
}: {
  label: string;
  dots: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox="0 0 400 130" className="h-auto w-full" role="img" aria-label={label}>
      {BG}
      {dots}
      {children}
    </svg>
  );
}

const ICONS: Record<string, () => React.ReactElement> = {
  // ── 시설 선택 ──────────────────────────────────────────────
  "nursing-home-vs-hospital": () => (
    <Scene
      label="요양원과 요양병원 두 건물을 나란히 비교하는 일러스트"
      dots={
        <>
          <circle cx="86" cy="36" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="326" cy="96" r="5" fill="#2DD4BF" opacity="0.7" />
        </>
      }
    >
      <line x1="200" y1="26" x2="200" y2="108" stroke="#F1E8FB" strokeWidth="3" />
      <rect x="130" y="66" width="52" height="40" rx="8" fill="#FFE3CC" />
      <path d="M124 70 L156 46 L188 70 Z" fill="#FF9F8C" />
      <rect x="222" y="50" width="56" height="56" rx="8" fill="#FFFFFF" stroke="#F1E8FB" strokeWidth="3" />
      <rect x="244" y="60" width="12" height="30" rx="3" fill="#EB4632" />
      <rect x="234" y="70" width="32" height="10" rx="3" fill="#EB4632" />
    </Scene>
  ),
  "dementia-facility": () => (
    <Scene
      label="집을 감싸는 보호막을 나타낸 일러스트"
      dots={
        <>
          <circle cx="88" cy="40" r="4" fill="#7C42BD" opacity="0.5" />
          <circle cx="320" cy="96" r="5" fill="#2DD4BF" opacity="0.7" />
        </>
      }
    >
      <circle cx="200" cy="66" r="46" fill="none" stroke="#FF9F8C" strokeWidth="6" strokeDasharray="10 8" opacity="0.7" />
      <rect x="176" y="58" width="48" height="36" rx="7" fill="#FFE3CC" />
      <path d="M170 62 L200 40 L230 62 Z" fill="#EB4632" />
      <circle cx="200" cy="76" r="5" fill="#FFFFFF" />
    </Scene>
  ),
  checklist: () => (
    <Scene
      label="체크 표시가 된 클립보드 일러스트"
      dots={
        <>
          <circle cx="284" cy="34" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="304" cy="100" r="5" fill="#FF9F8C" opacity="0.7" />
        </>
      }
    >
      <rect x="162" y="30" width="76" height="92" rx="10" fill="#FFFFFF" stroke="#F1E8FB" strokeWidth="3" />
      <rect x="184" y="24" width="32" height="14" rx="6" fill="#D9D4E8" />
      <circle cx="176" cy="52" r="6" fill="#2DD4BF" />
      <path d="M173 52 l2 2 l4-4" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="188" y="49" width="38" height="6" rx="3" fill="#E8E4F3" />
      <circle cx="176" cy="74" r="6" fill="#2DD4BF" />
      <path d="M173 74 l2 2 l4-4" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="188" y="71" width="38" height="6" rx="3" fill="#E8E4F3" />
      <circle cx="176" cy="96" r="6" fill="#2DD4BF" />
      <path d="M173 96 l2 2 l4-4" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="188" y="93" width="38" height="6" rx="3" fill="#E8E4F3" />
    </Scene>
  ),
  "grade-reading": () => (
    <Scene
      label="A등급 리본 배지와 등급 막대를 나타낸 일러스트"
      dots={
        <>
          <circle cx="90" cy="40" r="4" fill="#7C42BD" opacity="0.5" />
          <circle cx="326" cy="40" r="5" fill="#2DD4BF" opacity="0.7" />
        </>
      }
    >
      <path
        d="M200 28 l14 30 l32 4 l-24 22 l6 32 l-28-16 l-28 16 l6-32 l-24-22 l32-4 Z"
        fill="#FFCC29"
      />
      <text x="200" y="76" textAnchor="middle" fontSize="26" fontWeight="800" fill="#B15E13">
        A
      </text>
      <rect x="150" y="112" width="100" height="8" rx="4" fill="#E8E4F3" />
      <rect x="150" y="112" width="70" height="8" rx="4" fill="#2DD4BF" />
    </Scene>
  ),
  "tenure-signal": () => (
    <Scene
      label="오래 근무한 시간을 나타내는 시계 배지 일러스트"
      dots={
        <>
          <circle cx="122" cy="40" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="286" cy="102" r="5" fill="#2DD4BF" opacity="0.7" />
        </>
      }
    >
      <circle cx="200" cy="66" r="40" fill="#F1E8FB" />
      <circle cx="200" cy="66" r="32" fill="#FFFFFF" stroke="#7C42BD" strokeWidth="5" />
      <line x1="200" y1="66" x2="200" y2="46" stroke="#7C42BD" strokeWidth="5" strokeLinecap="round" />
      <line x1="200" y1="66" x2="216" y2="74" stroke="#7C42BD" strokeWidth="5" strokeLinecap="round" />
      <circle cx="200" cy="66" r="4" fill="#7C42BD" />
    </Scene>
  ),
  "before-you-sign": () => (
    <Scene
      label="서명이 있는 계약서와 펜을 나타낸 일러스트"
      dots={
        <>
          <circle cx="120" cy="40" r="4" fill="#2DD4BF" opacity="0.7" />
          <circle cx="322" cy="100" r="5" fill="#FFCC29" opacity="0.8" />
        </>
      }
    >
      <rect x="158" y="26" width="84" height="86" rx="10" fill="#FFFFFF" stroke="#F1E8FB" strokeWidth="3" />
      <rect x="172" y="42" width="56" height="6" rx="3" fill="#E8E4F3" />
      <rect x="172" y="56" width="46" height="6" rx="3" fill="#E8E4F3" />
      <path d="M174 88 q8-14 16 0 t16 0 t16 0" stroke="#FF9F8C" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <g transform="rotate(35 254 70)">
        <rect x="248" y="40" width="10" height="50" rx="4" fill="#7C42BD" />
        <path d="M243 90 l10 0 l-5 12 Z" fill="#B15E13" />
      </g>
    </Scene>
  ),
  "silver-town-vs-nursing-home": () => (
    <Scene
      label="높은 실버타운 건물과 낮은 요양원 건물을 비교한 일러스트"
      dots={
        <>
          <circle cx="124" cy="96" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="310" cy="42" r="5" fill="#2DD4BF" opacity="0.7" />
        </>
      }
    >
      <rect x="148" y="30" width="46" height="82" rx="6" fill="#FFFFFF" stroke="#F1E8FB" strokeWidth="3" />
      <rect x="158" y="42" width="10" height="10" rx="2" fill="#9B6FD1" opacity="0.6" />
      <rect x="176" y="42" width="10" height="10" rx="2" fill="#9B6FD1" opacity="0.6" />
      <rect x="158" y="60" width="10" height="10" rx="2" fill="#9B6FD1" opacity="0.6" />
      <rect x="176" y="60" width="10" height="10" rx="2" fill="#9B6FD1" opacity="0.6" />
      <rect x="158" y="78" width="10" height="10" rx="2" fill="#9B6FD1" opacity="0.6" />
      <rect x="176" y="78" width="10" height="10" rx="2" fill="#9B6FD1" opacity="0.6" />
      <rect x="212" y="72" width="76" height="40" rx="8" fill="#FFE3CC" />
      <path d="M206 76 L250 52 L294 76 Z" fill="#FF9F8C" />
    </Scene>
  ),
  "facility-transfer": () => (
    <Scene
      label="한 시설에서 다른 시설로 이어지는 화살표를 나타낸 일러스트"
      dots={
        <>
          <circle cx="200" cy="28" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="300" cy="104" r="5" fill="#2DD4BF" opacity="0.7" />
        </>
      }
    >
      <rect x="126" y="74" width="42" height="34" rx="7" fill="#FFE3CC" />
      <path d="M120 78 L147 60 L174 78 Z" fill="#FF9F8C" opacity="0.9" />
      <rect x="232" y="66" width="46" height="40" rx="7" fill="#FFE3CC" />
      <path d="M226 70 L255 48 L284 70 Z" fill="#EB4632" opacity="0.9" />
      <path d="M178 78 q40-30 74 0" stroke="#7C42BD" strokeWidth="3.5" fill="none" strokeDasharray="6 6" />
      <path d="M244 68 l12 8 l-4-14 Z" fill="#7C42BD" />
    </Scene>
  ),

  // ── 비용 ──────────────────────────────────────────────────
  "nursing-home-cost": () => (
    <Scene
      label="계산기를 나타낸 일러스트"
      dots={
        <>
          <circle cx="272" cy="40" r="4" fill="#2DD4BF" opacity="0.7" />
          <circle cx="300" cy="96" r="5" fill="#FF9F8C" opacity="0.7" />
        </>
      }
    >
      <rect x="164" y="24" width="72" height="88" rx="10" fill="#FFBB85" />
      <rect x="176" y="36" width="48" height="18" rx="4" fill="#FFFBF3" />
      <circle cx="184" cy="66" r="6" fill="#FFFFFF" opacity="0.9" />
      <circle cx="200" cy="66" r="6" fill="#FFFFFF" opacity="0.9" />
      <circle cx="216" cy="66" r="6" fill="#FFFFFF" opacity="0.9" />
      <circle cx="184" cy="84" r="6" fill="#FFFFFF" opacity="0.9" />
      <circle cx="200" cy="84" r="6" fill="#FFFFFF" opacity="0.9" />
      <circle cx="216" cy="84" r="6" fill="#FFFFFF" opacity="0.9" />
      <circle cx="184" cy="100" r="6" fill="#FFFFFF" opacity="0.9" />
      <circle cx="200" cy="100" r="6" fill="#E07E2E" />
      <circle cx="216" cy="100" r="6" fill="#FFFFFF" opacity="0.9" />
    </Scene>
  ),
  "hospital-nonpayment": () => (
    <Scene
      label="비급여 항목이 강조된 영수증 일러스트"
      dots={
        <>
          <circle cx="272" cy="36" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="296" cy="88" r="5" fill="#7C42BD" opacity="0.5" />
        </>
      }
    >
      <path
        d="M158 26 h84 v74 l-8-6 l-8 6 l-8-6 l-8 6 l-8-6 l-8 6 l-8-6 l-8 6 l-8-6 l-8 6 Z"
        fill="#FFFFFF"
        stroke="#F1E8FB"
        strokeWidth="3"
      />
      <rect x="170" y="42" width="60" height="6" rx="3" fill="#E8E4F3" />
      <rect x="170" y="56" width="44" height="6" rx="3" fill="#FF9F8C" />
      <rect x="170" y="70" width="52" height="6" rx="3" fill="#E8E4F3" />
      <text x="170" y="96" fontSize="16" fontWeight="800" fill="#EB4632">
        ₩
      </text>
    </Scene>
  ),
  "daycare-cost": () => (
    <Scene
      label="낮과 밤을 함께 나타낸 원과 송영 차량 일러스트"
      dots={
        <>
          <circle cx="128" cy="36" r="4" fill="#2DD4BF" opacity="0.7" />
          <circle cx="300" cy="36" r="5" fill="#7C42BD" opacity="0.5" />
        </>
      }
    >
      <circle cx="200" cy="56" r="30" fill="#FFCC29" />
      <path d="M200 26 a30 30 0 0 0 0 60 a24 24 0 0 1 0-60Z" fill="#7C42BD" opacity="0.85" />
      <rect x="168" y="96" width="64" height="24" rx="8" fill="#FF9F8C" />
      <rect x="176" y="102" width="18" height="12" rx="3" fill="#FFF3E9" />
      <circle cx="182" cy="122" r="7" fill="#4A4A4A" />
      <circle cx="216" cy="122" r="7" fill="#4A4A4A" />
    </Scene>
  ),
  "home-care-monthly-limit": () => (
    <Scene
      label="한도를 가리키는 계기판 일러스트"
      dots={
        <>
          <circle cx="120" cy="50" r="4" fill="#FF9F8C" opacity="0.7" />
          <circle cx="300" cy="40" r="5" fill="#FFCC29" opacity="0.8" />
        </>
      }
    >
      <path d="M150 100 a56 56 0 0 1 112 0 Z" fill="none" stroke="#E8E4F3" strokeWidth="12" />
      <path d="M150 100 a56 56 0 0 1 78-52" fill="none" stroke="#2DD4BF" strokeWidth="12" strokeLinecap="round" />
      <line x1="206" y1="100" x2="176" y2="62" stroke="#7C42BD" strokeWidth="4" strokeLinecap="round" />
      <circle cx="206" cy="100" r="7" fill="#7C42BD" />
    </Scene>
  ),
  "welfare-equipment-benefit": () => (
    <Scene
      label="휠체어 바퀴와 혜택 태그를 나타낸 일러스트"
      dots={
        <>
          <circle cx="120" cy="40" r="4" fill="#2DD4BF" opacity="0.7" />
          <circle cx="300" cy="98" r="5" fill="#FF9F8C" opacity="0.7" />
        </>
      }
    >
      <circle cx="190" cy="76" r="30" fill="none" stroke="#7C42BD" strokeWidth="7" />
      <circle cx="190" cy="76" r="6" fill="#7C42BD" />
      <line x1="190" y1="76" x2="190" y2="46" stroke="#7C42BD" strokeWidth="4" />
      <line x1="190" y1="76" x2="213" y2="60" stroke="#7C42BD" strokeWidth="4" />
      <line x1="190" y1="76" x2="213" y2="92" stroke="#7C42BD" strokeWidth="4" />
      <line x1="190" y1="76" x2="167" y2="92" stroke="#7C42BD" strokeWidth="4" />
      <rect x="244" y="40" width="34" height="24" rx="5" fill="#FFCC29" />
      <path d="M244 64 l0 14 l10-8 l10 8 l0-14 Z" fill="#FFCC29" />
      <circle cx="261" cy="48" r="3" fill="#FFFBF3" />
    </Scene>
  ),
  "copay-reduction": () => (
    <Scene
      label="퍼센트 기호가 내려가는 모습을 나타낸 일러스트"
      dots={
        <>
          <circle cx="300" cy="40" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="120" cy="100" r="5" fill="#2DD4BF" opacity="0.7" />
        </>
      }
    >
      <circle cx="176" cy="56" r="16" fill="#7C42BD" opacity="0.15" />
      <circle cx="176" cy="56" r="10" fill="none" stroke="#7C42BD" strokeWidth="5" />
      <line x1="152" y1="96" x2="224" y2="46" stroke="#7C42BD" strokeWidth="6" strokeLinecap="round" />
      <circle cx="224" cy="96" r="16" fill="#7C42BD" opacity="0.15" />
      <circle cx="224" cy="96" r="10" fill="none" stroke="#7C42BD" strokeWidth="5" />
      <path
        d="M256 60 l0 34 l-14-14 M256 94 l14-14"
        stroke="#EB4632"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Scene>
  ),

  // ── 제도 ──────────────────────────────────────────────────
  "grade-application": () => (
    <Scene
      label="신청 서류와 세 단계를 나타낸 일러스트"
      dots={
        <>
          <circle cx="290" cy="36" r="4" fill="#7C42BD" opacity="0.5" />
          <circle cx="304" cy="66" r="5" fill="#2DD4BF" opacity="0.7" />
        </>
      }
    >
      <rect x="166" y="24" width="68" height="76" rx="9" fill="#FFFFFF" stroke="#F1E8FB" strokeWidth="3" />
      <rect x="178" y="38" width="44" height="6" rx="3" fill="#E8E4F3" />
      <rect x="178" y="52" width="36" height="6" rx="3" fill="#E8E4F3" />
      <rect x="178" y="66" width="40" height="6" rx="3" fill="#E8E4F3" />
      <circle cx="154" cy="112" r="12" fill="#2DD4BF" />
      <text x="154" y="117" textAnchor="middle" fontSize="13" fontWeight="800" fill="#FFFFFF">
        1
      </text>
      <circle cx="200" cy="112" r="12" fill="#FFCC29" />
      <text x="200" y="117" textAnchor="middle" fontSize="13" fontWeight="800" fill="#B15E13">
        2
      </text>
      <circle cx="246" cy="112" r="12" fill="#FF9F8C" />
      <text x="246" y="117" textAnchor="middle" fontSize="13" fontWeight="800" fill="#FFFFFF">
        3
      </text>
    </Scene>
  ),
  "no-grade-admission": () => (
    <Scene
      label="물음표가 붙은 문과 다른 길을 나타낸 일러스트"
      dots={
        <>
          <circle cx="120" cy="40" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="300" cy="102" r="5" fill="#FF9F8C" opacity="0.7" />
        </>
      }
    >
      <rect x="176" y="46" width="48" height="66" rx="6" fill="#FFE3CC" />
      <circle cx="212" cy="80" r="3" fill="#B15E13" />
      <text x="200" y="38" textAnchor="middle" fontSize="28" fontWeight="800" fill="#7C42BD">
        ?
      </text>
      <path d="M234 90 q26 6 40-14" stroke="#2DD4BF" strokeWidth="3.5" fill="none" strokeDasharray="5 6" />
      <path d="M268 80 l8-4 l-2 10 Z" fill="#2DD4BF" />
    </Scene>
  ),
  "grade-renewal": () => (
    <Scene
      label="갱신을 나타내는 순환 화살표와 체크 배지 일러스트"
      dots={
        <>
          <circle cx="130" cy="40" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="300" cy="100" r="5" fill="#FF9F8C" opacity="0.7" />
        </>
      }
    >
      <circle cx="200" cy="68" r="30" fill="#F1E8FB" />
      <path d="M178 50 a30 30 0 1 1 -4 24" fill="none" stroke="#7C42BD" strokeWidth="6" strokeLinecap="round" />
      <path d="M172 42 l8 8 l-12 3 Z" fill="#7C42BD" />
      <path
        d="M188 68 l8 8 l16-18"
        fill="none"
        stroke="#2DD4BF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Scene>
  ),
  "family-care-allowance": () => (
    <Scene
      label="집과 현금을 함께 나타낸 일러스트"
      dots={
        <>
          <circle cx="120" cy="40" r="4" fill="#2DD4BF" opacity="0.7" />
          <circle cx="300" cy="96" r="5" fill="#7C42BD" opacity="0.5" />
        </>
      }
    >
      <rect x="168" y="70" width="64" height="42" rx="8" fill="#FFE3CC" />
      <path d="M160 74 L200 46 L240 74 Z" fill="#FF9F8C" />
      <circle cx="240" cy="52" r="20" fill="#FFCC29" />
      <text x="240" y="58" textAnchor="middle" fontSize="17" fontWeight="800" fill="#B15E13">
        ₩
      </text>
      <path d="M232 66 q6 10 16 10" stroke="#EB4632" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Scene>
  ),
  "visiting-care": () => (
    <Scene
      label="문을 두드리는 손을 나타낸 일러스트"
      dots={
        <>
          <circle cx="130" cy="40" r="4" fill="#FFCC29" opacity="0.8" />
          <circle cx="300" cy="100" r="5" fill="#2DD4BF" opacity="0.7" />
        </>
      }
    >
      <rect x="176" y="34" width="48" height="78" rx="6" fill="#FFFFFF" stroke="#F1E8FB" strokeWidth="3" />
      <circle cx="212" cy="74" r="3" fill="#B15E13" />
      <circle cx="256" cy="62" r="9" fill="#FF9F8C" />
      <circle cx="266" cy="66" r="9" fill="#FF9F8C" />
      <circle cx="272" cy="76" r="8" fill="#FF9F8C" />
      <rect x="252" y="80" width="16" height="22" rx="7" fill="#FF9F8C" />
      <path d="M240 92 q6-4 10 0" stroke="#7C42BD" strokeWidth="2.5" fill="none" strokeDasharray="3 4" opacity="0.7" />
    </Scene>
  ),
};

export function GuideIllustration({
  slug,
  category,
}: {
  slug: string;
  category: "비용" | "제도" | "시설 선택";
}) {
  // 아직 전용 아이콘이 없는 슬러그(새 글 추가 시)는 카테고리 공용 그림으로 폴백한다 —
  // 매핑을 깜빡해도 화면이 비거나 깨지지 않는다.
  const Icon = ICONS[slug];
  const Fallback =
    category === "비용" ? CostScene : category === "제도" ? SystemScene : FacilityScene;
  return (
    <div className="mx-auto mb-6 max-w-[360px]">
      {Icon ? <Icon /> : <Fallback />}
    </div>
  );
}

// 목록 페이지 상단용 — 하트(감성) 대신 방패+체크와 막대그래프로 "공공데이터·제도 기준"이라는
// 신뢰감을 준다. 같은 브랜드 파스텔·점 악센트 언어를 쓰되, 모티프를 바꿔 카테고리별
// 일러스트(FacilityScene 등)와 다른 톤을 낸다 — 따뜻함보다 검증됨을 앞세운다.
export function GuideListHero() {
  return (
    <div className="mx-auto mb-6 max-w-[300px]">
      <svg viewBox="0 0 400 140" className="h-auto w-full" role="img" aria-label="공공데이터와 제도 기준으로 검증된 정보를 나타낸 일러스트">
        <defs>
          <linearGradient id="glh-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F1E8FB" />
            <stop offset="100%" stopColor="#FFFBF3" />
          </linearGradient>
          <linearGradient id="glh-shield" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9B6FD1" />
            <stop offset="100%" stopColor="#7C42BD" />
          </linearGradient>
        </defs>
        <rect width="400" height="140" fill="url(#glh-bg)" rx="22" />
        <circle cx="86" cy="36" r="4" fill="#FFCC29" opacity="0.8" />
        <circle cx="324" cy="100" r="5" fill="#FF9F8C" opacity="0.7" />
        <circle cx="336" cy="40" r="3" fill="#2DD4BF" opacity="0.6" />
        {/* 막대그래프 — 공공데이터를 모아 정리했다는 표시 */}
        <rect x="112" y="80" width="18" height="26" rx="5" fill="#71E9D3" />
        <rect x="138" y="62" width="18" height="44" rx="5" fill="#FFCC29" />
        <rect x="164" y="46" width="18" height="60" rx="5" fill="#FF9F8C" />
        <rect x="104" y="106" width="88" height="4" rx="2" fill="#E8DFF5" />
        {/* 방패 + 체크 — 제도 기준으로 검증됐다는 신뢰 배지 */}
        <path
          d="M256 30 c18 8 34 8 34 8 c0 34 -14 54 -34 62 c-20-8-34-28-34-62 c0 0 16 0 34-8Z"
          fill="url(#glh-shield)"
        />
        <path
          d="M240 63 l11 11 l21-23"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
