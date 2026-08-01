"use client";

import { useEffect, useRef } from "react";
import { MapPlaceholder } from "./MapPlaceholder";
import { loadKakaoSdk } from "./KakaoMap";
import { pointRoadviewAt, useRoadviewPano } from "@/lib/useRoadviewPano";

// 실제 거리뷰 사진 — 스톡사진과 달리 그 좌표의 진짜 모습이라 시설-사진 오매칭 위험이 없다.
// 상세페이지 "미리보기"용이라 촬영지점이 멀어도(fallback) 일단 보여준다.
export function KakaoRoadview({
  lat,
  lng,
  height = 220,
}: {
  lat?: number;
  lng?: number;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pano = useRoadviewPano(lat, lng);

  useEffect(() => {
    if (pano.status !== "good" && pano.status !== "fallback") return;
    if (!containerRef.current || pano.panoId === null) return;
    let cancelled = false;

    loadKakaoSdk().then(() => {
      if (cancelled || !containerRef.current) return;
      const roadview = new window.kakao.maps.Roadview(containerRef.current);
      window.kakao.maps.event.addListener(roadview, "init", () => {
        // 시설 방향 계산은 init된 인스턴스 스스로 한다 — lib/useRoadviewPano.ts 주석 참고
        pointRoadviewAt(roadview, lat!, lng!, -3);
      });
      roadview.setPanoId(pano.panoId, new window.kakao.maps.LatLng(lat, lng));
    });

    return () => {
      cancelled = true;
    };
  }, [pano.status, pano.panoId, lat, lng]);

  if (lat === undefined || lng === undefined) {
    return <MapPlaceholder label="위치 정보가 없어요" />;
  }
  if (pano.status === "none") {
    return <MapPlaceholder label="이 위치는 로드뷰 촬영 범위 밖이에요" />;
  }
  if (pano.status === "error") {
    return <MapPlaceholder label="로드뷰를 불러올 수 없어요" />;
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      // 순수 미리보기용이라 드래그/줌 조작을 막아둔다 — 안 그러면 모바일에서 손가락으로
      // 페이지를 스크롤하려는 터치를 로드뷰가 가로채서 스크롤이 안 먹히는 것처럼 느껴진다.
      className="pointer-events-none w-full overflow-hidden rounded-2xl border border-ink-100 bg-ink-100/30"
    />
  );
}
