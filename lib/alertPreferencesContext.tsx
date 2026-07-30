"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const FACILITY_KEY = "mosim-alert-prefs";
const REGION_KEY = "mosim-region-interests";

export interface FacilityAlertPref {
  vacancy: boolean; // 입소 가능 자리 생기면 알림
  gradeChange: boolean; // 평가등급 변경 시 알림
}

const DEFAULT_PREF: FacilityAlertPref = { vacancy: false, gradeChange: false };

interface AlertPreferencesContextValue {
  prefs: Record<string, FacilityAlertPref>;
  getPref: (facilityId: string) => FacilityAlertPref;
  setPref: (facilityId: string, key: keyof FacilityAlertPref, value: boolean) => void;
  hasAnyAlert: (facilityId: string) => boolean;
  regionInterests: string[];
  toggleRegionInterest: (region: string) => void;
}

const AlertPreferencesContext = createContext<AlertPreferencesContextValue | null>(null);

export function AlertPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Record<string, FacilityAlertPref>>({});
  const [regionInterests, setRegionInterests] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawPrefs = localStorage.getItem(FACILITY_KEY);
      if (rawPrefs) setPrefs(JSON.parse(rawPrefs));
      const rawRegions = localStorage.getItem(REGION_KEY);
      if (rawRegions) setRegionInterests(JSON.parse(rawRegions));
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(FACILITY_KEY, JSON.stringify(prefs));
  }, [prefs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(REGION_KEY, JSON.stringify(regionInterests));
  }, [regionInterests, hydrated]);

  const getPref = useCallback(
    (facilityId: string) => prefs[facilityId] ?? DEFAULT_PREF,
    [prefs]
  );

  const setPref = useCallback(
    (facilityId: string, key: keyof FacilityAlertPref, value: boolean) => {
      setPrefs((prev) => ({
        ...prev,
        [facilityId]: { ...(prev[facilityId] ?? DEFAULT_PREF), [key]: value },
      }));
    },
    []
  );

  const hasAnyAlert = useCallback(
    (facilityId: string) => {
      const p = prefs[facilityId];
      return !!p && (p.vacancy || p.gradeChange);
    },
    [prefs]
  );

  const toggleRegionInterest = useCallback((region: string) => {
    setRegionInterests((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  }, []);

  const value = useMemo(
    () => ({ prefs, getPref, setPref, hasAnyAlert, regionInterests, toggleRegionInterest }),
    [prefs, getPref, setPref, hasAnyAlert, regionInterests, toggleRegionInterest]
  );

  return (
    <AlertPreferencesContext.Provider value={value}>
      {children}
    </AlertPreferencesContext.Provider>
  );
}

export function useAlertPreferences() {
  const ctx = useContext(AlertPreferencesContext);
  if (!ctx) throw new Error("useAlertPreferences must be used within AlertPreferencesProvider");
  return ctx;
}
