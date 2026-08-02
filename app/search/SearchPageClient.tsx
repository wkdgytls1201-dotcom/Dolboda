"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { List, Map as MapIcon, Crosshair, Search } from "lucide-react";
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
import { SCORE_LEVEL_THRESHOLDS } from "@/lib/dolbodaScore";
import { PROGRAM_TAG_META, type ProgramTag } from "@/lib/programTaxonomy";

function gradeText(grade: number | null, gradeSource?: "HIRA" | "NHIS") {
  if (grade === null) return "등급 제외";
  return gradeSource === "NHIS" ? `${NHIS_GRADE_LETTER[grade - 1] ?? grade}등급` : `${grade}등급`;
}

// "rating"(평점순)은 실제 이용자 평점 데이터가 없어 등급 대체 정렬에 불과했다 —
// 실체가 있는 안심지수 정렬로 교체했다.
type SortKey = "distance" | "grade" | "score";

const SORT_LABEL: Record<SortKey, string> = {
  distance: "거리순",
  grade: "등급순",
  score: "안심지수순",
};

// 시설 상세페이지에 들어갔다 뒤로가기로 돌아와도 검색어·필터가 남아 있게 한다.
const SEARCH_STATE_KEY = "dolboda-search-state";

interface PersistedSearchState {
  query: string;
  filters: FacilityFilters;
  sortKey: SortKey;
  view: "list" | "map";
  /** 상세 갔다 돌아왔을 때 보던 자리로 되돌리기 위한 값들 (없으면 처음부터) */
  visibleCount?: number;
  scrollY?: number;
}

function readPersistedState(): PersistedSearchState | null {
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSearchState;
    if (!parsed?.filters) return null;
    // 필드가 추가돼도 깨지지 않게 기본값 위에 덮어쓴다.
    // 정렬 키가 바뀐 옛 저장값("rating" 등)은 기본값으로 되돌린다.
    const sortKey: SortKey = parsed.sortKey in SORT_LABEL ? parsed.sortKey : "distance";
    return { ...parsed, sortKey, filters: { ...EMPTY_FILTERS, ...parsed.filters } };
  } catch {
    return null;
  }
}

function SearchContent() {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  // ?type=DAY_NIGHT_CARE,HOME_CARE 처럼 복수 유형도 받는다 (등급별 맞춤 CTA가 사용)
  const initialTypes = (params.get("type") ?? "")
    .split(",")
    .filter((t): t is FacilityType => t in FACILITY_TYPE_LABEL);
  // 프로그램 태그 딥링크 — 대시보드의 "인지 프로그램 있는 시설 보기" 같은 맞춤 CTA가
  // 필터가 걸린 검색으로 바로 데려올 수 있게 한다. 아는 태그만 통과시킨다.
  const initialProgramTags = (params.get("programTags") ?? "")
    .split(",")
    .filter((t): t is ProgramTag => t in PROGRAM_TAG_META);
  // URL로 검색어/유형/태그가 지정돼 들어온 경우엔 저장된 상태보다 URL을 우선한다.
  const fromUrl = Boolean(initialQuery || initialTypes.length > 0 || initialProgramTags.length > 0);

  // 첫 렌더는 서버와 똑같은 값(URL·기본값)으로 시작한다. 예전엔 렌더 중에 sessionStorage를
  // 읽어서 서버 HTML과 클라이언트 결과가 달라졌고("Prop className did not match"),
  // 그 상태에서 React가 일부 DOM을 버리면서 필터가 간헐적으로 어긋났다.
  // 저장된 상태는 하이드레이션이 끝난 뒤 effect에서 덮어쓴다.
  const [query, setQuery] = useState(initialQuery);
  const [view, setView] = useState<"list" | "map">("list");
  const [sortKey, setSortKey] = useState<SortKey>("distance");
  const [filters, setFilters] = useState<FacilityFilters>({
    ...EMPTY_FILTERS,
    types: initialTypes,
    programTags: initialProgramTags,
  });
  // 복원이 끝나기 전에는 저장 effect가 돌지 않게 막는다(초기값으로 덮어쓰는 것 방지)
  const [restoredDone, setRestoredDone] = useState(false);
  // 상세 갔다 돌아온 경우 "보던 자리"(펼친 개수·스크롤 위치)를 데이터 도착 후 되돌린다.
  // 검색어·필터만 복원하면 목록이 30장으로 접히고 맨 위로 튕겨서, 200번째 시설을 보다
  // 돌아온 사람이 처음부터 다시 내려야 했다.
  const pendingRestoreRef = useRef<{ count: number; y: number } | null>(null);

  useEffect(() => {
    if (!fromUrl) {
      const saved = readPersistedState();
      if (saved) {
        setQuery(saved.query);
        setView(saved.view);
        setSortKey(saved.sortKey);
        setFilters(saved.filters);
        if (saved.visibleCount || saved.scrollY) {
          pendingRestoreRef.current = {
            count: saved.visibleCount ?? 30,
            y: saved.scrollY ?? 0,
          };
        }
      }
    }
    setRestoredDone(true);
    // 최초 1회만 — 이후 사용자의 조작을 되돌리면 안 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 300장을 한 번에 그리면 첫 화면이 늦다 — 처음엔 30장만 그리고, 스크롤이 아래에
  // 가까워지면 30장씩 이어서 그린다(데이터는 이미 받아둔 것이라 추가 요청 없음).
  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 홈에서 위치를 허용했다면 그 좌표를 그대로 쓰고, 아직 없으면 직접 요청할 수 있게 한다.
  const { origin, hasLocation, locating, ready: originReady, requestLocation } = useUserOrigin();

  // 거리·등급·안심지수순인데 검색어가 없으면 서버에서 전국 기준 최근접을 계산해 받아온다.
  // (등록순 300건 안에서 거리를 재면 그 300건이 몰려있는 지역만 계속 나온다)
  // 세 정렬 모두 위치가 있으면 내 주변 100km 이내로 좁혀 보여주므로 이 최근접 목록이 필요하다.
  //
  // 안심지수순이 빠져 있어서, 부산에서 정렬해도 등록순 300건에 들어 있던 서울 시설이
  // 1위로 올라왔다. 정렬 기준만 바뀌었을 뿐 "내 주변에서 고르는 화면"인 건 같다.
  const useNearest =
    (sortKey === "distance" || sortKey === "grade" || sortKey === "score") &&
    hasLocation &&
    !query.trim();

  // 저장된 검색 상태(sessionStorage)와 기준점(위치)이 정해지기 전에는 아무것도 부르지 않는다.
  // 예전엔 첫 렌더의 기본값으로 전국 300건을 먼저 받고, 곧이어 복원된 필터로 한 번,
  // 위치가 붙으면 주변 300건으로 또 한 번 — 첫 진입에 150KB짜리 요청이 두세 번 나갔다.
  const queriesReady = restoredDone && originReady;

  const listQuery = useFacilities({
    q: query,
    limit: 300,
    types: filters.types,
    programTags: filters.programTags,
    enabled: queriesReady && !useNearest,
    cardView: true,
  });
  const nearestQuery = useNearbyFacilities(origin.lat, origin.lng, 300, {
    types: filters.types,
    enabled: queriesReady && useNearest,
  });

  const facilities = useNearest ? nearestQuery.facilities : listQuery.facilities;
  // 아직 아무것도 안 부른 구간(복원·위치 대기)도 "불러오는 중"으로 본다 —
  // 그러지 않으면 그 찰나에 "조건에 맞는 시설이 없어요"가 번쩍인다.
  const loading = !queriesReady || (useNearest ? nearestQuery.loading : listQuery.loading);
  const total = useNearest ? nearestQuery.total : listQuery.total;

  useEffect(() => {
    if (!restoredDone) return;
    try {
      // scrollY는 별도 스크롤 리스너가 저장한다 — 여기서 지우지 않게 이전 값을 이어받는다
      let prevScrollY: number | undefined;
      try {
        prevScrollY = (JSON.parse(sessionStorage.getItem(SEARCH_STATE_KEY) ?? "{}") as PersistedSearchState).scrollY;
      } catch {
        /* 이전 값 없으면 그대로 */
      }
      sessionStorage.setItem(
        SEARCH_STATE_KEY,
        JSON.stringify({
          query,
          filters,
          sortKey,
          view,
          visibleCount,
          scrollY: prevScrollY,
        } satisfies PersistedSearchState)
      );
    } catch {
      // 저장 실패해도 검색 자체에는 지장 없음
    }
  }, [restoredDone, query, filters, sortKey, view, visibleCount]);

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
    // 등급·안심지수순으로 볼 때 위치를 알고 있으면 너무 먼 시설까지 섞이지 않게 100km로
    // 좁힌다. 거리 필터(위 maxDistanceKm)를 함께 걸면 그보다 좁은 쪽이 자연히 이긴다.
    if ((sortKey === "grade" || sortKey === "score") && hasLocation && !query.trim()) {
      list = list.filter((x) => x.dist !== undefined && x.dist <= 100);
    }
    if (filters.departments.length > 0) {
      list = list.filter(
        (x) =>
          isHospital(x.f) &&
          x.f.departments.some((d) => filters.departments.includes(d.name))
      );
    }
    // 프로그램 태그는 서버(/api/facilities)가 전체 시설을 대상으로 걸러 온다.
    // 다만 거리·등급순으로 nearby 결과를 쓸 때는 서버 필터가 안 걸려 여기서 한 번 더 본다.
    if (filters.programTags.length > 0 && useNearest) {
      list = list.filter((x) => {
        const tags = isHospital(x.f) ? [] : x.f.programTags ?? [];
        const owned = new Set(tags.map((t) => t.tag));
        return filters.programTags.every((t) => owned.has(t));
      });
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
    // 안심지수 우수만 — 문턱은 라벨과 같은 값을 쓴다(전국 상위 25%).
    // 점수가 안 나오는 시설(데이터 부족)은 제외된다.
    if (filters.goodScoreOnly) {
      list = list.filter((x) => (x.f.dolbodaTotal ?? 0) >= SCORE_LEVEL_THRESHOLDS.good);
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
      // 안심지수순: 점수 없는 시설(데이터 부족)은 뒤로, 동점이면 가까운 순
      const aTotal = a.f.dolbodaTotal ?? -1;
      const bTotal = b.f.dolbodaTotal ?? -1;
      return bTotal - aTotal || (a.dist ?? Infinity) - (b.dist ?? Infinity);
    });

    return list;
    // hasLocation·useNearest도 필터 조건에 들어간다 — 빠뜨리면 위치를 뒤늦게 허용했을 때
    // 100km 제한이 안 걸린 옛 목록이 그대로 남는다(§가드와 의존성 배열은 같이 본다)
  }, [facilities, query, filters, sortKey, origin, hasLocation, useNearest]);

  useEffect(() => {
    // 상세에서 돌아오는 길이면 30장으로 접지 않고 보던 만큼 다시 펼친다.
    // (이 effect는 복원된 검색어·필터가 반영될 때도 발화하므로, 여기서 지워버리면
    //  아래 스크롤 복원이 목적지를 잃는다 — 스크롤까지 끝난 뒤에 지운다)
    setVisibleCount(pendingRestoreRef.current?.count ?? PAGE_SIZE);
  }, [query, filters, sortKey, facilities]);

  // 데이터가 도착해 카드가 실제로 그려질 만큼 쌓이면, 보던 스크롤 위치로 한 번만 되돌린다.
  useEffect(() => {
    const pending = pendingRestoreRef.current;
    if (!pending || loading || results.length === 0) return;
    pendingRestoreRef.current = null;
    // 전역 scroll-behavior:smooth가 끼어들면 복원이 애니메이션으로 보인다 — 즉시 이동
    setTimeout(() => {
      window.scrollTo({ top: pending.y, left: 0, behavior: "instant" as ScrollBehavior });
    }, 0);
  }, [loading, results.length]);

  // 스크롤 위치는 상태 변화 없이도 계속 바뀐다 — 300ms 간격으로 저장분에 덧씌운다.
  useEffect(() => {
    if (!restoredDone) return;
    let timer = 0;
    const onScroll = () => {
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        try {
          const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
          if (!raw) return;
          sessionStorage.setItem(
            SEARCH_STATE_KEY,
            JSON.stringify({ ...JSON.parse(raw), scrollY: window.scrollY })
          );
        } catch {
          /* 저장 실패는 무시 */
        }
      }, 300);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [restoredDone]);

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
    <main className="mx-auto max-w-6xl px-4 py-4 pb-28 sm:py-6">
      {/* 검색창은 한 줄 컴팩트하게 — 예전엔 위아래 여백까지 화면 한 뼘을 차지해
          정작 필터·결과가 밀렸다. 375px에서 필터 줄과 같이 첫 화면에 들어오게 줄인다 */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="mb-3 flex h-11 items-center gap-1.5 rounded-xl bg-white px-3 shadow-card"
      >
        <Search size={16} className="shrink-0 text-ink-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="지역, 시설명으로 검색"
          className="h-full w-full bg-transparent text-sm focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => setQuery("")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-300 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-500"
          >
            ×
          </button>
        )}
      </form>

      {/* top 값은 헤더 높이와 같아야 한다 (모바일 h-12 / 데스크톱 sm:h-16) */}
      <div className="sticky z-20 mb-6 flex flex-col gap-2 rounded-2xl bg-white/90 p-2.5 shadow-card backdrop-blur [top:calc(3rem+var(--safe-top))] sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-3 sm:[top:calc(4rem+var(--safe-top))]">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          facilities={facilities}
          resultCount={results.length}
        />

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-1 overflow-hidden rounded-xl border border-ink-100 sm:flex-none">
            {(["distance", "grade", "score"] as SortKey[]).map((key) => (
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
          총{" "}
          <span className="font-bold text-ink-900">
            {(filters.programTags.length > 0 && useNearest
              ? results.length
              : total
            ).toLocaleString()}
          </span>
          개 시설
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
