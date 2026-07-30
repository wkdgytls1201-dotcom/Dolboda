"use client";

import { useEffect, useState } from "react";
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
export function useUserOrigin(): { origin: Origin; hasLocation: boolean } {
  const [origin, setOrigin] = useState<Origin>(DEFAULT_ORIGIN);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    const saved = readUserLocation();
    if (saved) {
      setOrigin(saved);
      setHasLocation(true);
      return;
    }
    const granted = localStorage.getItem(LOCATION_CONSENT_KEY) === "granted";
    if (!granted || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveUserLocation(next);
        setOrigin(next);
        setHasLocation(true);
      },
      () => {},
      { timeout: 8000 }
    );
  }, []);

  return { origin, hasLocation };
}
