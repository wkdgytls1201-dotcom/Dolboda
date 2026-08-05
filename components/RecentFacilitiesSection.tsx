"use client";

import { useLayoutEffect, useState } from "react";
import { FacilityCard } from "@/components/FacilityCard";
import { FacilityCardSkeleton } from "@/components/FacilityCardSkeleton";
import { Reveal } from "@/components/Reveal";
import { useFacilitiesByIds } from "@/lib/useFacilities";
import { getRecentFacilityIds } from "@/lib/recentFacilities";

const MAX_SHOWN = 6;

/** 홈 "최근 본 시설" — 로컬 열람 기록(lib/recentFacilities)이 있는 사람에게만 나타난다.
 * 서버는 이 기록을 모르므로 처음 렌더는 항상 빈 상태(하이드레이션 안전)이고,
 * useLayoutEffect에서 읽어 페인트 전에 섹션이 세워진다(CLAUDE.md 저장소 규칙). */
export function RecentFacilitiesSection() {
  const [ids, setIds] = useState<string[]>([]);
  useLayoutEffect(() => {
    setIds(getRecentFacilityIds().slice(0, MAX_SHOWN));
  }, []);

  const { facilities: fetched, loading } = useFacilitiesByIds(ids, { card: true });
  // 최신순(기록 순서) 유지 — API는 ids 순서를 보장하지 않는다(비교함과 같은 요령)
  const facilities = ids
    .map((id) => fetched.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f !== undefined);

  // 기록이 없거나, 조회가 끝났는데 전부 사라진 시설이면(폐업 등) 섹션 자체를 안 그린다
  if (ids.length === 0 || (!loading && facilities.length === 0)) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 [content-visibility:auto] [contain-intrinsic-size:auto_600px]">
      <Reveal className="mb-5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <h2 className="text-xl font-bold text-ink-900">최근 본 시설</h2>
        <span className="text-sm text-ink-300">다시 보고 싶은 곳을 빠르게</span>
      </Reveal>
      {loading && facilities.length === 0 ? (
        <FacilityCardSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((f, i) => (
            <Reveal key={f.id} delay={i * 60}>
              <FacilityCard facility={f} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
