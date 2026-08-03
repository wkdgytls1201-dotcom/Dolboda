"use client";

import { useEffect, useState } from "react";
import { useInViewOnce } from "@/lib/useInViewOnce";
import { COPAY_TIERS, EXAMPLE_AMOUNT, copayOf } from "@/lib/welfareEquipment";

// 복지용구 페이지 전용 시각 요소 두 가지: 큰 숫자 카운트업, 본인부담금 비교 막대.
//
// setTimeout 계단식 증가를 쓴다(requestAnimationFrame 아님) — 이 앱을 미리보기하는
// 자동화 환경은 화면이 합성되지 않을 때 rAF 콜백이 아예 안 불린다는 걸 5차 세션에서
// 실측했다(HANDOVER 5차 §1-3). setTimeout은 그 환경에서도 그대로 진행돼 검증 가능하고,
// 실제 사용자 환경(백그라운드 탭 등)에서도 rAF보다 안정적으로 끝까지 도달한다.

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 0에서 목표값까지 숫자가 올라가는 효과. 화면에 들어왔을 때 한 번만 실행. */
export function CountUpNumber({
  value,
  suffix = "",
  durationMs = 900,
  className,
}: {
  value: number;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>(150);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const steps = 24;
    const stepMs = Math.max(16, Math.round(durationMs / steps));
    let i = 0;
    // ease-out: 처음엔 빠르게, 끝에 가까워질수록 천천히 — 숫자가 딱 멈추는 지점이
    // 도착지처럼 느껴진다(선형 증가는 뚝 끊기는 느낌을 준다)
    const timer = setInterval(() => {
      i++;
      const t = i / steps;
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (i >= steps) {
        setDisplay(value);
        clearInterval(timer);
      }
    }, stepMs);
    return () => clearInterval(timer);
  }, [inView, value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// 원형 게이지 — "160만원"을 숫자로만 보여주는 것보다 꽉 찬 링이 도는 걸 보여주면
// "받을 수 있는 몫이 이만큼"이라는 크기가 더 체감된다. CountUpNumber와 같은 계단식
// setInterval을 쓴다(이 파일 최상단 설명과 같은 이유).
//
// 원 안에는 "만원" 단위로 줄여 보여준다 — "1,600,000원"을 그대로 넣으면 지름
// 148px 링 안에서 글자가 삐져나온다(실측). 정확한 원 단위 숫자는 링 바깥
// 다른 곳(비교 막대 등)에서 이미 보여주고 있어 정보 손실이 없다.
export function BenefitGauge({
  value,
  size = 148,
  strokeWidth = 12,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(150);
  const [progress, setProgress] = useState(0); // 0~1
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }
    const steps = 30;
    const stepMs = 30;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      const t = i / steps;
      setProgress(1 - Math.pow(1 - t, 3));
      if (i >= steps) {
        setProgress(1);
        clearInterval(timer);
      }
    }, stepMs);
    return () => clearInterval(timer);
  }, [inView]);

  return (
    <div ref={ref} className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-white/25" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className="stroke-white"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference * (1 - progress),
            transition: "stroke-dashoffset 30ms linear",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[28px] font-extrabold leading-none text-white">
          <CountUpNumber value={Math.round(value / 10000)} suffix="만원" />
        </span>
      </div>
    </div>
  );
}

// 본인부담금 비교 막대 — 4개 구간의 실제 부담액을 막대 길이로 비교한다.
// 막대는 화면에 들어오면 0→목표 너비로 자란다(스태거 60ms씩 어긋나게 시작).
//
// margin을 0으로 둔다(다른 곳의 useInViewOnce 기본값 150~300과 다르게) — 이 섹션이
// 첫 화면 근처라 여유 마진을 주면 실제로 스크롤해 도착하기도 전에, 페이지가 열리자마자
// "미리" 감지돼 애니메이션이 이미 끝나 있는 게 실측됐다. 마진 0은 실제로 뷰포트 안에
// 들어온 시점에만 반응해, "스크롤해서 보니 마침 올라간다"는 느낌을 만든다.
export function CopayCompareBars({ amount = EXAMPLE_AMOUNT }: { amount?: number }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0);
  const max = COPAY_TIERS[0].rate * amount || 1; // 일반(가장 높은 부담률)을 100%로 잡는다

  return (
    <div ref={ref} className="space-y-3">
      {COPAY_TIERS.map((tier, i) => {
        const pay = copayOf(amount, tier.rate);
        const widthPct = Math.max(4, Math.round((pay / max) * 100));
        return (
          <div key={tier.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-ink-900">{tier.label}</span>
              <span className="text-lg font-extrabold text-primary-600">
                {inView ? (
                  <CountUpNumber value={pay} suffix="원" durationMs={700} />
                ) : (
                  `0원`
                )}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-peach-400 transition-all ease-out"
                style={{
                  width: inView ? `${widthPct}%` : "0%",
                  transitionDuration: "700ms",
                  transitionDelay: `${i * 60}ms`,
                }}
              />
            </div>
            <p className="mt-0.5 text-[11px] text-ink-300">{tier.who}</p>
          </div>
        );
      })}
    </div>
  );
}
