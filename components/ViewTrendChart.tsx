"use client";

import { useState } from "react";

/**
 * 최근 N일 추이 막대 그래프. 기업회원 콘솔(조회수)과 월간 성과 보고서(조회수) 둘 다에서
 * 쓴다 — 예전엔 report 페이지가 `title` 속성만 있는 정적 막대를 따로 갖고 있었는데,
 * 그건 호버해야만 보이는 데스크톱 전용 툴팁이라 "담당자는 폰으로 본다"는 이 앱의
 * 전제와 안 맞았다. 여기로 합치면서 탭·호버 둘 다 되는 쪽으로 통일했다.
 *
 * 별도 차트 라이브러리 없이 div로 직접 그린다(SVG 스케일 계산보다 flex 막대가 반응형
 * 대응이 간단하고 가볍다). 막대 하나하나를 탭·호버할 수 있게 만들어 그날 정확한 숫자를
 * 아래 캡션에 띄운다 — 기본값은 마지막 날(보통 오늘)이라 아무것도 안 눌러도 최신
 * 숫자가 보인다.
 *
 * `date`는 이미 화면에 보여줄 형태로 포맷된 라벨이어야 한다("8/4") — 호출부마다
 * 날짜 원본 형식이 다르므로(콘솔은 ISO, 보고서는 이미 "M/D") 여기서 다시 파싱하지 않는다.
 */
export function ViewTrendChart({
  series,
  title = "최근 30일 조회 추이",
  unit = "건",
}: {
  series: { date: string; count: number }[];
  title?: string;
  unit?: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (series.length === 0) return null;

  const max = Math.max(...series.map((d) => d.count), 1);
  const shownIndex = active ?? series.length - 1;
  const shown = series[shownIndex];

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      <p className="mb-1.5 text-[11px] font-semibold text-ink-500">{title}</p>
      <div
        className="flex h-16 items-end gap-[2px]"
        role="img"
        aria-label={`${title}, 최근 값 ${series[series.length - 1].count}${unit}`}
      >
        {series.map((d, i) => {
          const heightPct = Math.max(4, Math.round((d.count / max) * 100));
          const isShown = i === shownIndex;
          return (
            <button
              key={`${d.date}-${i}`}
              type="button"
              // 막대 자체가 히트 영역이다 — flex-1이라 30개가 있어도 폰 화면에서 손가락으로
              // 누르기엔 좁지만, 위아래로 꽉 찬 버튼이라 세로 방향 오차는 문제되지 않는다.
              className="group relative h-full flex-1"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(i)}
              aria-label={`${d.date} ${d.count}${unit}`}
            >
              <span
                className={`absolute bottom-0 left-0 right-0 rounded-t-[3px] transition-colors ${
                  isShown ? "bg-primary-500" : "bg-primary-200 group-hover:bg-primary-300"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-ink-300">
        <span>{series[0].date}</span>
        <span className="font-semibold text-ink-500">
          {shown.date} · {shown.count}
          {unit}
        </span>
        <span>{series[series.length - 1].date}</span>
      </div>
    </div>
  );
}
