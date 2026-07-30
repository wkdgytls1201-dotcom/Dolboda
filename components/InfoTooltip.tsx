"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label="용어 설명"
        onClick={() => setOpen((o) => !o)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-ink-300 transition-colors duration-150 hover:text-primary-500"
      >
        <HelpCircle size={14} />
      </button>

      {open && (
        <span className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-xl bg-ink-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-soft">
          {text}
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink-900" />
        </span>
      )}
    </span>
  );
}
