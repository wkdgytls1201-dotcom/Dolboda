"use client";

import { useEffect, useState } from "react";
import type { Facility } from "./types";

export interface FacilitiesQuery {
  q?: string;
  limit?: number;
}

interface FacilitiesResult {
  facilities: Facility[];
  total: number;
  loading: boolean;
}

// 22,000건 넘는 전국 데이터를 클라이언트에 통째로 내려주면 응답이 20MB가 넘어 브라우저가
// 멈춘다. q(검색어)/limit으로 서버에서 좁힌 결과만 받아온다. q가 비어있으면 최근 등록순
// limit건만 받아오므로, 검색창에 입력해야 원하는 시설을 찾을 수 있다.
export function useFacilities(query: FacilitiesQuery = {}): FacilitiesResult {
  const { q = "", limit = 200 } = query;
  const [state, setState] = useState<{ facilities: Facility[]; total: number }>({
    facilities: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
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
  }, [q, limit]);

  return { facilities: state.facilities, total: state.total, loading };
}

// 특정 id 여러 개(비교하기·찜한시설 등)를 정확히 조회 — 기본 목록의 limit에 안 걸리게
export function useFacilitiesByIds(ids: string[]) {
  const key = ids.join(",");
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
    fetch(`/api/facilities?ids=${encodeURIComponent(key)}`)
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
  }, [key]);

  return { facilities, loading };
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
