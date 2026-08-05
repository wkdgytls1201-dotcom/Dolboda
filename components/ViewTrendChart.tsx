"use client";

import { useId, useState } from "react";

/**
 * 최근 N일 추이 그래프. 기업회원 콘솔(조회수)과 월간 성과 보고서(조회수) 둘 다에서 쓴다.
 *
 * 2026-08-06 개편: 납작한 막대 → **면적 그래프(그라데이션 채움 + 선 + 평균선)**.
 * 유료 시설에 보여주는 화면이라 "숫자가 있다"를 넘어 "읽을 만한 대시보드"로 보여야 한다.
 * 막대 30개는 흐름(늘고 있나 줄고 있나)이 잘 안 읽히는데, 면적은 추세가 한눈에 들어온다.
 *
 * 여전히 차트 라이브러리를 쓰지 않는다 — 인라인 SVG 하나면 되고, 번들이 늘지 않는다.
 * (recharts류를 넣으면 이 화면 하나 때문에 100KB+가 붙는다)
 *
 * 상호작용은 그대로 유지: 막대 자리마다 투명 히트 영역이 있어 탭·호버·키보드로 그날 값을
 * 아래 캡션에 띄운다. 기본값은 마지막 날이라 아무것도 안 눌러도 최신 숫자가 보인다.
 *
 * `date`는 이미 화면에 보여줄 형태로 포맷된 라벨이어야 한다("8/4") — 호출부마다 날짜 원본
 * 형식이 다르므로(콘솔은 ISO, 보고서는 이미 "M/D") 여기서 다시 파싱하지 않는다.
 */

// SVG 내부 좌표계. 실제 표시 크기는 CSS가 정하고, preserveAspectRatio="none"으로 늘린다 —
// 가로는 화면 폭에 맞춰 늘어나되 세로는 고정 높이라 어느 폭에서도 같은 비율로 보인다.
const VB_W = 300;
const VB_H = 80;
const PAD_TOP = 6; // 꼭짓점이 위쪽에 붙어 잘리지 않도록

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
  // 그라데이션 id는 한 페이지에 차트가 둘 이상 있어도 겹치지 않게 컴포넌트마다 고유해야 한다
  const gradId = useId().replace(/:/g, "");

  if (series.length === 0) return null;

  const max = Math.max(...series.map((d) => d.count), 1);
  const shownIndex = active ?? series.length - 1;
  const shown = series[shownIndex];
  const avg = series.reduce((s, d) => s + d.count, 0) / series.length;

  // 점 좌표 — 값이 하나뿐이면 나눗셈이 0이 되므로 가운데에 둔다
  const xOf = (i: number) => (series.length === 1 ? VB_W / 2 : (i / (series.length - 1)) * VB_W);
  const yOf = (v: number) => PAD_TOP + (1 - v / max) * (VB_H - PAD_TOP);

  const points = series.map((d, i) => ({ x: xOf(i), y: yOf(d.count) }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // 채움 영역은 선을 따라가다 바닥으로 내려와 닫는다
  const area = `${line} L${VB_W},${VB_H} L0,${VB_H} Z`;
  const avgY = yOf(avg);
  const cur = points[shownIndex];

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold text-ink-500">{title}</p>
        <p className="text-[10px] text-ink-300">
          하루 평균 {Math.round(avg).toLocaleString()}
          {unit}
        </p>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="h-20 w-full"
          role="img"
          aria-label={`${title}, 최근 값 ${series[series.length - 1].count}${unit}, 하루 평균 ${Math.round(avg)}${unit}`}
        >
          <defs>
            <linearGradient id={`g-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6250" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#FF6250" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* 평균선 — "보통보다 나은 날인가"를 그래프 위에서 바로 읽게 한다 */}
          <line
            x1="0"
            y1={avgY}
            x2={VB_W}
            y2={avgY}
            stroke="#A9A3BC"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />

          <path d={area} fill={`url(#g-${gradId})`} />
          <path
            d={line}
            fill="none"
            stroke="#FF6250"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            // 가로로 늘어나도 선 두께가 뭉개지지 않게 한다(preserveAspectRatio="none"의 부작용)
            vectorEffect="non-scaling-stroke"
            className="chart-draw"
          />

          {/* 선택된 날 표시 — 세로 안내선 + 점 */}
          <line
            x1={cur.x}
            y1={PAD_TOP}
            x2={cur.x}
            y2={VB_H}
            stroke="#FF6250"
            strokeWidth="1"
            strokeOpacity="0.35"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={cur.x} cy={cur.y} r="3.5" fill="#FF6250" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* 투명 히트 영역 — 그래프 위에 겹쳐 두어 탭·호버·키보드로 날짜를 고른다.
            SVG 안에 넣지 않는 이유: 버튼은 HTML 쪽이 접근성·포커스 처리가 확실하다. */}
        <div className="absolute inset-0 flex">
          {series.map((d, i) => (
            <button
              key={`${d.date}-${i}`}
              type="button"
              className="h-full flex-1 focus:outline-none focus-visible:bg-primary-500/10"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(i)}
              aria-label={`${d.date} ${d.count}${unit}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-ink-300">
        <span>{series[0].date}</span>
        <span className="font-semibold text-ink-500">
          {shown.date} · {shown.count.toLocaleString()}
          {unit}
        </span>
        <span>{series[series.length - 1].date}</span>
      </div>
    </div>
  );
}
