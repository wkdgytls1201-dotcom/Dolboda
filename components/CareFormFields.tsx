"use client";

import { Check } from "lucide-react";

// 돌봄 요청 마법사에서 반복해서 쓰는 입력 조각들.
// 케어닥은 항목마다 바텀시트를 띄우지만, 우리는 화면 안에서 바로 고르게 해 단계를 줄였다.

export function FieldLabel({
  children,
  optional,
  hint,
}: {
  children: React.ReactNode;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-2">
      {/* 모바일에서 한 손으로 읽기 좋게 라벨을 본문 크기(14px)로 키웠다 */}
      <label className="block text-sm font-bold text-ink-900">
        {children}
        {optional && <span className="ml-1 text-xs font-normal text-ink-300">선택</span>}
      </label>
      {hint && <p className="mt-1 text-xs leading-relaxed text-ink-300">{hint}</p>}
    </div>
  );
}

/** 한 줄에 여러 개가 들어가는 알약형 단일 선택 */
export function ChipSelect({
  options,
  value,
  onChange,
  columns,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={columns === 2 ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
      {options.map((opt) => {
        const on = value === opt;
        return (
          <button
            // opt-on 조합으로 키를 걸어서, 선택 상태가 "막 바뀐" 버튼만 다시 마운트되게 한다
            // (매번 전체가 아니라 방금 눌린 것만 살짝 튀어 보임 — 별점 선택과 같은 방식)
            key={`${opt}-${on}`}
            type="button"
            onClick={() => onChange(on ? "" : opt)}
            className={`min-h-[48px] rounded-xl border px-3.5 py-3 text-left text-sm font-semibold leading-snug transition-all duration-150 active:scale-[0.98] ${
              // 지역 선택 그리드(꽉 찬 색)와 같은 무게로 맞춘다 — 옅은 배경(bg-primary-50)만
              // 쓰던 예전 스타일은 선택했는지 안 했는지가 빠르게 훑을 때 잘 안 들어왔다.
              // 이 컴포넌트가 마법사 3·4단계 대부분의 선택(관계·성별·연령대·거동·식사 등)을
              // 담당하니, 여기 하나를 바꾸면 화면 전체에 일괄 적용된다.
              on
                ? "animate-pop border-primary-500 bg-primary-500 text-white shadow-soft"
                : "border-ink-100 bg-white text-ink-700 hover:border-primary-200 hover:bg-primary-50/40"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** 여러 개 고르는 체크형 */
export function ChipMultiSelect({
  options,
  values,
  onToggle,
  columns,
}: {
  options: readonly string[];
  values: string[];
  onToggle: (v: string) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={columns === 2 ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
      {options.map((opt) => {
        const on = values.includes(opt);
        return (
          <button
            key={`${opt}-${on}`}
            type="button"
            onClick={() => onToggle(opt)}
            className={`flex min-h-[48px] items-center justify-between gap-1.5 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold leading-snug transition-all duration-150 active:scale-[0.98] ${
              on
                ? "animate-pop border-primary-500 bg-primary-500 text-white shadow-soft"
                : "border-ink-100 bg-white text-ink-700 hover:border-primary-200 hover:bg-primary-50/40"
            }`}
          >
            <span>{opt}</span>
            {on && <Check size={14} className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric";
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`min-h-[48px] w-full rounded-xl border border-ink-100 px-3.5 py-3 text-base focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 sm:text-sm ${
          suffix ? "pr-12" : ""
        }`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-300">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-[48px] w-full appearance-none rounded-xl border border-ink-100 bg-white px-3.5 py-3 text-base focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 sm:text-sm"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** 의료행위 안내처럼 조건부로 뜨는 주의 문구 */
export function NoticeBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-accent-200 bg-accent-50 p-3.5 text-xs leading-relaxed text-ink-700">
      {children}
    </p>
  );
}

/** 마법사 안에서 관련 입력을 묶어주는 카드 */
export function FieldGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-ink-100 bg-white p-4">
      {title && <p className="text-sm font-bold text-ink-900">{title}</p>}
      {children}
    </div>
  );
}
