"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useCompare } from "@/lib/compareContext";
import { useFacilitiesByIds } from "@/lib/useFacilities";

export function CompareSelectBar() {
  const { selectedIds, toggle, clear, maxCompare } = useCompare();
  const { facilities } = useFacilitiesByIds(selectedIds);
  const router = useRouter();

  if (selectedIds.length === 0) return null;

  return (
    <div className="animate-slide-up fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(27,23,48,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {selectedIds.map((id, idx) => {
            const f = facilities.find((x) => x.id === id);
            if (!f) return null;
            return (
              <span
                key={id}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-3 pr-1.5 text-sm font-medium text-primary-700"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
                {f.name}
                <button
                  type="button"
                  aria-label="선택 해제"
                  onClick={() => toggle(id)}
                  className="-my-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-primary-100 active:scale-90"
                >
                  <X size={14} />
                </button>
              </span>
            );
          })}
          <span className="shrink-0 text-xs text-ink-300">최대 {maxCompare}개</span>
        </div>

        <button
          type="button"
          onClick={clear}
          className="hidden shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-ink-500 transition-colors duration-200 hover:bg-ink-100 sm:block"
        >
          전체 해제
        </button>
        <button
          type="button"
          disabled={selectedIds.length < 2}
          onClick={() => router.push(`/compare?ids=${selectedIds.join(",")}`)}
          className="shrink-0 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-ink-100 disabled:text-ink-300 disabled:shadow-none"
        >
          {selectedIds.length}개 비교하기
        </button>
      </div>
    </div>
  );
}
