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
    <div className="mb-1.5">
      <label className="block text-xs font-semibold text-ink-700">
        {children}
        {optional && <span className="ml-1 font-normal text-ink-300">(선택)</span>}
      </label>
      {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-ink-300">{hint}</p>}
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
            key={opt}
            type="button"
            onClick={() => onChange(on ? "" : opt)}
            className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 ${
              on
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-ink-100 bg-white text-ink-500 hover:bg-ink-100/60"
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
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 ${
              on
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-ink-100 bg-white text-ink-500 hover:bg-ink-100/60"
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
        className={`w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 ${
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
      className="w-full appearance-none rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
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
    <p className="rounded-xl bg-accent-50 p-3 text-xs leading-relaxed text-ink-700">{children}</p>
  );
}
