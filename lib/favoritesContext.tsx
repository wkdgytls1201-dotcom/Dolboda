"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";

// 관심시설(찜) — 로그인 전에는 localStorage, 로그인하면 서버.
//
// 왜 서버로 옮겼나: 예전엔 localStorage에만 있어서 (1) 기기를 바꾸면 찜이 사라지고
// (2) 서버가 "누가 어느 시설을 찜했는지"를 몰라 빈자리 알림을 보낼 수가 없었다.
// 일일 수집이 빈자리·등급 변동을 이미 매일 감지하는데 보낼 대상이 없던 상태다.
// (docs/favorite-alert-spec.md)
//
// 비로그인도 계속 찜할 수 있게 둔다 — 찜하려고 로그인부터 하라고 막으면 이탈이 크다.
// 로그인하는 순간 로컬 목록을 서버로 **병합**한다(덮어쓰기 아님, import API 주석 참고).

const STORAGE_KEY = "mosim-favorite-ids";
const ALERT_PREFS_KEY = "mosim-alert-prefs";
const REGION_KEY = "mosim-region-interests";
/** 이 계정으로 이미 병합했는지 — 로그인할 때마다 다시 올리지 않게 */
const IMPORTED_KEY = "mosim-favorites-imported";

export interface FacilityAlertPref {
  vacancy: boolean;
  gradeChange: boolean;
}

interface FavoritesContextValue {
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  /** 서버에서 처음 불러오기 전인지 — 화면이 빈 목록을 "없음"으로 오해하지 않게 */
  loaded: boolean;
  /** 시설별 알림 설정 (로그인 시에만 서버 반영) */
  alertPrefs: Record<string, FacilityAlertPref>;
  setAlertPref: (facilityId: string, key: keyof FacilityAlertPref, value: boolean) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const DEFAULT_PREF: FacilityAlertPref = { vacancy: false, gradeChange: false };

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [alertPrefs, setAlertPrefs] = useState<Record<string, FacilityAlertPref>>({});
  const [hydrated, setHydrated] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // 같은 세션에서 병합을 두 번 시도하지 않게 (React StrictMode 이중 실행 대비)
  const importingRef = useRef(false);

  // 찜 직후 스낵바 — 빈자리·등급변동 알림(10차, send-facility-alerts)이 이미 돌고 있는데
  // 켜는 곳이 /notifications 깊숙이 숨어 있어 아무도 모른다. 찜하는 "그 순간"이 알림을
  // 켤 동기가 가장 강한 순간이라 여기서 원탭으로 켜게 한다. 자동으로 켜지는 않는다 —
  // 이메일 수신은 사용자가 직접 누른 명시적 선택이어야 한다.
  const [savedToast, setSavedToast] = useState<{ facilityId: string; enabled: boolean } | null>(
    null
  );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((next: { facilityId: string; enabled: boolean }) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSavedToast(next);
    toastTimerRef.current = setTimeout(() => setSavedToast(null), next.enabled ? 2500 : 5000);
  }, []);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 1) 로컬 값을 먼저 읽는다 — 로그인 여부와 무관하게 화면이 바로 뜨게
  useEffect(() => {
    setFavoriteIds(readLocal<string[]>(STORAGE_KEY, []));
    setAlertPrefs(readLocal<Record<string, FacilityAlertPref>>(ALERT_PREFS_KEY, {}));
    setHydrated(true);
  }, []);

  // 2) 비로그인 상태에서는 로컬에 계속 저장한다
  useEffect(() => {
    if (!hydrated || userId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds, hydrated, userId]);

  useEffect(() => {
    if (!hydrated || userId) return;
    localStorage.setItem(ALERT_PREFS_KEY, JSON.stringify(alertPrefs));
  }, [alertPrefs, hydrated, userId]);

  // 3) 로그인하면 병합 → 서버 값으로 교체
  useEffect(() => {
    if (!hydrated || status !== "authenticated" || !userId) return;
    if (importingRef.current) return;
    importingRef.current = true;

    (async () => {
      try {
        const importedFor = localStorage.getItem(IMPORTED_KEY);
        const localIds = readLocal<string[]>(STORAGE_KEY, []);
        const localPrefs = readLocal<Record<string, FacilityAlertPref>>(ALERT_PREFS_KEY, {});
        const localRegions = readLocal<string[]>(REGION_KEY, []);

        // 이 계정으로 아직 안 올렸고 로컬에 뭔가 있으면 병합한다
        if (
          importedFor !== userId &&
          (localIds.length > 0 || Object.keys(localPrefs).length > 0 || localRegions.length > 0)
        ) {
          await fetch("/api/favorites/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              favoriteIds: localIds,
              prefs: localPrefs,
              regions: localRegions,
            }),
          });
        }
        localStorage.setItem(IMPORTED_KEY, userId);

        const res = await fetch("/api/favorites");
        if (res.ok) {
          const data = (await res.json()) as {
            favorites: {
              facilityId: string;
              vacancyAlert: boolean;
              gradeChangeAlert: boolean;
            }[];
          };
          const list = Array.isArray(data.favorites) ? data.favorites : [];
          setFavoriteIds(list.map((f) => f.facilityId));
          setAlertPrefs(
            Object.fromEntries(
              list.map((f) => [
                f.facilityId,
                { vacancy: f.vacancyAlert, gradeChange: f.gradeChangeAlert },
              ])
            )
          );
        }
      } catch {
        // 서버가 안 되더라도 로컬 값으로 화면은 계속 돌아간다
      } finally {
        setLoaded(true);
      }
    })();
  }, [hydrated, status, userId]);

  // 비로그인 확정 시점에도 로딩을 끝낸다
  useEffect(() => {
    if (hydrated && status === "unauthenticated") setLoaded(true);
  }, [hydrated, status]);

  const toggleFavorite = useCallback(
    (id: string) => {
      // 화면부터 바꾸고 서버는 뒤따른다 — 하트가 눌리자마자 반응해야 한다
      let nextFavorite = false;
      setFavoriteIds((prev) => {
        const has = prev.includes(id);
        nextFavorite = !has;
        return has ? prev.filter((x) => x !== id) : [...prev, id];
      });

      if (nextFavorite) showToast({ facilityId: id, enabled: false });
      else setSavedToast(null);

      if (!userId) return;
      fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId: id, favorite: nextFavorite }),
      }).catch(() => {
        // 실패하면 되돌린다 — 껐다고 생각한 알림이 계속 오면 신뢰를 잃는다
        setFavoriteIds((prev) =>
          nextFavorite ? prev.filter((x) => x !== id) : [...new Set([...prev, id])]
        );
      });
    },
    [userId, showToast]
  );

  const setAlertPref = useCallback(
    (facilityId: string, key: keyof FacilityAlertPref, value: boolean) => {
      setAlertPrefs((prev) => ({
        ...prev,
        [facilityId]: { ...(prev[facilityId] ?? DEFAULT_PREF), [key]: value },
      }));

      if (!userId) return;
      fetch("/api/favorites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId,
          [key === "vacancy" ? "vacancyAlert" : "gradeChangeAlert"]: value,
        }),
      }).catch(() => {
        setAlertPrefs((prev) => ({
          ...prev,
          [facilityId]: { ...(prev[facilityId] ?? DEFAULT_PREF), [key]: !value },
        }));
      });
    },
    [userId]
  );

  const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);

  const value = useMemo(
    () => ({ favoriteIds, isFavorite, toggleFavorite, loaded, alertPrefs, setAlertPref }),
    [favoriteIds, isFavorite, toggleFavorite, loaded, alertPrefs, setAlertPref]
  );

  const toastPref = savedToast ? alertPrefs[savedToast.facilityId] : undefined;
  const toastAlreadyOn = Boolean(toastPref?.vacancy && toastPref?.gradeChange);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      {/* 찜 스낵바 — 모바일 탭바(72px) 위, 데스크톱은 하단 여백. transform·opacity만 쓰는
          기존 animate-fade-up 재사용. aria-live로 한 번만 읽히고 5초 뒤 사라진다. */}
      {savedToast && (
        <div
          role="status"
          className="animate-fade-up fixed inset-x-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 mx-auto flex min-h-[52px] max-w-md items-center justify-between gap-3 rounded-2xl bg-ink-900/95 py-2.5 pl-4 pr-2.5 text-sm text-white shadow-card-hover sm:bottom-6"
        >
          {savedToast.enabled ? (
            <span className="py-1.5 font-semibold">
              알림을 켰어요{userId ? "" : " · 로그인하면 이메일로 받아요"}
            </span>
          ) : (
            <>
              <span className="min-w-0 truncate font-semibold">
                관심시설에 저장했어요{toastAlreadyOn ? " · 알림 설정됨" : ""}
              </span>
              {!toastAlreadyOn && (
                <button
                  type="button"
                  onClick={() => {
                    setAlertPref(savedToast.facilityId, "vacancy", true);
                    setAlertPref(savedToast.facilityId, "gradeChange", true);
                    showToast({ facilityId: savedToast.facilityId, enabled: true });
                  }}
                  className="min-h-[44px] shrink-0 rounded-xl bg-white px-3.5 text-[13px] font-bold text-ink-900 transition-transform duration-150 active:scale-95"
                >
                  빈자리 알림 켜기
                </button>
              )}
            </>
          )}
        </div>
      )}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
