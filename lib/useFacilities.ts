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
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (typeKey) params.set("type", typeKey);
    if (programTagKey) params.set("programTags", programTagKey);
    if (cardView) params.set("view", "card");
    params.set("limit", String(limit));

    fetch(`/api/facilities?${params}`)
      .then((r) => r.json())
      .then((data: { items: Facility[]; total: number }) => {
        if (cancelled) return;
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
    setLoading(true);
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), limit: String(limit), view: "card" });
    if (typeKey) params.set("type", typeKey);

    fetch(`/api/facilities/nearby?${params}`)
      .then((r) => r.json())
      .then((data: { items: (Facility & { distanceKm: number })[]; total?: number }) => {
        if (!cancelled) {
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
