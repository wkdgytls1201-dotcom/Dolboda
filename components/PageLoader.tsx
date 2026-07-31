// 화면 전환·데이터를 불러오는 동안 보여주는 가벼운 로더. 꽃잎 6장이 시계방향으로
// 천천히 도는 형태 — transform(rotate)만 애니메이션해서 GPU에서 처리되니 저사양
// 기기에서도 렉 없이 가볍게 돈다(레이아웃·리페인트 없음).
function FlowerSpinner() {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-12 w-12 animate-[spin_2.2s_linear_infinite]"
      aria-hidden
    >
      {petals.map((deg, i) => (
        <ellipse
          key={deg}
          cx="50"
          cy="27"
          rx="7"
          ry="17"
          fill="#FF6250"
          opacity={1 - i * 0.13}
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="6" fill="#7C42BD" />
    </svg>
  );
}

export function PageLoader({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16"
    >
      <FlowerSpinner />
    </div>
  );
}
