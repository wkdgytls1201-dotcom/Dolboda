"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Sparkles } from "lucide-react";
import type { Facility } from "@/lib/types";
import { FACILITY_TYPE_LABEL } from "@/lib/types";
import { GradeBadge } from "./GradeBadge";
import { formatDistance } from "@/lib/distance";
import { INTENT_META, type SimilarIntent, type SimilarDelta } from "@/lib/similarity";
import { FacilityThumbnail } from "./FacilityThumbnail";

interface SimilarItem {
  facility: Facility;
  distanceKm?: number;
  similarity: number;
  reasons: string[];
  deltas: SimilarDelta[];
}

// 보호자가 대안을 찾는 순간에는 이유가 있다 — "자리가 없네", "너무 머네", "비싸네".
// 그래서 단순 목록이 아니라 의도별 탭으로 나누고, 현재 시설 대비 차이를 배지로 보여준다.
const INTENTS: SimilarIntent[] = ["similar", "closer", "available", "cheaper", "better"];

export function SimilarFacilities({ facilityId }: { facilityId: string }) {
  const [intent, setIntent] = useState<SimilarIntent>("similar");
  const [items, setItems] = useState<SimilarItem[] | null>(null);
  // 의도별 결과를 캐시해 탭을 오갈 때 매번 다시 부르지 않게 한다
  const [cache, setCache] = useState<Partial<Record<SimilarIntent, SimilarItem[]>>>({});

  useEffect(() => {
    const cached = cache[intent];
    if (cached) {
      setItems(cached);
      return;
    }
    let cancelled = false;
    setItems(null);
    fetch(`/api/facilities/similar?id=${encodeURIComponent(facilityId)}&intent=${intent}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        const list: SimilarItem[] = d.items ?? [];
        setItems(list);
        setCache((c) => ({ ...c, [intent]: list }));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId, intent, cache]);

  return (
    <div>
      {/* 의도 탭 — 모바일에서 엄지로 밀어 넘기게 가로 스크롤 */}
      <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {INTENTS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setIntent(key)}
            aria-pressed={intent === key}
            className={`min-h-[44px] shrink-0 rounded-full px-4 text-xs font-bold transition-colors duration-150 ${
              intent === key
                ? "bg-ink-900 text-white"
                : "bg-white text-ink-500 shadow-card hover:text-ink-900"
            }`}
          >
            {INTENT_META[key].label}
          </button>
        ))}
      </div>

      {items === null && (
        // 스켈레톤 — 빈 화면 대신 카드 자리를 미리 잡아 레이아웃이 튀지 않게
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-52 w-[78vw] shrink-0 animate-pulse rounded-2xl bg-white/70 sm:w-72"
              aria-hidden
            />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <p className="rounded-2xl bg-ink-100/40 p-4 text-sm leading-relaxed text-ink-500">
          {INTENT_META[intent].empty}
        </p>
      )}

      {items && items.length > 0 && (
        <div className="-mx-4 -my-2 flex snap-x gap-3 overflow-x-auto px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <Link
              key={item.facility.id}
              href={`/facility/${item.facility.id}`}
              // 다음 카드가 살짝 걸쳐 보이게 78vw — 옆으로 더 있다는 걸 알려주는 모바일 패턴
              className="w-[78vw] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-card transition-transform active:scale-[0.99] sm:w-72"
            >
              <div className="aspect-[16/9] overflow-hidden">
                <FacilityThumbnail facility={item.facility} />
              </div>
              <div className="p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <GradeBadge
                    grade={item.facility.grade}
                    gradeSource={item.facility.gradeSource}
                  />
                  <span className="text-[11px] text-ink-300">
                    {FACILITY_TYPE_LABEL[item.facility.facilityType]}
                  </span>
                </div>

                <p className="mb-1 truncate text-[15px] font-bold text-ink-900">
                  {item.facility.name}
                </p>

                <p className="mb-2 flex items-center gap-1 text-[11px] text-ink-400">
                  <MapPin size={11} className="shrink-0" />
                  <span className="truncate">{item.facility.address}</span>
                  {item.distanceKm !== undefined && (
                    <span className="shrink-0 font-semibold text-mint-600">
                      {formatDistance(item.distanceKm)}
                    </span>
                  )}
                </p>

                {/* 현재 시설 대비 차이 — 대안을 고를 때 실제로 보는 것 */}
                {item.deltas.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {item.deltas.map((d) => (
                      <span
                        key={d.label}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          d.tone === "good"
                            ? "bg-mint-100 text-mint-700"
                            : "bg-ink-100/60 text-ink-500"
                        }`}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                )}

                {item.reasons.length > 0 && (
                  <p className="flex items-center gap-1 text-[11px] text-ink-400">
                    <Sparkles size={10} className="shrink-0 text-royal-400" />
                    <span className="truncate">{item.reasons[0]}</span>
                  </p>
                )}
              </div>
            </Link>
          ))}

          {/* 마지막에 전체 검색으로 나가는 카드 — 캐러셀 끝에서 막다른 길이 되지 않게 */}
          <Link
            href="/search"
            className="flex w-[52vw] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink-100 bg-white/60 text-xs font-bold text-ink-500 sm:w-40"
          >
            <ChevronRight size={18} className="text-ink-300" />
            더 많은 시설
            <span className="font-medium text-ink-300">조건으로 찾기</span>
          </Link>
        </div>
      )}
    </div>
  );
}
