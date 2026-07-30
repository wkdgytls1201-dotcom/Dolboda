"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { List, Map as MapIcon } from "lucide-react";
import { FacilityCard } from "@/components/FacilityCard";
import { CompareSelectBar } from "@/components/CompareSelectBar";
import { FilterBar, FacilityFilters, EMPTY_FILTERS } from "@/components/FilterBar";
import { KakaoMultiMap } from "@/components/KakaoMap";
import { useFacilities } from "@/lib/useFacilities";
import { DEFAULT_ORIGIN, haversineDistanceKm } from "@/lib/distance";
import { FacilityType, isHospital } from "@/lib/types";

type SortKey = "distance" | "grade" | "rating";

const SORT_LABEL: Record<SortKey, string> = {
  distance: "거리순",
  grade: "등급순",
  rating: "평점순",
};

function SearchContent() {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const initialType = params.get("type") as FacilityType | null;

  const [query, setQuery] = useState(initialQuery);
  // 검색어 없이는 전국 22,000여건을 다 못 내려주니 최근 등록순 300건만 기본으로 보여주고,
  // 검색어를 입력하면 서버에서 이름/주소로 먼저 좁혀서 받아온다.
  const { facilities, total } = useFacilities({ q: query, limit: 300 });
  const [view, setView] = useState<"list" | "map">("list");
  const [sortKey, setSortKey] = useState<SortKey>("distance");
  const [filters, setFilters] = useState<FacilityFilters>({
    ...EMPTY_FILTERS,
    types: initialType ? [initialType] : [],
  });

  const origin = DEFAULT_ORIGIN;

  const results = useMemo(() => {
    let list = facilities.map((f) => ({
      f,
      dist:
        f.lat !== undefined && f.lng !== undefined
          ? haversineDistanceKm(origin.lat, origin.lng, f.lat, f.lng)
          : undefined,
    }));

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (x) => x.f.name.toLowerCase().includes(q) || x.f.address.toLowerCase().includes(q)
      );
    }
    if (filters.types.length > 0) {
      list = list.filter((x) => filters.types.includes(x.f.facilityType));
    }
    if (filters.grades.length > 0) {
      list = list.filter((x) => x.f.grade !== null && filters.grades.includes(x.f.grade));
    }
    if (filters.maxDistanceKm !== null) {
      list = list.filter((x) => x.dist !== undefined && x.dist <= filters.maxDistanceKm!);
    }
    if (filters.departments.length > 0) {
      list = list.filter(
        (x) =>
          isHospital(x.f) &&
          x.f.departments.some((d) => filters.departments.includes(d.name))
      );
    }
    if (filters.onlyVacancy) {
      list = list.filter((x) => {
        if (isHospital(x.f)) return true;
        if (x.f.capacity === 0) return true;
        if (x.f.currentOccupancy === undefined) return false;
        return x.f.capacity - x.f.currentOccupancy > 0;
      });
    }
    if (filters.verifiedOnly) {
      list = list.filter((x) => x.f.dataSource === "public");
    }

    list.sort((a, b) => {
      if (sortKey === "distance") return (a.dist ?? Infinity) - (b.dist ?? Infinity);
      if (sortKey === "grade") {
        if (a.f.grade === null) return 1;
        if (b.f.grade === null) return -1;
        return a.f.grade - b.f.grade;
      }
      // 평점순: 별도 이용자 평점 데이터가 없어 등급 우선 + 최근 설립순으로 대체
      if (a.f.grade === null && b.f.grade === null)
        return (b.f.establishedYear ?? 0) - (a.f.establishedYear ?? 0);
      if (a.f.grade === null) return 1;
      if (b.f.grade === null) return -1;
      return a.f.grade - b.f.grade || (b.f.establishedYear ?? 0) - (a.f.establishedYear ?? 0);
    });

    return list;
  }, [facilities, query, filters, sortKey, origin]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-28">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="mb-6 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-card"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="지역, 시설명으로 검색"
          className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
        />
      </form>

      <div className="sticky top-16 z-20 mb-6 flex flex-col gap-3 rounded-2xl bg-white/90 p-3 shadow-card backdrop-blur sm:flex-row sm:items-start sm:justify-between">
        <FilterBar filters={filters} onChange={setFilters} facilities={facilities} />

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-ink-100">
            {(["distance", "grade", "rating"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  sortKey === key
                    ? "bg-primary-500 text-white"
                    : "bg-white text-ink-500 hover:bg-ink-100"
                }`}
              >
                {SORT_LABEL[key]}
              </button>
            ))}
          </div>

          <div className="flex overflow-hidden rounded-xl border border-ink-100">
            <button
              onClick={() => setView("list")}
              aria-label="리스트 보기"
              className={`p-2 transition-colors duration-150 ${
                view === "list" ? "bg-primary-500 text-white" : "bg-white text-ink-500 hover:bg-ink-100"
              }`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView("map")}
              aria-label="지도 보기"
              className={`p-2 transition-colors duration-150 ${
                view === "map" ? "bg-primary-500 text-white" : "bg-white text-ink-500 hover:bg-ink-100"
              }`}
            >
              <MapIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      <p className="mb-4 text-sm text-ink-500">
        총 <span className="font-bold text-ink-900">{total.toLocaleString()}</span>개 시설
        {total > results.length && (
          <span className="ml-1 text-ink-300">
            (그중 {results.length}개 표시 · 검색어로 좁혀보세요)
          </span>
        )}
      </p>

      {view === "map" ? (
        <KakaoMultiMap
          markers={results.map((x) => ({ lat: x.f.lat, lng: x.f.lng, label: x.f.name }))}
        />
      ) : results.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-sm text-ink-300 shadow-card">
          조건에 맞는 시설이 없습니다. 필터를 조정해보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(({ f, dist }) => (
            <FacilityCard key={f.id} facility={f} distanceKm={dist} />
          ))}
        </div>
      )}

      <CompareSelectBar />
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
