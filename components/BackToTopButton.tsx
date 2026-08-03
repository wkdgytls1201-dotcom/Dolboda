"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useCompare } from "@/lib/compareContext";

/**
 * 목록이 긴 화면(검색결과 등)에서 얼마간 내려가면 뜨는 맨 위로 가기 버튼.
 *
 * 스크롤 이벤트는 setTimeout으로 스로틀한다(rAF를 안 쓰는 이유는
 * lib/useInViewOnce.ts와 같다 — 프레임을 안 그리는 환경에서 rAF 콜백이 밀려
 * 스로틀 자체가 죽는다). 서버 요청도, 새 의존성도 없다.
 */
export function BackToTopButton({ threshold = 600 }: { threshold?: number }) {
  const [scrolled, setScrolled] = useState(false);
  // 비교함이 뜨면(CompareSelectBar, 탭바 위 같은 자리) 겹치니 그동안은 숨긴다 —
  // 두 화면 상태를 억지로 조율하는 대신 겹칠 수 있는 쪽을 양보시킨다.
  const { selectedIds } = useCompare();
  const visible = scrolled && selectedIds.length === 0;

  useEffect(() => {
    let timer = 0;
    const check = () => {
      timer = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (timer) return;
      timer = window.setTimeout(check, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [threshold]);

  return (
    <button
      type="button"
      aria-label="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      // 모바일 하단 탭바(64px) 위에 겹치지 않게 띄운다. z-30: 탭바(z-40)보다는 아래,
      // 카드보다는 위. 비교함이 뜬 동안은 위에서 숨긴다(visible 계산).
      className={`fixed right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-ink-900/80 text-white shadow-card-hover backdrop-blur transition-all duration-200 ease-snappy active:scale-90 [bottom:calc(76px+env(safe-area-inset-bottom))] sm:bottom-6 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp size={18} />
    </button>
  );
}
