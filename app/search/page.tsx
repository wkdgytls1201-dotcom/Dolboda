"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { List, Map as MapIcon, Crosshair } from "lucide-react";
import { FacilityCard } from "@/components/FacilityCard";
import { CompareSelectBar } from "@/components/CompareSelectBar";
import { FilterBar, FacilityFilters, EMPTY_FILTERS } from "@/components/FilterBar";
import { KakaoMultiMap } from "@/components/KakaoMap";
import { useFacilities } from "@/lib/useFacilities";
import { haversineDistanceKm } from "@/lib/distance";
import { useUserOrigin } from "@/lib/userLocation";
import { FacilityType, isHospital } from "@/lib/types";

type SortKey = "distance" | "grade" | "rating";

const SORT_LABEL: Record<SortKey, string> = {
  distance: "거리순",
  grade: "등급순",
  rating: "평점순",
};

// 시설 상세페이지에 들어갔다 뒤로가기로 돌아와도 검색어·필터가 남아 있게 한다.
const SEARCH_STATE_KEY = "dolboda-search-state";

interface PersistedSearchState {
  query: string;
  filters: FacilityFilters;
  sortKey: SortKey;
}

function readPersistedState(): PersistedSearchState | null {
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSearchState;
    if (!parsed?.filters) return null;
    // 필드가 추가돼도 깨지지 않게 기본값 위에 덮어쓴다.
    return { ...parsed, filters: { ...EMPTY_FILTERS, ...parsed.filters } };
  } catch {
    return null;
  }
}

function SearchContent() {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const initialType = params.get("type") as FacilityType | null;
  // URL로 검색어/유형이 지정돼 들어온 경우엔 저장된 상태보다 URL을 우선한다.
  const fromUrl = Boolean(initialQuery || initialType);
  const restored = typeof window !== "undefined" && !fromUrl ? readPersistedState() : null;

  const [query, setQuery] = useState(restored?.query ?? initialQuery);
  const [view, setView] = useState<"list" | "map">("list");
  const [sortKey, setSortKey] = useState<SortKey>(restored?.sortKey ?? "distance");
  const [filters, setFilters] = useState<FacilityFilters>(
    restored?.filters ?? { ...EMPTY_FILTERS, types: initialType ? [initialType] : [] }
  );

  // 검색어 없이는 전국 22,000여건을 다 못 내려주니 300건만 기본으로 보여주고,
  // 검색어·시설 유형은 서버로 넘겨 전체 데이터에서 좁힌 결과를 받아온다.
  // (유형을 클라이언트에서만 걸러내면 방문요양센터처럼 뒤쪽에 있는 유형이 안 보였다)
  const { facilities, total } = useFacilities({
    q: query,
    limit: 300,
    types: filters.types,
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SEARCH_STATE_KEY,
        JSON.stringify({ query, filters, sortKey } satisfies PersistedSearchState)
      );
    } catch {
      // 저장 실패해도 검색 자체에는 지장 없음
    }
  }, [query, filters, sortKey]);

  // 홈에서 위치를 허용했다면 그 좌표를 그대로 쓰고, 아직 없으면 직접 요청할 수 있게 한다.
  const { origin, hasLocation, locating, requestLocation } = useUserOrigin();

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
    // 시설 유형은 서버에서 이미 걸러져 온다(위 useFacilities의 types).
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

      {sortKey === "distance" && !hasLocation && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-ink-700">
            지금은 <strong className="font-bold">서울시청 기준</strong>으로 거리를 계산하고 있어요.
            내 위치를 켜면 가까운 시설부터 보여드려요.
          </p>
          <button
            type="button"
            onClick={requestLocation}
            disabled={locating}
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors duration-150 hover:bg-primary-600 disabled:opacity-60"
          >
            <Crosshair size={13} />
            {locating ? "위치 확인 중..." : "내 위치로 정렬"}
          </button>
        </div>
      )}

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
