// 화면 전환·데이터를 불러오는 동안 보여주는 가벼운 로더. 실제 로고(public/logo.png)와
// 같은 4장 클로버 꽃잎 모양을 그대로 SVG로 재현해서 시계방향으로 돈다.
// transform(rotate) 하나만 애니메이션해서 GPU에서 처리되니 저사양 기기에서도 가볍다.
function FlowerSpinner() {
  const petals = [
    { cx: 38, cy: 38, fill: "#EB4632" }, // 좌상 — 짙은 코랄
    { cx: 62, cy: 38, fill: "#FF9F8C" }, // 우상 — 연한 핑크
    { cx: 38, cy: 62, fill: "#FF6250" }, // 좌하 — 기본 코랄
    { cx: 62, cy: 62, fill: "#FFBB85" }, // 우하 — 피치
  ];
  return (
    <svg viewBox="0 0 100 100" className="h-12 w-12 animate-[spin_2.2s_linear_infinite]" aria-hidden>
      {petals.map((p) => (
        <circle key={`${p.cx}-${p.cy}`} cx={p.cx} cy={p.cy} r="20" fill={p.fill} />
      ))}
      <circle cx="50" cy="50" r="6" fill="#fff" />
    </svg>
  );
}

export function PageLoader({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      // 로딩 중엔 아래 푸터가 화면에 걸쳐 보이지 않도록 뷰포트 대부분을 채운다.
      className="flex min-h-[85vh] flex-col items-center justify-center px-4 py-16"
    >
      <FlowerSpinner />
    </div>
  );
}
