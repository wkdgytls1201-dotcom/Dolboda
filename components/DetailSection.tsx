import { InfoTooltip } from "./InfoTooltip";

export function DetailSection({
  id,
  title,
  tooltip,
  children,
}: {
  id: string;
  title: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink-100 py-9 first:border-t-0 first:pt-0">
      <h2 className="mb-5 flex items-center text-lg font-bold leading-snug text-ink-900">
        {title}
        {tooltip && <InfoTooltip text={tooltip} />}
      </h2>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}
