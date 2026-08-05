"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

// flush: 44px 히트영역은 유지하되 차지하는 가로 공간만 아이콘 크기 수준으로 줄인다
// (세로를 -my-2로 겹치는 것과 같은 수법). 통계 패널처럼 3열 셀 안에 라벨과 한 줄로
// 서야 하는 자리에서 쓴다 — 기본값이면 버튼 44px가 320~375px 화면에서 셀을 밀어낸다.
export function InfoTooltip({ text, flush = false }: { text: string; flush?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  // 말풍선이 화면 밖으로 나가는 만큼 안쪽으로 밀어 넣는 보정(px).
  // 통계 패널 맨 오른쪽 칸(입소 가능 시설)처럼 화면 가장자리에 붙은 ?는
  // 가운데 정렬(w-56의 절반이 오른쪽으로 112px)이 그대로 잘려 나갔다(실측 제보).
  const [shift, setShift] = useState(0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 열리는 프레임에 위치를 재고 화면 안으로 클램프 — 페인트 전에 보정해 깜빡임이 없다
  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const el = bubbleRef.current;
    if (!el) return;
    const pad = 12;
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth - pad) setShift(window.innerWidth - pad - r.right);
    else if (r.left < pad) setShift(pad - r.left);
  }, [open]);

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label="용어 설명"
        onClick={() => setOpen((o) => !o)}
        // 아이콘은 작게 보이되 손가락으로 누를 수 있게 실제 버튼 영역은 넉넉히
        className={`${
          flush ? "-mx-3 -my-2" : "-my-2 ml-0.5"
        } inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-300 transition-colors duration-150 hover:bg-ink-100 hover:text-primary-500 active:scale-90`}
      >
        <HelpCircle size={14} />
      </button>

      {open && (
        <span
          ref={bubbleRef}
          style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
          className="absolute left-1/2 top-full z-30 mt-2 w-56 rounded-xl bg-ink-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-soft"
        >
          {text}
          {/* 화살표는 말풍선이 밀려도 ? 아이콘을 계속 가리키게 반대로 보정한다 */}
          <span
            style={{ left: `calc(50% - ${shift}px)` }}
            className="absolute -top-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink-900"
          />
        </span>
      )}
    </span>
  );
}
