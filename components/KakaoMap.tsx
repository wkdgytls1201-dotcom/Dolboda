"use client";

import { useEffect, useRef, useState } from "react";
import { MapPlaceholder } from "./MapPlaceholder";

declare global {
  interface Window {
    kakao: any;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

export function loadKakaoSdk(): Promise<void> {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY 미설정"));
  if (window.kakao?.maps) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => reject(new Error("카카오맵 SDK 로드 실패"));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}

export interface MapMarker {
  lat?: number;
  lng?: number;
  label: string;
  href?: string;
}

// 단일 위치 지도. 상세페이지 "위치" 섹션에서 사용.
export function KakaoMap({
  lat,
  lng,
  label,
  height = 220,
}: {
  lat?: number;
  lng?: number;
  label: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (lat === undefined || lng === undefined || !containerRef.current) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const center = new window.kakao.maps.LatLng(lat, lng);
        const map = new window.kakao.maps.Map(containerRef.current, { center, level: 4 });
        const marker = new window.kakao.maps.Marker({ position: center });
        marker.setMap(map);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (lat === undefined || lng === undefined || failed) {
    return <MapPlaceholder label={failed ? "지도를 불러올 수 없어요" : label} />;
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-2xl border border-ink-100"
    />
  );
}

// 여러 시설을 한 지도에 표시. 검색결과 지도 보기에서 사용.
export function KakaoMultiMap({
  markers,
  height = 480,
}: {
  markers: MapMarker[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const valid = markers.filter((m) => m.lat !== undefined && m.lng !== undefined);

  useEffect(() => {
    if (valid.length === 0 || !containerRef.current) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const bounds = new window.kakao.maps.LatLngBounds();
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(valid[0].lat, valid[0].lng),
          level: 6,
        });
        valid.forEach((m) => {
          const pos = new window.kakao.maps.LatLng(m.lat, m.lng);
          const marker = new window.kakao.maps.Marker({ position: pos, title: m.label });
          marker.setMap(map);
          bounds.extend(pos);
        });
        if (valid.length > 1) map.setBounds(bounds);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid.map((m) => `${m.lat},${m.lng}`).join("|")]);

  if (valid.length === 0 || failed) {
    return (
      <MapPlaceholder
        label={failed ? "지도를 불러올 수 없어요" : "좌표 정보가 있는 시설이 없어요"}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-2xl border border-ink-100"
    />
  );
}
