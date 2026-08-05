// 실제 레이아웃 모양의 뼈대 — 제목 + 문단 줄. 정적 페이지라 순간이지만
// 빈 화면(푸터 상승) 대신 자리를 잡아준다.
export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl animate-pulse px-4 pb-24 pt-8">
      <div className="mb-4 h-7 w-2/3 rounded-lg bg-ink-100" />
      <div className="mb-9 h-4 w-full rounded bg-ink-100" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-8">
          <div className="mb-3 h-5 w-1/3 rounded bg-ink-100" />
          <div className="mb-2 h-4 w-full rounded bg-ink-100" />
          <div className="h-4 w-5/6 rounded bg-ink-100" />
        </div>
      ))}
    </main>
  );
}
