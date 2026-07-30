export interface CalcStep {
  label: string;
  value: string;
}

// 계산 과정을 "값 → 연산 → 값" 흐름으로 보여줘서 결과가 어떻게 나왔는지 그대로 읽히게 한다.
export function CalcStepFlow({ steps, operators }: { steps: CalcStep[]; operators: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
            <p className="text-[11px] text-ink-300">{step.label}</p>
            <p className="text-sm font-bold text-ink-900">{step.value}</p>
          </div>
          {i < operators.length && (
            <span className="text-base font-bold text-primary-400">{operators[i]}</span>
          )}
        </div>
      ))}
    </div>
  );
}
