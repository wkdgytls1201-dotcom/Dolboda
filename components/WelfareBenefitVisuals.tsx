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

// 본인부담금 비교 막대 — 4개 구간의 실제 부담액을 막대 길이로 비교한다.
// 막대는 화면에 들어오면 0→목표 너비로 자란다(스태거 60ms씩 어긋나게 시작).
export function CopayCompareBars({ amount = EXAMPLE_AMOUNT }: { amount?: number }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(150);
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
                {pay.toLocaleString()}원
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
