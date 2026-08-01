"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Sparkles } from "lucide-react";
import type { Facility } from "@/lib/types";
import { FACILITY_TYPE_LABEL } from "@/lib/types";
import { GradeBadge } from "./GradeBadge";
import { formatDistance } from "@/lib/distance";
import { INTENT_META, type SimilarIntent, type SimilarDelta } from "@/lib/similarity";
import { FacilityThumbnail } from "./FacilityThumbnail";

export interface SimilarItem {
  facility: Facility;
  distanceKm?: number;
  similarity: number;
  reasons: string[];
  deltas: SimilarDelta[];
}

// 보호자가 대안을 찾는 순간에는 이유가 있다 — "자리가 없네", "너무 머네", "비싸네".
// 그래서 단순 목록이 아니라 의도별 탭으로 나누고, 현재 시설 대비 차이를 배지로 보여준다.
const INTENTS: SimilarIntent[] = ["similar", "better", "available", "cheaper", "closer"];

export function SimilarFacilities({
  facilityId,
  initialItems = [],
}: {
  facilityId: string;
  /** 서버에서 계산해 넘어온 "비슷한 곳" — 첫 화면은 이걸 그대로 써서 스켈레톤을 건너뛴다 */
  initialItems?: SimilarItem[];
}) {
  const [intent, setIntent] = useState<SimilarIntent>("similar");
  // 서버가 5개 의도를 한 번에 내려준다 — 첫 탭 전환에서 한 번만 받고 이후는 전부 즉시 전환된다.
  // (예전엔 탭마다 요청이 나갔고, 그 한 번이 후보 400곳을 다시 받아 다시 채점하는 일이었다)
  const [cache, setCache] = useState<Partial<Record<SimilarIntent, SimilarItem[]>>>({
    similar: initialItems,
  });
  const [loading, setLoading] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (cache[intent] || requested.current) return;
    requested.current = true;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/facilities/similar?id=${encodeURIComponent(facilityId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { intents?: Partial<Record<SimilarIntent, SimilarItem[]>> }) => {
        if (cancelled) return;
        // 첫 화면분(similar)은 서버 렌더링으로 이미 받은 것을 유지한다
        setCache((c) => ({ ...d.intents, similar: c.similar ?? d.intents?.similar ?? [] }));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        requested.current = false;
        setCache((c) => ({ ...c, [intent]: [] }));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId, intent, cache]);

  const items = cache[intent] ?? (loading ? null : []);

  return (
    <div>
      {/* 의도 탭 — 줄바꿈으로 5개를 전부 보여준다.
          예전엔 가로 스크롤이었는데 5개가 375px을 넘어서 마지막 "더 가까운 곳"이 화면 밖에
          있었고, 스크롤바까지 숨겨져 있어 더 있다는 것도 알 수 없었다.
          여기서 고를 수 있는 관점이 이 기능의 전부라, 두 줄이 되더라도 다 보이는 쪽이 맞다. */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {INTENTS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setIntent(key)}
            aria-pressed={intent === key}
            className={`min-h-[44px] rounded-full px-4 text-[13px] font-bold transition-colors duration-150 ${
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
