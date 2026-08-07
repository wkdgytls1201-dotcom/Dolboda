"use client";

import { useState } from "react";

/**
 * 공단 원본 텍스트(오시는 길·주차 안내 등)는 길이가 들쭉날쭉하다 — "오시는 길" 실측
 * 중앙값 94자, p90 249자, p99 566자, 최댓값 1,713자(버스 노선을 전부 나열한
 * 경우, 2026-08-07). 문턱을 400자로 잡아 "아주 많이 긴 것"(대략 상위 1~2%)만
 * 접는다 — p90(249자)대까지는 자세한 안내일 뿐이라 그대로 보여주는 게 낫다
 * (사용자 결정 — 처음엔 140자로 잡았다가 "너무 많이 접힌다"고 올림).
 */
export function ClampedText({ text, threshold = 400 }: { text: string; threshold?: number }) {
  const [expanded, setExpanded] = useState(false);
  const needsClamp = text.length > threshold;

  if (!needsClamp) return <>{text}</>;

  return (
    <>
      <span className={expanded ? "" : "line-clamp-3"}>{text}</span>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 block min-h-[28px] text-xs font-semibold text-primary-600 hover:underline"
      >
        {expanded ? "접기" : "더보기"}
      </button>
    </>
  );
}
