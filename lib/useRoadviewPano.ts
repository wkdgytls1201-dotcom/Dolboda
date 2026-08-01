import { useEffect, useState } from "react";
import { loadKakaoSdk } from "@/components/KakaoMap";
import { bearingDegrees } from "./geo";
import { roadviewQueue } from "./requestQueue";

export type RoadviewPanoStatus = "loading" | "good" | "fallback" | "none" | "error";

export interface RoadviewPano {
  status: RoadviewPanoStatus;
  panoId: number | null;
}

const IDLE: RoadviewPano = { status: "loading", panoId: null };

function getNearestPanoId(
  client: any,
  position: any,
  radius: number
): Promise<number | null> {
  return new Promise((resolve) => client.getNearestPanoId(position, radius, resolve));
}

/**
 * 실제 Roadview 인스턴스가 init된 뒤, 촬영지점에서 시설 쪽을 바라보도록 시점을 돌린다.
 *
 * 방위각 계산에 필요한 촬영지점 좌표는 init된 인스턴스 자신이 이미 알고 있다
 * (`roadview.getPosition()`). 예전엔 이 좌표를 얻자고 화면 밖에 숨긴 임시 Roadview를
 * 하나 더 만들었는데, 그 임시 인스턴스도 파노라마 타일을 통째로 내려받아서
 * 로드뷰 하나당 타일을 두 번씩 받고 있었다(모바일에서 특히 아까운 낭비).
 * init 이벤트 안에서 계산하면 임시 인스턴스도, 6초 타임아웃 장치도 필요 없다.
 */
export function pointRoadviewAt(roadview: any, lat: number, lng: number, zoom: number) {
  const panoPos = roadview.getPosition();
  const pan = bearingDegrees(panoPos.getLat(), panoPos.getLng(), lat, lng);
  roadview.setViewpoint({ pan, tilt: 0, zoom });
}

// 시설 좌표에서 가까운 로드뷰 촬영지점을 찾는다.
// goodRadius 이내에서 찾으면 "good"(건물이 가까이서 잘 보일 가능성이 높음),
// maxRadius까지 넓혀야 찾아지면 "fallback"(각도가 애매하거나 멀어서 나무 등에 가려질 수 있음).
// 완전한 시각적 가림(나무 등) 판별은 이미지 인식이 필요해 여기선 "촬영지점과의 거리"로 대신 추정한다.
// enabled=false면 조회를 시작하지 않음(리스트 페이지에서 화면에 보일 때만 시작시키는 용도).
// 카카오 쪽에 동시 요청이 몰리면 응답이 조용히 멈추는 현상이 있어 전역 큐로 동시 실행 개수를 제한한다.
export function useRoadviewPano(
  lat?: number,
  lng?: number,
  enabled = true,
  goodRadius = 20,
  maxRadius = 50
): RoadviewPano {
  const [state, setState] = useState<RoadviewPano>(IDLE);

  useEffect(() => {
    if (!enabled || lat === undefined || lng === undefined) return;
    let cancelled = false;
    setState(IDLE);

    roadviewQueue
      .run(async () => {
        await loadKakaoSdk();
        if (cancelled) return null;
        const position = new window.kakao.maps.LatLng(lat, lng);
        const client = new window.kakao.maps.RoadviewClient();

        let panoId = await getNearestPanoId(client, position, goodRadius);
        let quality: "good" | "fallback" = "good";
        if (!panoId) {
          panoId = await getNearestPanoId(client, position, maxRadius);
          quality = "fallback";
        }
        if (!panoId) return { status: "none" as const, panoId: null };
        return { status: quality, panoId };
      })
      .then((result) => {
        if (!cancelled && result) setState(result);
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", panoId: null });
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, enabled, goodRadius, maxRadius]);

  return state;
}
