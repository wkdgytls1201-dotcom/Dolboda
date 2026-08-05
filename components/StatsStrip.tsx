"use client";

import { useEffect, useState } from "react";
import { Building2, Award, DoorOpen, type LucideIcon } from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";
import { useInViewOnce } from "@/lib/useInViewOnce";

// 등록 시설 숫자 영역.
//
// 원칙: 실제 숫자가 항상 먼저다.
//  - 서버 HTML에 최종 숫자가 그대로 실린다(검색봇·JS 실패·느린 폰 모두 실숫자를 본다).
//  - 0부터 세는 가짜 카운트업을 하지 않는다 — 대신 화면에 들어올 때 마지막 세 자리만
//    짧게(≈600ms) 굴러 도착하는 슬롯을 한 번 보여준다. 시각 장식일 뿐이라
//    스크린리더에는 최종 숫자만 들리고(aria), reduced-motion에서는 아예 돌지 않는다.
//  - 숫자 폭은 tabular-nums + 자리당 1ch 고정이라 애니메이션 중에도 흔들리지 않는다.
//
// "매일 갱신 · 공공데이터 기준" 라벨은 실제 파이프라인(scripts/daily-nhis-sync.mjs,
// 매일 04:00 KST GitHub Actions)과 연결된 사실이다 — 지어낸 문구가 아니다.

const ROLL_STEPS = 3; // 마지막 몇 단계 전부터 굴릴지 (숫자당 3칸이면 슬롯 느낌은 나되 과하지 않다)
const ROLL_DIGITS = 3; // 뒤에서 몇 자리를 굴릴지

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** 한 자리 슬롯 — 최종 숫자가 기본 상태(SSR·JS 실패·감속 모드 전부 이 상태로 보인다) */
function DigitReel({ digit, play, delayMs }: { digit: number; play: boolean; delayMs: number }) {
  // 열은 [digit-3, digit-2, digit-1, digit] (mod 10) — 마지막 항목이 최종 숫자.
  const column = Array.from({ length: ROLL_STEPS + 1 }, (_, i) => (digit - ROLL_STEPS + i + 10) % 10);
  // 기본 위치: 열의 맨 끝(최종 숫자)이 보인다. play가 켜지면 위(시작)로 순간 이동했다가
  // transform 전환으로 다시 끝까지 내려온다 — translateY만 쓴다.
  const [phase, setPhase] = useState<"rest" | "start" | "rolling">("rest");

  useEffect(() => {
    if (!play) return;
    setPhase("start");
    // 다음 프레임에 rolling으로 바꿔 transition이 걸리게 한다
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("rolling")));
    return () => cancelAnimationFrame(raf);
  }, [play]);

  const atEnd = phase !== "start";
  return (
    <span
      aria-hidden
      className="inline-block h-[1em] w-[1ch] overflow-hidden align-baseline"
    >
      <span
        className="block"
        style={{
          transform: atEnd ? `translateY(-${ROLL_STEPS}em)` : "translateY(0)",
          transition: phase === "rolling" ? `transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) ${delayMs}ms` : "none",
        }}
      >
        {column.map((d, i) => (
          <span key={i} className="block h-[1em] leading-[1em]">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

function StatNumber({ value, suffix }: { value: number; suffix: string }) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>(0);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (inView && !prefersReducedMotion()) setPlay(true);
  }, [inView]);

  const formatted = value.toLocaleString();
  const chars = formatted.split("");
  // 뒤에서부터 숫자 자리만 세어 마지막 N자리를 고른다(쉼표는 건너뜀·고정)
  let digitBudget = ROLL_DIGITS;
  const animate = chars
    .map((c) => {
      if (/\d/.test(c) && digitBudget > 0) {
        digitBudget--;
        return true;
      }
      return false;
    });

  let rollIndex = 0;
  return (
    <span
      ref={ref}
      aria-label={`${formatted}${suffix}`}
      className="whitespace-nowrap [font-variant-numeric:tabular-nums]"
    >
      {/* 시각 트랙 — 스크린리더에는 위 aria-label만 들린다 */}
      <span aria-hidden>
        {chars.map((c, i) => {
          if (animate[i]) {
            const delay = rollIndex++ * 30;
            return <DigitReel key={i} digit={Number(c)} play={play} delayMs={delay} />;
          }
          return <span key={i}>{c}</span>;
        })}
        {suffix}
      </span>
    </span>
  );
}

const STAT_ICONS: Record<string, LucideIcon> = {
  "등록된 시설": Building2,
  "1등급 시설": Award,
  "입소 가능 시설": DoorOpen,
};

export function StatsStrip({
  stats,
}: {
  stats: { label: string; value: number; suffix: string; tooltip?: string }[];
}) {
  return (
    <div className="rounded-2xl bg-white shadow-card">
      {/* 잘게 쪼개진 카드 3장 대신 한 장의 데이터 패널 — 구분선으로 항목을 나눈다.
          작은 화면(320px)에서도 숫자가 안 잘리게 크기는 clamp로 흐른다. */}
      <div className="grid grid-cols-3 divide-x divide-ink-100">
        {stats.map((stat) => {
          const Icon = STAT_ICONS[stat.label];
          return (
            <div key={stat.label} className="flex min-w-0 flex-col items-center px-1 py-4 text-center sm:py-5">
              {Icon && (
                <Icon size={16} className="mb-1.5 text-primary-400" aria-hidden strokeWidth={2.2} />
              )}
              <p className="font-extrabold text-primary-600 [font-size:clamp(1.05rem,4.6vw,1.75rem)]">
                <StatNumber value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-0.5 flex items-center justify-center text-[11px] text-ink-500 sm:text-sm">
                <span className="truncate">{stat.label}</span>
                {stat.tooltip && <InfoTooltip text={stat.tooltip} flush />}
              </p>
            </div>
          );
        })}
      </div>
      <p className="border-t border-ink-100 py-2 text-center text-[11px] text-ink-300">
        공공데이터 기준 · 매일 갱신
      </p>
    </div>
  );
}
