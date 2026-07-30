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
      <div className="space-y-8 text-sm leading-relaxed text-ink-700 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink-900 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:mb-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-ink-100 [&_td]:p-2 [&_th]:border [&_th]:border-ink-100 [&_th]:bg-ink-100/40 [&_th]:p-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}
