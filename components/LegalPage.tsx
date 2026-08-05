export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 pb-24">
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">{title}</h1>
      <p className="mb-8 text-sm text-ink-300">시행일: {updatedAt}</p>
      {/* 표 처리 주의(2026-08-06):
          기본 table-layout(auto)에서는 셀 안의 긴 한글이 컬럼을 밀어내 표가 컨테이너보다
          넓어진다 — 360px 기기에서 개인정보처리방침 페이지 전체가 좌우로 스크롤됐다(실측
          383px > 360px). 법적 고지는 모바일에서 읽히는 게 중요하므로 두 가지로 막는다:
          ① table-fixed — 컬럼이 컨테이너 폭을 나눠 갖고, 내용이 폭을 정하지 못한다.
          ② overflow-wrap:anywhere — body의 word-break:keep-all 때문에 띄어쓰기 없는 긴
             구절이 안 끊기는데, 좁은 셀 안에서는 끊어야 넘치지 않는다(셀에만 국한). */}
      <div className="space-y-8 text-sm leading-relaxed text-ink-700 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink-900 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:mb-2 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-ink-100 [&_td]:p-2 [&_td]:[overflow-wrap:anywhere] [&_th]:border [&_th]:border-ink-100 [&_th]:bg-ink-100/40 [&_th]:p-2 [&_th]:[overflow-wrap:anywhere] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}
