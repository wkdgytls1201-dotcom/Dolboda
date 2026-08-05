"use client";

import { useLayoutEffect, useRef } from "react";

// 필터·정렬이 바뀔 때 시설 카드가 "사라졌다 다시 나타나는" 대신 이전 자리에서
// 새 자리로 미끄러져 가게 하는 FLIP(First-Last-Invert-Play) 훅.
//
// 성능 가드(스펙):
//  - transform만 애니메이션한다(Web Animations API — 합성 스레드에서 돈다).
//  - 화면 근처(뷰포트 ±1화면)에 있는 카드만 움직인다. 화면 밖은 어차피 안 보인다.
//  - 움직일 카드가 너무 많으면(40장 초과) 통째로 생략 — 과한 동시 애니메이션 금지.
//  - prefers-reduced-motion이면 아예 하지 않는다.
//  - 새로 들어오는 카드는 기존 animate-fade-up(마운트 시 CSS)이 처리하고,
//    빠지는 카드는 즉시 제거한다(제거 애니메이션은 노드를 붙잡아야 해서 복잡도 대비 이득이 없다).
//
// 사용: 카드 래퍼에 data-flip-id={시설id}를 달고, 목록이 바뀔 때 함께 바뀌는 값을 key로 넘긴다.
export function useFlipGrid(containerRef: React.RefObject<HTMLElement | null>, key: unknown) {
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const keyRef = useRef(key);

  // 목록이 바뀌기 "직전" 위치는 렌더 전에 잡아둘 수 없으므로(React 커밋 타이밍),
  // 매 커밋 후의 위치를 저장해 두었다가 다음 커밋에서 이전 값으로 쓴다.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = container.querySelectorAll<HTMLElement>("[data-flip-id]");
    const nextRects = new Map<string, DOMRect>();
    nodes.forEach((node) => {
      const id = node.dataset.flipId!;
      nextRects.set(id, node.getBoundingClientRect());
    });

    const keyChanged = keyRef.current !== key;
    keyRef.current = key;

    if (
      keyChanged &&
      prevRects.current.size > 0 &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const vh = window.innerHeight;
      const moves: { node: HTMLElement; dx: number; dy: number }[] = [];
      nodes.forEach((node) => {
        const id = node.dataset.flipId!;
        const prev = prevRects.current.get(id);
        if (!prev) return; // 새로 들어온 카드 — CSS fade-up이 담당
        const next = nextRects.get(id)!;
        // 이전·새 위치 둘 다 화면에서 멀면 스킵
        const nearViewport =
          (next.top > -vh && next.top < vh * 2) || (prev.top > -vh && prev.top < vh * 2);
        if (!nearViewport) return;
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        moves.push({ node, dx, dy });
      });

      if (moves.length > 0 && moves.length <= 40) {
        for (const { node, dx, dy } of moves) {
          node.animate(
            [
              { transform: `translate(${dx}px, ${dy}px)` },
              { transform: "translate(0, 0)" },
            ],
            { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
          );
        }
      }
    }

    prevRects.current = nextRects;
  });
}
