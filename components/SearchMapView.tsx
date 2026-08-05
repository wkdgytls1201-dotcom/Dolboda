"use client";

// 시설찾기 "지도 보기" — 앱형 전체 화면 지도 + 3단 스냅 드래그 시트 (2026-08-05 재구성)
//
// 설계 원칙:
// - 마커 수백 개를 React로 그리지 않는다: 기본 마커는 카카오 Marker(이미지 마커)로 만들어
//   MarkerClusterer에 통째로 넘기고, "선택" 상태만 CustomOverlay 하나를 재사용해 옮긴다.
// - 드래그 중 React 상태 갱신 0: 시트 위치는 ref+rAF+translate3d로만 움직이고,
//   스냅이 확정되는 순간에만 setState 한 번(13차 BottomSheet와 같은 원칙·같은 스프링 상수).
// - 지도 이동 중 데이터 요청 금지: idle 후 "이 지역에서 다시 검색" 버튼만 보여주고,
//   눌렀을 때만 조회(디바운스 300ms·AbortController·영역 캐시).
// - 이동 출처 구분(programMoveRef): 마커/카드 선택에 의한 panTo가 다시 "사용자 이동"으로
//   오인돼 버튼이 뜨거나 무한 루프가 생기지 않게 한다.
// - 카카오 웹 SDK는 지도 스타일 API가 없어 저채도는 컨테이너 CSS 필터로 처리한다.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Crosshair, RotateCw } from "lucide-react";
import { loadKakaoSdk } from "@/components/KakaoMap";
import { NHIS_GRADE_LETTER } from "@/components/GradeBadge";
import { shortAddress } from "@/lib/shortAddress";
import { FACILITY_TYPE_LABEL, type Facility } from "@/lib/types";
import { PROMOTED_FACILITY_IDS } from "@/lib/promotedFacilities";

interface MapItem {
  f: Facility;
  distanceKm?: number;
}

interface Props {
  items: MapItem[];
  origin: { lat: number; lng: number };
  hasLocation: boolean;
  onClose: () => void;
  /** 영역 재검색으로 받아온 시설에 현재 검색어·필터·정렬을 그대로 적용(부모의 파이프라인) */
  transformArea: (list: Facility[]) => MapItem[];
}

// 13차 BottomSheet에서 검증된 값 — 임계감쇠 바로 아래의 아주 약한 탄성
const SPRING_STIFFNESS = 420;
const SPRING_DAMPING = 40;
const FLICK_VELOCITY = 0.5; // px/ms
// 스냅 3단 — 화면 높이 비율
const SNAP_RATIO = { peek: 0.22, mid: 0.52, full: 0.9 } as const;
type SnapState = keyof typeof SNAP_RATIO;

const AREA_DEBOUNCE_MS = 300;
const AREA_LIMIT = 200;
// 같은 영역을 다시 볼 때 재요청하지 않는다(세션 내 캐시, 최대 20개 영역)
const areaCache = new Map<string, Facility[]>();

function gradeLabel(f: Facility) {
  if (f.grade == null) return "등급 제외";
  return f.gradeSource === "NHIS"
    ? `${NHIS_GRADE_LETTER[f.grade - 1] ?? f.grade}등급`
    : `${f.grade}등급`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 작은 원형 마커 — DOM 오버레이 대신 이미지 마커라 수백 개여도 가볍다
function circleMarkerDataUri(size: number, fill: string, ring: string) {
  const r = size / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${r}" cy="${r}" r="${r - 2}" fill="${fill}" stroke="${ring}" stroke-width="2"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export default function SearchMapView({ items, origin, hasLocation, onClose, transformArea }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const selectedOverlayRef = useRef<any>(null);
  const programMoveRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [mapReady, setMapReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [showAreaButton, setShowAreaButton] = useState(false);
  const [areaLoading, setAreaLoading] = useState(false);
  const [localItems, setLocalItems] = useState<MapItem[] | null>(null);
  const [snap, setSnap] = useState<SnapState>("peek");
  const snapRef = useRef<SnapState>("peek");
  snapRef.current = snap;

  const display = localItems ?? items;
  const displayRef = useRef(display);
  displayRef.current = display;

  // 부모 목록(필터·검색어)이 바뀌면 영역 재검색 결과는 버린다 — 필터가 진실이다
  useEffect(() => setLocalItems(null), [items]);

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 시트 물리 ──────────────────────────────────────────────────────────
  // 시트 높이는 full 기준으로 고정하고 translateY로만 움직인다(레이아웃 스래싱 0).
  const yRef = useRef(0);
  const rafRef = useRef(0);
  const vhRef = useRef(0);

  function vh() {
    return window.visualViewport?.height ?? window.innerHeight;
  }
  function yFor(state: SnapState) {
    // full 높이 시트에서 위로 드러난 만큼을 뺀 나머지가 translateY
    return Math.round(vhRef.current * (SNAP_RATIO.full - SNAP_RATIO[state]));
  }
  function applyY(y: number) {
    yRef.current = y;
    if (sheetRef.current) sheetRef.current.style.transform = `translate3d(0, ${y}px, 0)`;
  }
  function sheetVisiblePx() {
    return Math.round(vhRef.current * SNAP_RATIO.full) - yRef.current;
  }

  useLayoutEffect(() => {
    vhRef.current = vh();
    applyY(yFor("peek"));
    const onResize = () => {
      vhRef.current = vh();
      applyY(yFor(snapRef.current));
    };
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    // 지도 모드 동안 페이지 스크롤·당겨서 새로고침을 잠근다
    const prevOverflow = document.documentElement.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onResize);
      document.documentElement.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function springTo(state: SnapState) {
    cancelAnimationFrame(rafRef.current);
    const target = yFor(state);
    if (reducedMotion) {
      applyY(target);
      setSnap(state);
      return;
    }
    let vel = velRef.current;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const dist = target - yRef.current;
      vel += (SPRING_STIFFNESS * dist - SPRING_DAMPING * vel) * dt;
      const next = yRef.current + vel * dt;
      if (Math.abs(dist) < 0.5 && Math.abs(vel) < 20) {
        applyY(target);
        velRef.current = 0;
        setSnap(state);
        return;
      }
      applyY(next);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  // 드래그 — 손가락을 실시간으로 따라가고, 놓는 순간 거리+속도로 다음 스냅을 정한다
  const dragRef = useRef<{
    id: number;
    startY: number;
    startTranslate: number;
    lastY: number;
    lastT: number;
    claimed: boolean;
    fromHandle: boolean;
  } | null>(null);
  const velRef = useRef(0);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    cancelAnimationFrame(rafRef.current);
    const fromHandle = (e.target as HTMLElement).closest("[data-sheet-handle]") !== null;
    dragRef.current = {
      id: e.pointerId,
      startY: e.clientY,
      startTranslate: yRef.current,
      lastY: e.clientY,
      lastT: performance.now(),
      claimed: false,
      fromHandle,
    };
    velRef.current = 0;
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.startY;

    if (!d.claimed) {
      if (Math.abs(dy) < 6) return;
      const list = listRef.current;
      const listAtTop = !list || list.scrollTop <= 0;
      // 제스처 소유권(13차 BottomSheet에서 확립한 규칙의 지도판): 목록 스크롤은
      // full에서만 산다(그 외엔 목록에 overflow-hidden이 걸려 있어 충돌 자체가 없다).
      // 핸들은 항상 시트, full에서는 "최상단에서 아래로 당길 때"만 시트가 가져간다.
      const claim =
        d.fromHandle || snapRef.current !== "full" || (dy > 0 && listAtTop);
      if (!claim) {
        dragRef.current = null;
        return;
      }
      d.claimed = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* 합성 이벤트·일부 브라우저에서 NotFoundError — 캡처 없이도 동작(13차 §3-6) */
      }
    }

    e.preventDefault();
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) velRef.current = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = now;

    let next = d.startTranslate + dy;
    const yFull = yFor("full");
    const yPeek = yFor("peek");
    // 위쪽 경계는 러버밴드(15%), 아래는 peek에서 멈춘다(지도 모드에선 시트를 없애지 않는다)
    if (next < yFull) next = yFull - (yFull - next) * 0.15;
    if (next > yPeek) next = yPeek;
    applyY(next);
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    dragRef.current = null;
    if (!d.claimed) return;

    const v = velRef.current;
    const order: SnapState[] = ["full", "mid", "peek"]; // translateY 오름차순
    let target: SnapState;
    if (v <= -FLICK_VELOCITY) {
      // 위로 플릭 — 다음 위 스냅(빠르면 한 번에 full)
      target = Math.abs(v) > 1.6 ? "full" : snapRef.current === "peek" ? "mid" : "full";
    } else if (v >= FLICK_VELOCITY) {
      target = Math.abs(v) > 1.6 ? "peek" : snapRef.current === "full" ? "mid" : "peek";
    } else {
      target = order.reduce((best, s) =>
        Math.abs(yFor(s) - yRef.current) < Math.abs(yFor(best) - yRef.current) ? s : best
      );
    }
    springTo(target);
  }

  // ── 지도 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const kakao = window.kakao;
        const first = displayRef.current.find((x) => x.f.lat != null && x.f.lng != null)?.f;
        const center = new kakao.maps.LatLng(
          hasLocation ? origin.lat : (first?.lat ?? origin.lat),
          hasLocation ? origin.lng : (first?.lng ?? origin.lng)
        );
        const map = new kakao.maps.Map(containerRef.current, { center, level: 7 });
        mapRef.current = map;

        clustererRef.current = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 6, // 이 레벨 이상(넓게 볼 때)만 묶는다 — 확대하면 개별 마커로 풀림
          disableClickZoom: false, // 클러스터 탭 = 그 영역으로 확대(기본 동작)
          calculator: [10, 30, 100],
          styles: [36, 44, 52, 60].map((s, i) => ({
            width: `${s}px`,
            height: `${s}px`,
            background: `rgba(255, 98, 80, ${0.82 + i * 0.04})`,
            borderRadius: "9999px",
            border: "2px solid #fff",
            boxShadow: "0 2px 8px rgba(27,23,48,0.25)",
            color: "#fff",
            fontWeight: "800",
            fontSize: `${12 + i}px`,
            textAlign: "center",
            lineHeight: `${s - 4}px`,
          })),
        });

        // 선택 마커 — 하나만 만들어 재사용(선택할 때마다 내용 교체로 팝 애니메이션 재생)
        selectedOverlayRef.current = new kakao.maps.CustomOverlay({ zIndex: 30, yAnchor: 0.5 });

        if (hasLocation) {
          new kakao.maps.CustomOverlay({
            map,
            position: new kakao.maps.LatLng(origin.lat, origin.lng),
            zIndex: 5,
            content:
              '<div style="width:14px;height:14px;border-radius:9999px;background:#4285F4;border:2px solid #fff;box-shadow:0 0 0 4px rgba(66,133,244,.3)"></div>',
          });
        }

        // 이동 출처 구분 — 사용자가 움직였을 때만 "이 지역에서 다시 검색"을 띄운다
        kakao.maps.event.addListener(map, "dragstart", () => {
          if (!programMoveRef.current) userMovedRef.current = true;
        });
        kakao.maps.event.addListener(map, "zoom_changed", () => {
          if (!programMoveRef.current) userMovedRef.current = true;
        });
        kakao.maps.event.addListener(map, "idle", () => {
          if (programMoveRef.current) {
            programMoveRef.current = false;
            return;
          }
          if (!userMovedRef.current) return;
          userMovedRef.current = false;
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          idleTimerRef.current = setTimeout(() => setShowAreaButton(true), AREA_DEBOUNCE_MS);
        });

        setMapReady(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    // 지도 인스턴스는 마운트당 1회만 만든다 — 리렌더마다 재생성되면 중심·확대가 튕긴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const userMovedRef = useRef(false);

  // 마커 재구성 — 목록이 바뀔 때만(선택 상태는 오버레이가 따로 들고 있어 영향 없음)
  useEffect(() => {
    if (!mapReady || !clustererRef.current) return;
    const kakao = window.kakao;
    const clusterer = clustererRef.current;
    clusterer.clear();
    markersRef.current.clear();

    const baseImg = new kakao.maps.MarkerImage(
      circleMarkerDataUri(18, "#FF6250", "#ffffff"),
      new kakao.maps.Size(18, 18),
      { offset: new kakao.maps.Point(9, 9) }
    );
    const promotedImg = new kakao.maps.MarkerImage(
      circleMarkerDataUri(22, "#F5A524", "#ffffff"),
      new kakao.maps.Size(22, 22),
      { offset: new kakao.maps.Point(11, 11) }
    );
    const promoted = new Set(PROMOTED_FACILITY_IDS);

    const markers = display
      .filter((x) => x.f.lat != null && x.f.lng != null)
      .map((x) => {
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(x.f.lat, x.f.lng),
          image: promoted.has(x.f.id) ? promotedImg : baseImg,
          title: x.f.name,
        });
        kakao.maps.event.addListener(marker, "click", () => select(x.f.id, "marker"));
        markersRef.current.set(x.f.id, marker);
        return marker;
      });
    clusterer.addMarkers(markers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, mapReady]);

  // ── 선택 동기화 (마커 ↔ 카드) ─────────────────────────────────────────
  function select(id: string, source: "marker" | "card") {
    const item = displayRef.current.find((x) => x.f.id === id);
    const map = mapRef.current;
    if (!item || !map || item.f.lat == null || item.f.lng == null) return;
    setSelectedId(id);

    // 선택 오버레이 — 흰 테두리+그림자+1회 스프링 팝(반복 펄스 없음)
    const overlay = selectedOverlayRef.current;
    const pos = new window.kakao.maps.LatLng(item.f.lat, item.f.lng);
    overlay.setContent(
      `<div class="smv-pop" style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">` +
        `<div style="width:28px;height:28px;border-radius:9999px;background:#FF6250;border:3px solid #fff;box-shadow:0 4px 14px rgba(27,23,48,.35)"></div>` +
        `<div style="margin-top:4px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#fff;border-radius:9999px;padding:3px 9px;font-size:11px;font-weight:800;color:#1B1730;box-shadow:0 2px 8px rgba(27,23,48,.18)">${escapeHtml(item.f.name)}</div>` +
        `</div>`
    );
    overlay.setPosition(pos);
    overlay.setMap(map);

    // 시트에 가리지 않게 — 마커가 "보이는 영역"의 가운데에 오도록 중심을 보정해서 이동
    programMoveRef.current = true;
    setShowAreaButton(false);
    const proj = map.getProjection();
    const pt = proj.containerPointFromCoords(pos);
    const target = proj.coordsFromContainerPoint(
      new window.kakao.maps.Point(pt.x, pt.y + sheetVisiblePx() / 2)
    );
    map.panTo(target);

    // 시트 목록의 해당 카드를 가운데로 + 짧게 강조
    requestAnimationFrame(() => {
      document
        .getElementById(`smv-card-${id}`)
        ?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
    });
    setFlashId(id);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 900);

    // 전체 화면 목록에서 골랐으면 지도가 보이게 중간으로 내려준다
    if (source === "card" && snapRef.current === "full") springTo("mid");
  }

  // ── 이 지역에서 다시 검색 ──────────────────────────────────────────────
  async function searchArea() {
    const map = mapRef.current;
    if (!map || areaLoading) return;
    const c = map.getCenter();
    const key = `${c.getLat().toFixed(3)},${c.getLng().toFixed(3)},${map.getLevel()}`;

    setAreaLoading(true);
    try {
      let list = areaCache.get(key);
      if (!list) {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await fetch(
          `/api/facilities/nearby?lat=${c.getLat()}&lng=${c.getLng()}&limit=${AREA_LIMIT}&view=card`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { items: Facility[] };
        list = data.items;
        areaCache.set(key, list);
        if (areaCache.size > 20) areaCache.delete(areaCache.keys().next().value!);
      }
      // 화면에 보이는 영역만 남기고, 현재 검색어·필터·정렬을 그대로 적용
      const b = map.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const inBounds = list.filter(
        (f) =>
          f.lat != null &&
          f.lng != null &&
          f.lat >= sw.getLat() &&
          f.lat <= ne.getLat() &&
          f.lng >= sw.getLng() &&
          f.lng <= ne.getLng()
      );
      setLocalItems(transformArea(inBounds));
      setShowAreaButton(false);
      setSelectedId(null);
      selectedOverlayRef.current?.setMap(null);
      listRef.current?.scrollTo({ top: 0 });
    } catch {
      /* 취소·실패 — 기존 목록 유지(로딩 화면으로 갈아엎지 않는다) */
    } finally {
      setAreaLoading(false);
    }
  }

  function goToMyLocation() {
    const map = mapRef.current;
    if (!map || !hasLocation) return;
    programMoveRef.current = true;
    map.setLevel(6);
    map.panTo(new window.kakao.maps.LatLng(origin.lat, origin.lng));
  }

  const sheetHeightStyle = `${SNAP_RATIO.full * 100}dvh`;

  const body = (
    <div className="fixed inset-0 z-[70] bg-ivory-50">
      <style>{`
        .smv-pop { animation: smv-pop .26s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes smv-pop { from { transform: scale(.55); opacity: .4; } to { transform: scale(1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .smv-pop { animation: none; } }
      `}</style>

      {/* 지도 — 저채도 필터로 시설 마커(코랄)가 먼저 보이게. 카카오 웹 SDK는 지도
          스타일 지정이 없어 CSS 필터가 유일한 수단이다. */}
      <div
        ref={containerRef}
        className="absolute inset-0 [filter:saturate(.78)_brightness(1.02)]"
        aria-label="시설 지도"
      />

      {failed && (
        <div className="absolute inset-x-4 top-1/3 rounded-2xl bg-white p-6 text-center text-sm text-ink-500 shadow-card">
          지도를 불러올 수 없어요. 잠시 후 다시 시도해주세요.
        </div>
      )}

      {/* 상단 바 — 목록으로 돌아가기 + 결과 수 */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 p-3 [padding-top:calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="목록 보기로 돌아가기"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-700 shadow-card transition-transform active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="rounded-full bg-white px-3.5 py-2 text-[13px] font-bold text-ink-900 shadow-card">
          이 지역 {display.length}곳
        </span>
      </div>

      {/* 이 지역에서 다시 검색 — 사용자가 지도를 움직여 멈춘 뒤에만 나타난다 */}
      {showAreaButton && (
        <button
          type="button"
          onClick={searchArea}
          disabled={areaLoading}
          className="absolute left-1/2 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 flex min-h-[44px] -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary-500 px-4 text-[13px] font-bold text-white shadow-card transition-all active:scale-95 disabled:opacity-70"
        >
          <RotateCw size={14} className={areaLoading ? "animate-spin" : ""} />
          {areaLoading ? "검색 중..." : "이 지역에서 다시 검색"}
        </button>
      )}

      {hasLocation && (
        <button
          type="button"
          onClick={goToMyLocation}
          aria-label="내 위치로 이동"
          className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-500 shadow-card transition-transform active:scale-95"
          style={{ bottom: `calc(${SNAP_RATIO.peek * 100}dvh + 12px)` }}
        >
          <Crosshair size={18} />
        </button>
      )}

      {/* 드래그 바텀시트 — translateY만 움직인다(높이는 full로 고정) */}
      <div
        ref={sheetRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ height: sheetHeightStyle, willChange: "transform" }}
        // select-none: 안드로이드에서 드래그 중 카드 텍스트가 선택되는 것 방지
        className="absolute inset-x-0 bottom-0 flex select-none flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(27,23,48,0.14)]"
      >
        <div
          data-sheet-handle
          className="flex shrink-0 cursor-grab touch-none items-center justify-center pb-1 pt-2.5"
        >
          <span className="h-1 w-10 rounded-full bg-ink-200" aria-hidden />
        </div>
        <p data-sheet-handle className="shrink-0 touch-none px-4 pb-2 text-[12px] font-semibold text-ink-400">
          {display.length}곳 · 지도를 움직여 다른 지역을 볼 수 있어요
        </p>

        <div
          ref={listRef}
          // 목록 스크롤은 시트가 전체로 올라왔을 때만 연다 — 중간·최소 상태에서 목록이
          // 함께 스크롤되면 시트 드래그와 이중으로 움직인다(제스처 소유권 분리)
          className={`min-h-0 flex-1 overscroll-contain px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] ${
            snap === "full" ? "overflow-y-auto [touch-action:pan-y]" : "touch-none overflow-hidden"
          }`}
        >
          {display.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-ink-400">
              이 지역엔 조건에 맞는 시설이 없어요.
              <br />
              지도를 옮겨 "이 지역에서 다시 검색"을 눌러보세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {display.map(({ f, distanceKm }) => (
                <li key={f.id} id={`smv-card-${f.id}`}>
                  {/* a(상세 링크)를 품어야 해서 button이 아니라 role="button" div — 중첩
                      인터랙티브 요소는 invalid HTML이다 */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => select(f.id, "card")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        select(f.id, "card");
                      }
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.985] ${
                      selectedId === f.id
                        ? "border-primary-300 bg-primary-50/60"
                        : "border-ink-100 bg-white"
                    } ${flashId === f.id ? "ring-2 ring-primary-300" : ""}`}
                  >
                    {f.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.photos[0]}
                        alt=""
                        width={56}
                        height={56}
                        loading="lazy"
                        className="h-14 w-14 shrink-0 rounded-xl bg-ink-100 object-cover"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg font-extrabold text-primary-400">
                        {f.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[15px] font-bold text-ink-900">{f.name}</span>
                        <span className="shrink-0 rounded-full bg-royal-50 px-1.5 py-0.5 text-[10px] font-bold text-royal-700">
                          {gradeLabel(f)}
                        </span>
                      </span>
                      <span className="block truncate text-[12px] text-ink-500">
                        {FACILITY_TYPE_LABEL[f.facilityType]} · {shortAddress(f.address)}
                        {distanceKm !== undefined && (
                          <span className="ml-1 font-semibold text-mint-600">
                            {distanceKm < 1
                              ? `${Math.round(distanceKm * 1000)}m`
                              : `${distanceKm.toFixed(1)}km`}
                          </span>
                        )}
                      </span>
                    </span>
                    <a
                      href={`/facility/${f.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex min-h-[44px] shrink-0 items-center rounded-full bg-primary-500 px-3.5 text-[12px] font-bold text-white transition-transform active:scale-95"
                    >
                      상세
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
