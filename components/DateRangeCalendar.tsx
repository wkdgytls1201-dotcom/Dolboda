"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// 브라우저 기본 <input type="date">는 기기마다 생김새가 제각각이고 범위 선택도 두 번
// 따로 해야 해서, 시작일~종료일을 한 화면에서 고르는 달력을 직접 만들었다.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toKey(d: Date) {
  // 로컬 기준 YYYY-MM-DD (toISOString은 UTC로 밀려 하루 어긋날 수 있다)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(key: string, n: number) {
  const d = new Date(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export interface DateRangeCalendarProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  /** 과거 날짜 선택 차단 (기본 true) */
  disablePast?: boolean;
}

const PRESETS = [
  { label: "1주일", days: 6 },
  { label: "2주일", days: 13 },
  { label: "1개월", days: 29 },
  { label: "3개월", days: 89 },
];

export function DateRangeCalendar({
  start,
  end,
  onChange,
  disablePast = true,
}: DateRangeCalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState(() => {
    const base = start ? new Date(start) : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const todayKey = toKey(today);
  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoPrev = view > minMonth || !disablePast;

  // 기간이 달을 넘어가는 경우가 많아 두 달을 함께 보여준다.
  const months = useMemo(
    () => [view, new Date(view.getFullYear(), view.getMonth() + 1, 1)],
    [view]
  );

  function cellsOf(month: Date) {
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const blanks = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    return [
      ...Array.from({ length: blanks }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
        return { day: i + 1, key: toKey(d), weekday: d.getDay() };
      }),
    ];
  }

  function handlePick(key: string) {
    // 시작일만 있고 그 이후 날짜를 누르면 종료일, 그 외에는 새로 시작일부터.
    if (start && !end && key >= start) {
      onChange(start, key);
      return;
    }
    onChange(key, "");
  }

  function applyPreset(days: number) {
    const from = start && start >= todayKey ? start : todayKey;
    onChange(from, addDays(from, days));
  }

  const totalDays =
    start && end
      ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
      : null;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.days)}
            className="min-h-[36px] rounded-full border border-ink-100 px-3 text-xs font-bold text-ink-500 transition-colors duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 active:scale-95"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          aria-label="이전 달"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 transition-colors duration-150 hover:bg-ink-100 active:scale-95 disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-xs font-semibold text-ink-300">기간을 드래그하듯 두 번 눌러주세요</p>
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          aria-label="다음 달"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 transition-colors duration-150 hover:bg-ink-100 active:scale-95"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        {months.map((month) => (
          <div key={`${month.getFullYear()}-${month.getMonth()}`}>
            <p className="mb-1 text-center text-sm font-bold text-ink-900">
              {month.getFullYear()}년 {month.getMonth() + 1}월
            </p>
            <div className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((w, i) => (
                <span
                  key={w}
                  className={`py-1 text-center text-[11px] font-bold ${
                    i === 0 ? "text-primary-400" : i === 6 ? "text-royal-400" : "text-ink-300"
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {cellsOf(month).map((cell, i) => {
                if (!cell) return <span key={`b${i}`} />;
                const isPast = disablePast && cell.key < todayKey;
                const isStart = cell.key === start;
                const isEnd = cell.key === end;
                const inRange = Boolean(start && end && cell.key > start && cell.key < end);
                const isToday = cell.key === todayKey;
                // 범위 배경은 셀 전체를 채워 연속된 띠처럼 보이게 한다.
                const bandClass = end
                  ? isStart
                    ? "rounded-l-full bg-primary-50"
                    : isEnd
                    ? "rounded-r-full bg-primary-50"
                    : inRange
                    ? "bg-primary-50"
                    : ""
                  : "";

                return (
                  <div key={cell.key} className={`relative flex justify-center ${bandClass}`}>
                    <button
                      type="button"
                      disabled={isPast}
                      onClick={() => handlePick(cell.key)}
                      className={`relative flex h-11 w-full max-w-[44px] items-center justify-center rounded-full text-sm font-semibold transition-all duration-150 active:scale-90 ${
                        isStart || isEnd
                          ? "bg-primary-500 text-white shadow-soft"
                          : isPast
                          ? "cursor-not-allowed text-ink-100"
                          : inRange
                          ? "text-primary-700"
                          : cell.weekday === 0
                          ? "text-primary-500 hover:bg-ink-100"
                          : "text-ink-700 hover:bg-ink-100"
                      }`}
                    >
                      {cell.day}
                      {isToday && !isStart && !isEnd && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary-400" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2.5 text-xs">
        <span className="text-ink-500">
          {start ? (
            <>
              <strong className="font-bold text-ink-900">{start.replace(/-/g, ".")}</strong>
              {end ? (
                <>
                  {" ~ "}
                  <strong className="font-bold text-ink-900">{end.replace(/-/g, ".")}</strong>
                </>
              ) : (
                <span className="text-primary-600"> · 종료일을 골라주세요</span>
              )}
            </>
          ) : (
            "시작일을 골라주세요"
          )}
        </span>
        {totalDays && (
          <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 font-bold text-primary-700">
            총 {totalDays}일
          </span>
        )}
      </div>
    </div>
  );
}
