"use client";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 active:scale-95 ${
        checked ? "bg-primary-500 hover:bg-primary-600" : "bg-ink-100 hover:bg-ink-100/80"
      }`}
    >
      <span
        // translate-x 계산값(px든 rem이든)으로 옮기던 방식은 켜졌을 때 손잡이가 오른쪽
        // 끝을 넘어서거나 못 미치는 문제가 있었다. left/right를 직접 지정하면 같은
        // 트랙 안에서 항상 대칭으로 맞아떨어지니 계산 오차가 생길 여지가 없다.
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ease-snappy ${
          checked ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  );
}
