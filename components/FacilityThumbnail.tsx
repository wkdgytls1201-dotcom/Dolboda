"use client";

import { useEffect, useRef, useState } from "react";
import { Facility } from "@/lib/types";
import { facilityPhotoFor } from "@/lib/stockPhotos";
import { FacilityIllustration } from "./FacilityIllustration";
import { loadKakaoSdk } from "./KakaoMap";
import { pointRoadviewAt, useRoadviewPano } from "@/lib/useRoadviewPano";

// 로드뷰 촬영지점이 시설과 가까울 때("good")만 카드 썸네일로 승격한다.
// 촬영지점이 멀어서 각도가 애매하거나(나무 등에 가려질 가능성) 아예 없는 경우("fallback"/"none")는
// 카드에는 안전하게 일러스트를 쓰고, 상세페이지의 "로드뷰 미리보기"에서만 보여준다.
// (실제 나무 가림 여부를 이미지로 판별하는 건 비전 모델이 필요해 여기선 거리로 대신 추정)
function RoadviewThumb({ lat, lng }: { lat: number; lng: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // 화면에 실제로 보일 때만 조회를 시작 — 목록 페이지에서 수십 개 카드가 한꺼번에
  // 로드뷰를 요청하면 응답이 조용히 멈추는 문제가 있어, 뷰포트 진입 시점으로 분산시킨다.
  useEffect(() => {
    if (!wrapRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, []);

  const pano = useRoadviewPano(lat, lng, visible, 20, 20); // maxRadius=goodRadius: fallback 탐색 자체를 안 함

  useEffect(() => {
    if (pano.status !== "good" || !containerRef.current || pano.panoId === null) return;
    let cancelled = false;

    loadKakaoSdk().then(() => {
      if (cancelled || !containerRef.current) return;
      const roadview = new window.kakao.maps.Roadview(containerRef.current);
      window.kakao.maps.event.addListener(roadview, "init", () => {
        // 시설 방향 계산은 init된 인스턴스 스스로 한다 — lib/useRoadviewPano.ts 주석 참고
        pointRoadviewAt(roadview, lat, lng, -2);
      });
      roadview.setPanoId(pano.panoId, new window.kakao.maps.LatLng(lat, lng));
    });

    return () => {
      cancelled = true;
    };
  }, [pano.status, pano.panoId, lat, lng]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      {pano.status === "good" && (
        <div ref={containerRef} className="pointer-events-none h-full w-full" />
      )}
    </div>
  );
}

export function FacilityThumbnail({
  facility,
  className = "",
}: {
  facility: Facility;
  className?: string;
}) {
  // R2 사진이 죽었을 때(도메인 차단·삭제 등) 깨진 이미지 아이콘 대신 일러스트로 내린다.
  // 카드 크기는 부모(aspect 고정)가 잡고 있어 어느 쪽이든 레이아웃은 안 움직인다.
  const [photoFailed, setPhotoFailed] = useState(false);

  // 시설이 동의하고 제공한 실제 사진이 있으면 로드뷰/일러스트/스톡사진보다 항상 우선한다.
  // 목록에서는 카드 수백 장이 한 번에 마운트되므로 화면 밖 사진은 lazy로 미룬다.
  if (facility.photos && facility.photos.length > 0 && !photoFailed) {
    return (
      <img
        src={facility.photos[0]}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setPhotoFailed(true)}
        className={`h-full w-full bg-ink-100 object-cover ${className}`}
      />
    );
  }

  if (facility.dataSource === "public") {
    if (facility.lat !== undefined && facility.lng !== undefined) {
      return (
        <div className={`relative h-full w-full overflow-hidden ${className}`}>
          <FacilityIllustration
            facilityType={facility.facilityType}
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-0">
            <RoadviewThumb lat={facility.lat} lng={facility.lng} />
          </div>
        </div>
      );
    }
    return <FacilityIllustration facilityType={facility.facilityType} className={className} />;
  }

  return (
    <img
      src={facilityPhotoFor(facility.id, 480)}
      alt=""
      loading="lazy"
      decoding="async"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
