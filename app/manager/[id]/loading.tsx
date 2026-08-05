// 매니저 공개 프로필 뼈대 — 실제 화면과 같은 배치(아바타·실적 3칸 패널·소개 카드).
// 새 라우트에는 loading.tsx가 필수다(CLAUDE.md) — 없으면 눌러도 반응이 없어 보인다.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-ink-100 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-md px-4 py-8 pb-24" aria-busy="true" aria-label="매니저 프로필을 불러오는 중">
      <div className="mb-5 flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-ink-100" />
        <div className="min-w-0 flex-1">
          <Bar className="mb-2 h-5 w-24" />
          <Bar className="mb-1.5 h-6 w-40" />
          <Bar className="h-4 w-32" />
        </div>
      </div>
      <Bar className="mb-5 h-32 w-full rounded-2xl" />
      <Bar className="mb-5 h-28 w-full rounded-2xl" />
      <Bar className="h-[52px] w-full rounded-2xl" />
    </main>
  );
}
