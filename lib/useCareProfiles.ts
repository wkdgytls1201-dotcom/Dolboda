"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// 어르신 돌봄 프로필 — 대시보드·시설 상세·돌봄 요청이 함께 쓰는 조회 훅.
// 로그인 상태일 때만 요청한다(비로그인 방문자마다 401 요청이 나가면 낭비다).
export interface CareProfileSummary {
  id: string;
  relation: string;
  gender: string | null;
  ageBand: string | null;
  weightBand: string | null;
  mobilityLevel: string | null;
  mealAssistLevel: string | null;
  toiletAssistLevel: string | null;
  conditions: string[];
  ltcGrade: string | null;
  estimatedBand: string | null;
}

export function useCareProfiles(): { profiles: CareProfileSummary[]; loaded: boolean } {
  const { status } = useSession();
  const [profiles, setProfiles] = useState<CareProfileSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    fetch("/api/care-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d?.items)) setProfiles(d.items);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return { profiles, loaded };
}
