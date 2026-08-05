"use client";

import { useEffect, useRef, useState } from "react";

// 스크롤 등장 애니메이션.
//
// 원칙: 서버 HTML에서는 항상 보이는 상태로 내보낸다.
// 예전엔 첫 렌더부터 opacity-0이라 하이드레이션이 끝나고 IntersectionObserver가 돌 때까지
// 콘텐츠가 통째로 안 보였다 — 느린 폰에서 LCP가 그만큼 늦어지고, JS가 죽으면 빈 화면이 된다.
// 지금은 마운트 후 "아직 화면 밖에 있는" 요소만 숨겼다가 스크롤로 들어올 때 등장시킨다.
// 처음부터 화면 안에 있던 요소는 숨긴 적이 없으니 깜빡임도 없다.
//
// 홈에는 이 컴포넌트가 카드마다 붙어 30개 넘게 마운트된다 — 각자 IntersectionObserver를
// 만들면 옵저버가 30개 생긴다. 모듈 레벨 옵저버 하나를 전부가 공유하고, 등장이 끝난
// 요소는 그때그때 unobserve한다.
type Phase = "ssr" | "hidden" | "shown";

const callbacks = new WeakMap<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          callbacks.get(entry.target)?.();
          callbacks.delete(entry.target);
          sharedObserver!.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );
  }
  return sharedObserver;
}

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("ssr");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 움직임에 민감한 사용자는 처음부터 숨기지 않는다 — app/globals.css의 애니메이션
    // 일괄 해제는 .animate-* 클래스만 잡는데, 이 컴포넌트는 그 클래스 대신 순수
    // Tailwind transition 유틸을 자바스크립트로 켜고 끄기 때문에 거기 안 걸린다.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // IO가 없는 구형 웹뷰에서는 숨기지 않는다 — 영영 안 보이는 것보다 낫다
    if (typeof IntersectionObserver === "undefined") return;
    // 이미 화면 안(또는 그 위)에 있으면 숨겼다 보여줄 이유가 없다 — 그대로 둔다
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setPhase("hidden");
    callbacks.set(el, () => setPhase("shown"));
    const obs = getObserver();
    obs.observe(el);
    return () => {
      callbacks.delete(el);
      obs.unobserve(el);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${
        phase === "hidden"
          ? "translate-y-6 opacity-0"
          : phase === "shown"
          ? "translate-y-0 opacity-100 transition-all duration-700 ease-out"
          : "" // ssr: 클래스 없음 = 보이는 상태 그대로
      } ${className}`}
      style={phase === "shown" ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
