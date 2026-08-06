"use client";

import { useEffect, useState } from "react";
import type { Facility } from "./types";

export interface FacilitiesQuery {
  q?: string;
  limit?: number;
  /** 시설 유형(복수 가능) — 서버에서 22,000건 전체를 대상으로 걸러준다 */
  types?: string[];
  /** false면 요청을 보내지 않는다(다른 소스를 쓰는 동안 낭비되는 호출 방지) */
  enabled?: boolean;
  /** 목록 카드용 슬림 응답을 받는다(상세 필드 제외) */
  cardView?: boolean;
  /** 프로그램 태그 필터 — 서버에서 전체 시설을 대상으로 걸러준다 */
  programTags?: string[];
}

interface FacilitiesResult {
  facilities: Facility[];
  total: number;
  loading: boolean;
}

// 22,000건 넘는 전국 데이터를 클라이언트에 통째로 내려주면 응답이 20MB가 넘어 브라우저가
// 멈춘다. q(검색어)/limit으로 서버에서 좁힌 결과만 받아온다. q가 비어있으면 최근 등록순
// limit건만 받아오므로, 검색창에 입력해야 원하는 시설을 찾을 수 있다.
// 검색어는 글자를 칠 때마다 요청을 보내면 안 된다.
// q는 서버에서 ILIKE '%...%'로 걸리는데 address에 인덱스가 없어 28,000행 순차 스캔이고,
// findMany와 count가 각각 도니까 한 글자에 전체 스캔 2회다. "김해시요양원"이면 24회.
// (병원 자동완성은 이미 같은 300ms 디바운스를 쓰고 있다 — components/CareRequestWizard.tsx)
const QUERY_DEBOUNCE_MS = 300;

// 같은 조건의 목록을 한 세션 안에서 다시 받아오지 않는다.
//
// 검색 → 상세 → 뒤로가기는 이 앱에서 가장 잦은 흐름인데, 돌아올 때마다 300건을 처음부터
// 다시 받고 있었다(캐시가 아예 없었다). 스크롤·필터는 sessionStorage로 복원되는데
// **데이터만 매번 왕복**이라, 돌아온 화면이 잠깐 뼈대로 비었다.
//
// 시설 데이터는 공공데이터 일일 수집 때만 바뀐다 — 몇 분 단위로 다시 물어볼 이유가 없다.
// 그래서 캐시가 있으면 즉시 그리고, 오래된 경우에만 화면을 유지한 채 조용히 갱신한다.
const LIST_CACHE_TTL_MS = 5 * 60 * 1000;
const LIST_CACHE_MAX = 12; // 300건짜리라 무한정 쌓으면 메모리를 먹는다
const listCache = new Map<string, { items: Facility[]; total: number; at: number }>();

function readCache(url: string) {
  const hit = listCache.get(url);
  if (!hit) return null;
  // 최근 쓴 것을 뒤로 보내 오래된 것부터 밀려나게 한다(LRU)
  listCache.delete(url);
  listCache.set(url, hit);
  return hit;
}

function writeCache(url: string, items: Facility[], total: number) {
  listCache.set(url, { items, total, at: Date.now() });
  while (listCache.size > LIST_CACHE_MAX) {
    const oldest = listCache.keys().next().value;
    if (oldest === undefined) break;
    listCache.delete(oldest);
  }
}

export function useFacilities(query: FacilitiesQuery = {}): FacilitiesResult {
  const { q = "", limit = 200, enabled = true, cardView = false } = query;
  // 배열을 그대로 의존성에 쓰면 매 렌더마다 새 배열이라 무한 요청이 된다.
  const typeKey = (query.types ?? []).join(",");
  const programTagKey = (query.programTags ?? []).join(",");
  const [state, setState] = useState<{ facilities: Facility[]; total: number }>({
    facilities: [],
    total: 0,
  });
  const [loading, setLoading] = useState(enabled);

  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    // 검색어를 지운 건 기다릴 이유가 없다 — 바로 전체 목록으로 돌아간다
    if (!q) {
      setDebouncedQ("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQ(q), QUERY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (typeKey) params.set("type", typeKey);
    if (programTagKey) params.set("programTags", programTagKey);
    if (cardView) params.set("view", "card");
    params.set("limit", String(limit));
    const url = `/api/facilities?${params}`;

    // 이미 받아둔 조건이면 왕복 없이 바로 그린다(뒤로가기 복귀가 여기서 즉시 끝난다).
    const cached = readCache(url);
    if (cached) {
      setState({ facilities: cached.items, total: cached.total });
      setLoading(false);
      // 충분히 최신이면 다시 묻지 않는다. 오래됐으면 아래에서 조용히 갱신한다
      // (loading을 다시 켜지 않는 게 핵심 — 화면이 뼈대로 되돌아가면 캐시가 무의미하다).
      if (Date.now() - cached.at < LIST_CACHE_TTL_MS) return;
    } else {
      setLoading(true);
    }

    fetch(url)
      .then((r) => r.json())
      .then((data: { items: Facility[]; total: number }) => {
        if (cancelled) return;
        writeCache(url, data.items, data.total);
        setState({ facilities: data.items, total: data.total });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQ, limit, typeKey, programTagKey, enabled, cardView]);

  return { facilities: state.facilities, total: state.total, loading };
}

// 특정 id 여러 개(비교하기·찜한시설 등)를 정확히 조회 — 기본 목록의 limit에 안 걸리게.
// card: true면 카드 필드만 받는다(홈 최근 본 시설처럼 카드만 그리는 화면용 — 비교함은
// 표에 전체 필드가 필요해 기본 false).
export function useFacilitiesByIds(ids: string[], opts?: { card?: boolean }) {
  const key = ids.join(",");
  const card = opts?.card === true;
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(ids.length > 0);

  useEffect(() => {
    if (ids.length === 0) {
      setFacilities([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/facilities?ids=${encodeURIComponent(key)}${card ? "&view=card" : ""}`)
      .then((r) => r.json())
      .then((data: { items: Facility[] }) => {
        if (!cancelled) {
          setFacilities(data.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, card]);

  return { facilities, loading };
}

// "내 주변 시설" — 좌표가 있는 전체 시설(2만여 건) 중 서버에서 진짜 거리순으로 골라온다.
// /api/facilities의 200건 제한 목록으로 클라이언트에서 계산하면 그 200건이 우연히 몰려있는
// 지역(예: 서울/경기) 기준으로만 결과가 나오는 문제가 있어 이 방식으로 분리했다.
export function useNearbyFacilities(
  lat: number,
  lng: number,
  limit = 6,
  options: { types?: string[]; enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const typeKey = (options.types ?? []).join(",");
  const [state, setState] = useState<{
    facilities: (Facility & { distanceKm: number })[];
    total: number;
  }>({ facilities: [], total: 0 });
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), limit: String(limit), view: "card" });
    if (typeKey) params.set("type", typeKey);
    const url = `/api/facilities/nearby?${params}`;

    // 목록과 같은 이유의 캐시 — 거리순·등급순·안심지수순으로 보다가 상세에 다녀오는
    // 흐름이 잦은데, 기준점(저장된 위치)이 그대로면 결과도 그대로다.
    const cached = readCache(url);
    if (cached) {
      setState({
        facilities: cached.items as (Facility & { distanceKm: number })[],
        total: cached.total,
      });
      setLoading(false);
      if (Date.now() - cached.at < LIST_CACHE_TTL_MS) return;
    } else {
      setLoading(true);
    }

    fetch(url)
      .then((r) => r.json())
      .then((data: { items: (Facility & { distanceKm: number })[]; total?: number }) => {
        if (!cancelled) {
          writeCache(url, data.items ?? [], data.total ?? 0);
          setState({ facilities: data.items ?? [], total: data.total ?? 0 });
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, limit, typeKey, enabled]);

  return { facilities: state.facilities, total: state.total, loading };
}

export interface FacilityStats {
  total: number;
  grade1Count: number;
  vacancyCount: number;
}

// 홈 화면 통계 — /api/facilities는 200건 제한이 있어 그 결과로 계산하면 안 되고,
// 서버에서 전체 데이터 기준으로 집계한 값을 따로 받아온다.
export function useFacilityStats() {
  const [stats, setStats] = useState<FacilityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/facilities/stats")
      .then((r) => r.json())
      .then((data: FacilityStats) => {
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading };
}

// id 하나를 찾을 때 쓰는 헬퍼 — 목록에 없을 수 있으니(페이지네이션) 서버에서 직접 조회
export function useFacility(id: string | undefined) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/facilities/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Facility | null) => {
        if (!cancelled) {
          setFacility(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { facility, loading };
}
