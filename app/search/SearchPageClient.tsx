"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { List, Map as MapIcon, Crosshair } from "lucide-react";
import { FacilityCard } from "@/components/FacilityCard";
import { CompareSelectBar } from "@/components/CompareSelectBar";
import { FilterBar, FacilityFilters, EMPTY_FILTERS } from "@/components/FilterBar";
import { KakaoMultiMap } from "@/components/KakaoMap";
import { NHIS_GRADE_LETTER } from "@/components/GradeBadge";
import { PageLoader } from "@/components/PageLoader";
import { useFacilities, useNearbyFacilities } from "@/lib/useFacilities";
import { haversineDistanceKm } from "@/lib/distance";
import { useUserOrigin } from "@/lib/userLocation";
import { FACILITY_TYPE_LABEL, FacilityType, isHospital } from "@/lib/types";

function gradeText(grade: number | null, gradeSource?: "HIRA" | "NHIS") {
  if (grade === null) return "등급 제외";
  return gradeSource === "NHIS" ? `${NHIS_GRADE_LETTER[grade - 1] ?? grade}등급` : `${grade}등급`;
}

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
  view: "list" | "map";
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
  const [view, setView] = useState<"list" | "map">(restored?.view ?? "list");
  const [sortKey, setSortKey] = useState<SortKey>(restored?.sortKey ?? "distance");
  const [filters, setFilters] = useState<FacilityFilters>(
    restored?.filters ?? { ...EMPTY_FILTERS, types: initialType ? [initialType] : [] }
  );

  // 홈에서 위치를 허용했다면 그 좌표를 그대로 쓰고, 아직 없으면 직접 요청할 수 있게 한다.
  const { origin, hasLocation, locating, requestLocation } = useUserOrigin();

  // 거리순 또는 등급순인데 검색어가 없으면 서버에서 전국 기준 최근접을 계산해 받아온다.
  // (등록순 300건 안에서 거리를 재면 그 300건이 몰려있는 지역만 계속 나온다)
  // 등급순은 위치가 있으면 내 주변 100km 이내로 좁혀서 보여주므로 이 최근접 목록이 필요하다.
  const useNearest = (sortKey === "distance" || sortKey === "grade") && hasLocation && !query.trim();

  const listQuery = useFacilities({
    q: query,
    limit: 300,
    types: filters.types,
    enabled: !useNearest,
    cardView: true,
  });
  const nearestQuery = useNearbyFacilities(origin.lat, origin.lng, 300, {
    types: filters.types,
    enabled: useNearest,
  });

  const facilities = useNearest ? nearestQuery.facilities : listQuery.facilities;
  const loading = useNearest ? nearestQuery.loading : listQuery.loading;
  const total = useNearest ? nearestQuery.total : listQuery.total;

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SEARCH_STATE_KEY,
        JSON.stringify({ query, filters, sortKey, view } satisfies PersistedSearchState)
      );
    } catch {
      // 저장 실패해도 검색 자체에는 지장 없음
    }
  }, [query, filters, sortKey, view]);

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
    // 등급순으로 볼 때 위치를 알고 있으면 너무 먼 시설까지 섞이지 않게 100km로 좁힌다.
    if (sortKey === "grade" && hasLocation && !query.trim()) {
      list = list.filter((x) => x.dist !== undefined && x.dist <= 100);
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
        const aScore = !isHospital(a.f) ? a.f.evaluationDetail?.totalScore ?? 0 : 0;
        const bScore = !isHospital(b.f) ? b.f.evaluationDetail?.totalScore ?? 0 : 0;
        return a.f.grade - b.f.grade || bScore - aScore;
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

  // 300장을 한 번에 그리면 첫 화면이 늦다 — 처음엔 30장만 그리고, 스크롤이 아래에
  // 가까워지면 30장씩 이어서 그린다(데이터는 이미 받아둔 것이라 추가 요청 없음).
  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, filters, sortKey, facilities]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, results.length));
        }
      },
      // 바닥에 닿기 600px 전에 미리 그려서 스크롤이 끊기지 않게
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [results.length]);

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

      {/* top 값은 헤더 높이와 같아야 한다 (모바일 h-12 / 데스크톱 sm:h-16) */}
      <div className="sticky top-12 z-20 mb-6 flex flex-col gap-2 rounded-2xl bg-white/90 p-2.5 shadow-card backdrop-blur sm:top-16 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-3">
        <FilterBar filters={filters} onChange={setFilters} facilities={facilities} />

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-1 overflow-hidden rounded-xl border border-ink-100 sm:flex-none">
            {(["distance", "grade", "rating"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`min-h-[44px] flex-1 px-3 text-xs font-semibold transition-colors duration-150 sm:min-h-0 sm:flex-none sm:py-1.5 ${
                  sortKey === key
                    ? "bg-primary-500 text-white"
                    : "bg-white text-ink-500 hover:bg-ink-100"
                }`}
              >
                {SORT_LABEL[key]}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 overflow-hidden rounded-xl border border-ink-100">
            <button
              onClick={() => setView("list")}
              aria-label="리스트 보기"
              className={`flex min-h-[44px] w-11 items-center justify-center transition-colors duration-150 sm:min-h-0 sm:w-auto sm:p-2 ${
                view === "list" ? "bg-primary-500 text-white" : "bg-white text-ink-500 hover:bg-ink-100"
              }`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView("map")}
              aria-label="지도 보기"
              className={`flex min-h-[44px] w-11 items-center justify-center transition-colors duration-150 sm:min-h-0 sm:w-auto sm:p-2 ${
                view === "map" ? "bg-primary-500 text-white" : "bg-white text-ink-500 hover:bg-ink-100"
              }`}
            >
              <MapIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 지도 보기일 때는 이 안내들을 지도 아래로 내린다 — 위에 쌓아두면 모바일에서
          지도가 화면 한참 아래에서 시작해 "내 위치" 버튼이 한 화면에 안 들어온다.
          목록 보기에서는 원래대로 결과 위에 둔다(내용은 그대로, 순서만 바뀜). */}
      {view === "map" && (
        <div className="mb-4">
          <KakaoMultiMap
            markers={results.map((x) => ({
              lat: x.f.lat,
              lng: x.f.lng,
              label: x.f.name,
              sublabel: `${FACILITY_TYPE_LABEL[x.f.facilityType]} · ${gradeText(x.f.grade, x.f.gradeSource)}`,
              href: `/facility/${x.f.id}`,
            }))}
            center={origin}
            persistKey="dolboda-search-map-view"
          />
        </div>
      )}

      {/* 로딩 중엔 이 자리에 아무것도 안 띄운다 — 아래 결과 영역에 뜨는 로더로 충분하고,
          여기 따로 스켈레톤 바를 놓으면 오히려 "뭔가 잘못됐나" 싶은 깜빡임으로 보인다. */}
      {!(loading && facilities.length === 0) && (
        <p className="mb-4 text-sm text-ink-500">
          총 <span className="font-bold text-ink-900">{total.toLocaleString()}</span>개 시설
          {total > results.length && (
            <span className="ml-1 text-ink-300">
              (그중 {results.length}개 표시 · 검색어로 좁혀보세요)
            </span>
          )}
        </p>
      )}

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
            className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-full bg-primary-500 px-4 text-xs font-bold text-white transition-colors duration-150 hover:bg-primary-600 disabled:opacity-60"
          >
            <Crosshair size={13} />
            {locating ? "위치 확인 중..." : "내 위치로 정렬"}
          </button>
        </div>
      )}

      {view === "map" ? null : results.length === 0 && loading ? (
        <PageLoader label="시설을 불러오는 중" compact />
      ) : results.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-sm text-ink-300 shadow-card">
          조건에 맞는 시설이 없습니다. 필터를 조정해보세요.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.slice(0, visibleCount).map(({ f, dist }) => (
              <FacilityCard key={f.id} facility={f} distanceKm={dist} />
            ))}
          </div>
          {visibleCount < results.length && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <PageLoader compact />
            </div>
          )}
        </>
      )}

      <CompareSelectBar />
    </main>
  );
}

export default function SearchPageClient() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
