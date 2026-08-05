// /business/apply 진입 중 화면.
//
// 이 페이지 자체는 DB 조회가 없는 정적 폼이라 대부분 즉시 뜨지만(특히 /business에서
// Link로 들어오면 Next가 이미 프리페치해둔다), 첫 방문이나 느린 회선에서는 라우트 전환
// 순간 이전 화면이 붙잡혀 있을 수 있다. 다른 라우트와 같은 원칙으로 뼈대를 둔다.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-ink-100 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8 pb-20" aria-busy="true" aria-label="입점 신청 화면을 불러오는 중">
      <Bar className="mb-3 h-4 w-28" />
      <Bar className="mb-2 h-8 w-48" />
      <Bar className="mb-6 h-5 w-full" />
      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card sm:p-6">
        <Bar className="h-12 w-full rounded-xl" />
        <Bar className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Bar className="h-12 rounded-xl" />
          <Bar className="h-12 rounded-xl" />
        </div>
        <Bar className="h-20 w-full rounded-xl" />
        <Bar className="h-14 w-full rounded-xl" />
      </div>
    </main>
  );
}
