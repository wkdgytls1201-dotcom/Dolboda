"use client";

import { useEffect, useRef, useState } from "react";
import { InfoTooltip } from "./InfoTooltip";

function CountUp({ target, durationMs = 900 }: { target: number; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  // 초기값을 0이 아니라 target으로 — 서버 HTML과 검색봇, JS가 늦게 뜨는 기기에서도
  // "0곳"이 아니라 실제 숫자가 보인다. 애니메이션은 화면에 들어온 순간에만 잠깐 돈다.
  const [value, setValue] = useState(target);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // threshold를 낮게 — 카드가 살짝만 걸쳐도 바로 시작해서 "멈춰있는 0" 구간을 없앤다
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let raf: number;
    const startTime = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, durationMs]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
}

export function StatsStrip({
  stats,
}: {
  stats: { label: string; value: number; suffix: string; tooltip?: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl bg-white p-5 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <p className="text-2xl font-extrabold text-primary-600 sm:text-3xl">
            <CountUp target={stat.value} />
            {stat.suffix}
          </p>
          <p className="mt-1 flex items-center justify-center text-sm text-ink-500">
            {stat.label}
            {stat.tooltip && <InfoTooltip text={stat.tooltip} />}
          </p>
        </div>
      ))}
    </div>
  );
}
