"use client";

import { useEffect, useState } from "react";
import { InfoTooltip } from "./InfoTooltip";
import { useInViewOnce } from "@/lib/useInViewOnce";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function CountUp({ target, durationMs = 1100 }: { target: number; durationMs?: number }) {
  // margin 0 — 실제로 뷰포트에 들어왔을 때만 시작한다. 여유 마진을 주면 스크롤해
  // 도착하기 전에 이미 다 올라가 있어서 "숫자가 안 움직인다"로 보인다(복지용구
  // 본인부담금 막대에서 같은 문제를 실측하고 고친 적이 있다).
  const { ref, inView } = useInViewOnce<HTMLSpanElement>(0);
  // 초기값을 0이 아니라 target으로 — 서버 HTML과 검색봇, JS가 늦게 뜨는 기기에서도
  // "0곳"이 아니라 실제 숫자가 보인다. 0으로 낮추는 건 마운트 이후(=하이드레이션이
  // 끝난 뒤)라 서버·클라이언트 첫 렌더가 어긋나지 않는다.
  const [value, setValue] = useState(target);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    setValue(0);
    setArmed(true);
  }, []);

  useEffect(() => {
    if (!armed || !inView) return;
    // requestAnimationFrame이 아니라 setInterval 계단식으로 올린다 — 화면이 합성되지
    // 않는 상황(백그라운드 탭, 미리보기 자동화)에서 rAF 콜백이 아예 불리지 않아
    // 숫자가 0에 멈춰 있었다. setInterval은 그 환경에서도 끝까지 도달한다.
    const steps = 30;
    const stepMs = Math.max(16, Math.round(durationMs / steps));
    let i = 0;
    const timer = setInterval(() => {
      i++;
      // ease-out — 끝에 가까울수록 느려져 도착점이 또렷하다
      const eased = 1 - Math.pow(1 - i / steps, 3);
      setValue(Math.round(target * eased));
      if (i >= steps) {
        setValue(target);
        clearInterval(timer);
      }
    }, stepMs);
    return () => clearInterval(timer);
  }, [armed, inView, target, durationMs]);

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
