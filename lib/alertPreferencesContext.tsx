"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useFavorites, type FacilityAlertPref } from "./favoritesContext";

// 알림 설정.
//
// 시설별 알림(vacancy·gradeChange)은 찜과 한 몸이라 favoritesContext가 들고 있다
// (서버에서도 FacilityFavorite 한 행에 같이 저장된다 — docs/favorite-alert-spec.md §2-1).
// 이 컨텍스트는 그걸 그대로 넘겨주고, **관심 지역**만 직접 관리한다.
//
// 화면(app/notifications)이 쓰는 API 모양은 예전과 같게 유지한다 — 저장 위치만 바뀌었다.

const REGION_KEY = "mosim-region-interests";

export type { FacilityAlertPref };

interface AlertPreferencesContextValue {
  prefs: Record<string, FacilityAlertPref>;
  getPref: (facilityId: string) => FacilityAlertPref;
  setPref: (facilityId: string, key: keyof FacilityAlertPref, value: boolean) => void;
  hasAnyAlert: (facilityId: string) => boolean;
  regionInterests: string[];
  toggleRegionInterest: (region: string) => void;
}

const AlertPreferencesContext = createContext<AlertPreferencesContextValue | null>(null);

const DEFAULT_PREF: FacilityAlertPref = { vacancy: false, gradeChange: false };

export function AlertPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const { alertPrefs, setAlertPref } = useFavorites();

  const [regionInterests, setRegionInterests] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REGION_KEY);
      if (raw) setRegionInterests(JSON.parse(raw));
    } catch {
      // 깨진 값은 무시하고 빈 목록으로 시작한다
    }
    setHydrated(true);
  }, []);

  // 비로그인일 때만 로컬에 쓴다. 로그인 상태에서는 서버가 정답이다.
  useEffect(() => {
    if (!hydrated || userId) return;
    localStorage.setItem(REGION_KEY, JSON.stringify(regionInterests));
  }, [regionInterests, hydrated, userId]);

  // 로그인하면 서버 값으로 교체 (병합은 favoritesContext의 import가 이미 처리했다)
  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.regions)) setRegionInterests(d.regions);
      })
      .catch(() => {
        // 실패해도 로컬 값으로 화면은 돌아간다
      });
  }, [status, userId]);

  const getPref = useCallback(
    (facilityId: string) => alertPrefs[facilityId] ?? DEFAULT_PREF,
    [alertPrefs]
  );

  const hasAnyAlert = useCallback(
    (facilityId: string) => {
      const p = alertPrefs[facilityId];
      return !!p && (p.vacancy || p.gradeChange);
    },
    [alertPrefs]
  );

  const toggleRegionInterest = useCallback(
    (region: string) => {
      let on = false;
      setRegionInterests((prev) => {
        const has = prev.includes(region);
        on = !has;
        return has ? prev.filter((r) => r !== region) : [...prev, region];
      });

      if (!userId) return;
      fetch("/api/favorites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, on }),
      }).catch(() => {
        setRegionInterests((prev) =>
          on ? prev.filter((r) => r !== region) : [...new Set([...prev, region])]
        );
      });
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      prefs: alertPrefs,
      getPref,
      setPref: setAlertPref,
      hasAnyAlert,
      regionInterests,
      toggleRegionInterest,
    }),
    [alertPrefs, getPref, setAlertPref, hasAnyAlert, regionInterests, toggleRegionInterest]
  );

  return (
    <AlertPreferencesContext.Provider value={value}>{children}</AlertPreferencesContext.Provider>
  );
}

export function useAlertPreferences() {
  const ctx = useContext(AlertPreferencesContext);
  if (!ctx) throw new Error("useAlertPreferences must be used within AlertPreferencesProvider");
  return ctx;
}
