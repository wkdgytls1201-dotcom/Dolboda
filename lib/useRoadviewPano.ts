import { useEffect, useState } from "react";
import { loadKakaoSdk } from "@/components/KakaoMap";
import { bearingDegrees } from "./geo";
import { roadviewQueue } from "./requestQueue";

export type RoadviewPanoStatus = "loading" | "good" | "fallback" | "none" | "error";

export interface RoadviewPano {
  status: RoadviewPanoStatus;
  panoId: number | null;
  pan: number; // 시설 방향을 향하도록 계산된 방위각
}

const IDLE: RoadviewPano = { status: "loading", panoId: null, pan: 0 };

function getNearestPanoId(
  client: any,
  position: any,
  radius: number
): Promise<number | null> {
  return new Promise((resolve) => client.getNearestPanoId(position, radius, resolve));
}

// 좌표 → 파노ID를 얻기 위해 임시 Roadview를 잠깐 만들어 촬영지점 좌표(방위각 계산용)를 받아온다.
// (Roadview는 실제로 DOM에 붙어 크기가 있어야 init 이벤트가 발생함)
function resolvePanoPosition(panoId: number, position: any): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = "position:fixed;left:-9999px;top:0;width:100px;height:100px;";
    document.body.appendChild(tempDiv);
    const timeout = setTimeout(() => {
      tempDiv.remove();
      reject(new Error("로드뷰 init 타임아웃"));
    }, 6000);
    const tempRoadview = new window.kakao.maps.Roadview(tempDiv);
    window.kakao.maps.event.addListener(tempRoadview, "init", () => {
      clearTimeout(timeout);
      const panoPos = tempRoadview.getPosition();
      tempDiv.remove();
      resolve({ lat: panoPos.getLat(), lng: panoPos.getLng() });
    });
    tempRoadview.setPanoId(panoId, position);
  });
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
        if (!panoId) return { status: "none" as const, panoId: null, pan: 0 };

        const panoPos = await resolvePanoPosition(panoId, position);
        const pan = bearingDegrees(panoPos.lat, panoPos.lng, lat, lng);
        return { status: quality, panoId, pan };
      })
      .then((result) => {
        if (!cancelled && result) setState(result);
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", panoId: null, pan: 0 });
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, enabled, goodRadius, maxRadius]);

  return state;
}
