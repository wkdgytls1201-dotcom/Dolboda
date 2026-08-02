"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import { MapPlaceholder } from "./MapPlaceholder";
import { useInViewOnce } from "@/lib/useInViewOnce";

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
  /** 정보창 두 번째 줄 — 예: "요양원 · A등급" */
  sublabel?: string;
  href?: string;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  // 상세페이지의 "위치" 섹션은 화면 한참 아래에 있는데도 페이지를 열자마자 카카오 SDK와
  // 지도 타일 6장을 받아왔다 — 스크롤해서 가까워질 때만 받는다.
  const { ref: containerRef, inView } = useInViewOnce<HTMLDivElement>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (lat === undefined || lng === undefined || !containerRef.current) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const center = new window.kakao.maps.LatLng(lat, lng);
        const map = new window.kakao.maps.Map(containerRef.current, { center, level: 4 });
        const marker = new window.kakao.maps.Marker({ position: center });
        marker.setMap(map);
        // 작은 미리보기 지도라 드래그/줌을 막아야 모바일에서 손가락으로 지도를 스크롤하려다
        // 지도가 그 터치를 가로채서 페이지 스크롤이 막히는 문제가 생기지 않는다.
        map.setDraggable(false);
        map.setZoomable(false);
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
interface SavedMapView {
  lat: number;
  lng: number;
  level: number;
}

export function KakaoMultiMap({
  markers,
  height = 480,
  center,
  persistKey,
}: {
  markers: MapMarker[];
  height?: number;
  /** 내 위치(또는 기본 위치) — 지정하면 첫 마커 대신 이 좌표를 지도 중심 기준으로 쓴다 */
  center?: { lat: number; lng: number };
  /** 지정하면 사용자가 확대/이동한 위치를 sessionStorage에 기억해뒀다가 다음에 그대로 복원한다
   *  (시설 상세 갔다 뒤로가기했을 때 지도가 처음 위치로 리셋되지 않게) */
  persistKey?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);
  const valid = markers.filter((m) => m.lat !== undefined && m.lng !== undefined);

  useEffect(() => {
    if (valid.length === 0 || !containerRef.current) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        let savedView: SavedMapView | null = null;
        if (persistKey) {
          try {
            savedView = JSON.parse(sessionStorage.getItem(persistKey) ?? "null");
          } catch {
            savedView = null;
          }
        }

        const initialCenter = savedView ?? center ?? valid[0];
        const bounds = new window.kakao.maps.LatLngBounds();
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(initialCenter.lat, initialCenter.lng),
          level: savedView?.level ?? 6,
        });
        mapRef.current = map;

        if (persistKey) {
          const save = () => {
            const c = map.getCenter();
            sessionStorage.setItem(
              persistKey,
              JSON.stringify({ lat: c.getLat(), lng: c.getLng(), level: map.getLevel() })
            );
          };
          window.kakao.maps.event.addListener(map, "idle", save);
        }
        // 내 위치도 함께 시야에 들어오게 bounds에 포함시킨다 — 그래야 시설들이 위치와
        // 동떨어진 지역에 흩어져 있어도 지도가 엉뚱한 곳만 확대해 보여주지 않는다.
        if (center) {
          const myPos = new window.kakao.maps.LatLng(center.lat, center.lng);
          bounds.extend(myPos);
          // 시설 마커(빨간 핀)와 헷갈리지 않게 내 위치는 작은 파란 점으로 따로 표시한다.
          const myLocationDot = new window.kakao.maps.CustomOverlay({
            position: myPos,
            zIndex: 10,
            content:
              '<div style="width:14px;height:14px;border-radius:9999px;background:#4285F4;' +
              'border:2px solid #fff;box-shadow:0 0 0 4px rgba(66,133,244,0.3)"></div>',
          });
          myLocationDot.setMap(map);
        }
        // 핀을 눌렀을 때 이름·등급을 바로 보여주고 상세페이지로 갈 수 있는 링크를 띄운다.
        // 커스텀 팝업 컴포넌트를 새로 만들지 않고 카카오맵 기본 InfoWindow를 재사용해서
        // 가볍게 처리했다(하나만 만들어 열 때마다 내용만 바꿔치기 — 이전 것은 자동으로 닫힘).
        const infoWindow = new window.kakao.maps.InfoWindow({ removable: true, zIndex: 20 });
        valid.forEach((m) => {
          const pos = new window.kakao.maps.LatLng(m.lat, m.lng);
          const marker = new window.kakao.maps.Marker({ position: pos, title: m.label });
          marker.setMap(map);
          bounds.extend(pos);
          window.kakao.maps.event.addListener(marker, "click", () => {
            infoWindow.setContent(
              `<div style="padding:8px 10px;min-width:150px;max-width:220px;font-size:12px;line-height:1.5;font-family:inherit;">` +
                `<div style="font-weight:700;color:#1a1a1a;">${escapeHtml(m.label)}</div>` +
                (m.sublabel
                  ? `<div style="color:#888;margin-top:1px;">${escapeHtml(m.sublabel)}</div>`
                  : "") +
                (m.href
                  ? `<a href="${escapeHtml(m.href)}" style="display:inline-block;margin-top:6px;color:#FF6250;font-weight:700;text-decoration:none;">자세히 보기 →</a>`
                  : "") +
                `</div>`
            );
            infoWindow.open(map, marker);
          });
        });
        // 저장된 위치를 복원한 경우엔 사용자가 직접 맞춘 확대/이동이니 자동으로 다시
        // 맞추지 않는다. 처음 여는 경우에만 마커가 다 보이게 자동으로 맞춘다.
        if (!savedView && (valid.length > 1 || center)) map.setBounds(bounds);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // 순서가 아니라 좌표 집합 자체가 바뀔 때만 지도를 다시 만든다. 정렬 순서만 바뀐
    // 경우까지 키가 달라지면 지도가 매번 새로 생성돼 확대/중심이 초기값으로 튕긴다
    // (모바일에서 핀치줌 중 리렌더가 겹치면 이 현상이 두드러졌다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    valid
      .map((m) => `${m.lat},${m.lng}`)
      .sort()
      .join("|"),
    center ? `${center.lat},${center.lng}` : null,
  ]);

  if (valid.length === 0 || failed) {
    return (
      <MapPlaceholder
        label={failed ? "지도를 불러올 수 없어요" : "좌표 정보가 있는 시설이 없어요"}
      />
    );
  }

  function goToMyLocation() {
    if (!center || !mapRef.current) return;
    const pos = new window.kakao.maps.LatLng(center.lat, center.lng);
    mapRef.current.panTo(pos);
    mapRef.current.setLevel(6);
  }

  return (
    <div className="relative">
      {/* 모바일은 480px 고정이면 지도 아래쪽이 화면 밖으로 넘어가 "내 위치" 버튼이 안 보인다.
          화면 높이에 맞춰 줄이고(58vh), 데스크톱에서는 기존 height 값을 그대로 쓴다. */}
      <div
        ref={containerRef}
        style={{ "--map-h": `${height}px` } as React.CSSProperties}
        className="h-[52vh] w-full overflow-hidden rounded-2xl border border-ink-100 sm:h-[var(--map-h)]"
      />
      {center && (
        <button
          type="button"
          onClick={goToMyLocation}
          aria-label="내 위치로 이동"
          // 모바일은 하단 고정 탭바(64px)가 지도 아래쪽을 덮으므로 버튼을 그 위로 띄운다.
          className="absolute bottom-20 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-500 shadow-card transition-transform active:scale-95 sm:bottom-3"
        >
          <Crosshair size={18} />
        </button>
      )}
    </div>
  );
}
