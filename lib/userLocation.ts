"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ORIGIN } from "./distance";

export const LOCATION_CONSENT_KEY = "dolboda-location-consent";
const USER_LOCATION_KEY = "dolboda-user-location";

export interface Origin {
  lat: number;
  lng: number;
}

// 홈에서 한 번 받아온 위치를 저장해두고 다른 페이지(시설 찾기 등)에서도 같은 기준점을 쓴다.
// 저장 안 하면 페이지마다 서울시청(DEFAULT_ORIGIN)으로 되돌아가 거리순이 엉뚱해진다.
export function saveUserLocation(origin: Origin) {
  try {
    localStorage.setItem(USER_LOCATION_KEY, JSON.stringify(origin));
  } catch {
    // 사파리 프라이빗 모드 등에서 저장 실패해도 동작에는 지장 없음
  }
}

export function readUserLocation(): Origin | null {
  try {
    const raw = localStorage.getItem(USER_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Origin;
    if (typeof parsed?.lat !== "number" || typeof parsed?.lng !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 저장된 사용자 위치를 기준점으로 돌려준다.
 * - 저장된 값이 있으면 즉시 사용
 * - 없더라도 이전에 위치 허용을 한 사용자면 다시 조용히 받아온다
 * - 둘 다 아니면 서울시청 기본값(hasLocation=false)
 */
export function useUserOrigin(): {
  origin: Origin;
  hasLocation: boolean;
  locating: boolean;
  /** 기준점이 정해졌는지 — 이게 true가 되기 전에 목록을 부르면 요청이 두 번 나간다 */
  ready: boolean;
  requestLocation: () => void;
} {
  const [origin, setOrigin] = useState<Origin>(DEFAULT_ORIGIN);
  const [hasLocation, setHasLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  // 첫 렌더에는 저장된 위치를 아직 못 읽은 상태다. 이때 목록을 부르면 "위치 없음" 기준으로
  // 전국 목록 300건을 받고, 곧이어 위치가 붙으면 주변 300건을 또 받는다 —
  // 시설 찾기 첫 진입이 느렸던 가장 큰 이유였다(실측: 300건 요청이 2~3번).
  const [ready, setReady] = useState(false);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setReady(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveUserLocation(next);
        localStorage.setItem(LOCATION_CONSENT_KEY, "granted");
        setOrigin(next);
        setHasLocation(true);
        setLocating(false);
        setReady(true);
      },
      () => {
        setLocating(false);
        setReady(true);
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const saved = readUserLocation();
    if (saved) {
      setOrigin(saved);
      setHasLocation(true);
      setReady(true);
      return;
    }
    // 예전에 허용한 사용자는 조용히 다시 받아온다 — 응답(또는 실패)이 와야 기준점이 정해진다.
    if (localStorage.getItem(LOCATION_CONSENT_KEY) === "granted") requestLocation();
    else setReady(true);
  }, [requestLocation]);

  return { origin, hasLocation, locating, ready, requestLocation };
}
