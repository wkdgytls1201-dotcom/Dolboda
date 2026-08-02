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
    // 트랙(24px)은 그대로 두고 버튼에 세로 여백을 줘서 터치 영역만 44px로 넓힌다.
    // 스위치를 44px로 키우면 목록이 성기고 촌스러워지는데, 정작 손가락으로는 자꾸
    // 빗나가는 게 실제 문제라 "보이는 크기"와 "누르는 크기"를 분리한다.
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="-my-2.5 flex min-h-[44px] shrink-0 items-center py-2.5 active:scale-95"
    >
      <span
        className={`relative block h-6 w-11 rounded-full transition-colors duration-200 ${
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
      </span>
    </button>
  );
}
