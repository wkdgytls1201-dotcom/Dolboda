// 기업회원 대시보드로 넘어가는 동안 보여주는 뼈대 화면.
//
// 이 라우트는 시설 소개글·사진·상담 내역·조회수를 여러 테이블에서 병렬로 모아오는
// force-dynamic 서버 컴포넌트라(app/business/console/page.tsx) 매 요청마다 시간이
// 든다. 이게 없으면 콘솔 진입 버튼을 눌러도 이전 화면이 그대로 붙잡혀 있어
// "눌렀는데 아무 일도 안 일어난다"로 보인다(다른 라우트에서 이미 겪은 문제).
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-ink-100 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24" aria-busy="true" aria-label="기업회원 대시보드를 불러오는 중">
      <div className="mb-1 flex items-center justify-between">
        <Bar className="h-7 w-40" />
        <Bar className="h-6 w-20 rounded-full" />
      </div>
      <Bar className="mb-4 h-4 w-64" />

      <Bar className="mb-4 h-11 w-full rounded-2xl" />

      <div className="mb-4 rounded-2xl bg-white p-5 shadow-card">
        <Bar className="mb-3 h-5 w-32" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Bar key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Bar className="mt-3 h-16 w-full rounded-xl" />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-card">
        <Bar className="mb-3 h-5 w-28" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Bar key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
