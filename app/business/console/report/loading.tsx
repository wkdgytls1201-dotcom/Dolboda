// 월간 성과 보고서로 넘어가는 동안 보여주는 뼈대 화면. 콘솔 뼈대(../loading.tsx)와
// 같은 원칙 — 지역 평균·광고 성과까지 여러 집계를 한 번에 계산하는 무거운 조회라
// 뼈대가 없으면 버튼을 눌러도 반응이 없는 것처럼 보인다.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-ink-100 ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="mb-4 rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <Bar className="h-5 w-24" />
        <Bar className="h-4 w-20" />
      </div>
      <Bar className="mb-3 h-8 w-28" />
      <Bar className="h-16 w-full rounded-xl" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24" aria-busy="true" aria-label="월간 성과 보고서를 불러오는 중">
      <div className="mb-1 flex items-center justify-between">
        <Bar className="h-7 w-36" />
        <Bar className="h-4 w-20" />
      </div>
      <Bar className="mb-4 h-4 w-48" />

      <StatCardSkeleton />
      <StatCardSkeleton />

      <div className="rounded-2xl bg-white p-5 shadow-card">
        <Bar className="mb-3 h-5 w-32" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Bar key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
