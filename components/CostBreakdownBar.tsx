export interface CostSegment {
  label: string;
  value: number;
  colorClassName: string;
}

function won(n: number) {
  return `${Math.round(n).toLocaleString()}원`;
}

// 여러 비용 항목의 합산 구성을 누적 막대 + 범례로 보여준다.
// (급여 본인부담금 / 식비 / 간식비 등 — 항상 라벨과 함께 표시해 색상만으로 구분하지 않는다)
export function CostBreakdownBar({ segments, total }: { segments: CostSegment[]; total: number }) {
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-ink-100">
        {visible.map((s, i) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <div
              key={s.label}
              className={`${s.colorClassName} h-full`}
              style={{
                width: `${pct}%`,
                marginLeft: i === 0 ? 0 : "2px",
              }}
              title={`${s.label} ${won(s.value)}`}
            />
          );
        })}
      </div>

      <div className="mt-3 space-y-1.5">
        {visible.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-ink-500">
                <span className={`h-2.5 w-2.5 rounded-full ${s.colorClassName}`} />
                {s.label}
                <span className="text-xs text-ink-300">{pct}%</span>
              </span>
              <span className="font-semibold text-ink-900">{won(s.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
