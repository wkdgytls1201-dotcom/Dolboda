"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FacilityPhoto, PHOTO_AREA_LABEL, PHOTO_AREA_ORDER } from "@/lib/types";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

// 사진 전체보기 팝업 — 성능 원칙: 이 컴포넌트가 열리기 전까지는 사진을 단 한 장도
// 더 받지 않는다(대표사진 1장만 상세페이지 첫 화면에 이미 떠 있음). 열리고 나서도
// 그리드 썸네일은 화면에 들어올 때만 받고(loading="lazy"), 확대뷰는 그리드에서 이미
// 받은 같은 이미지를 재사용한다 — 추가 다운로드 없음(사진 용량이 원래 1장(~40~90KB)뿐이라
// 썸네일/원본을 따로 두지 않았다).
//
// 영역 탭(외관·생활공간·프로그램...)은 그 시설에 실제로 있는 영역만 보여준다.
export function FacilityPhotoModal({
  photos,
  facilityName,
  onClose,
}: {
  photos: { url: string; area: FacilityPhoto["area"] | null; caption: string | null }[];
  facilityName: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const areas = useMemo(() => {
    const present = new Set(photos.map((p) => p.area).filter(Boolean) as FacilityPhoto["area"][]);
    if (present.size === 0) return [];
    return PHOTO_AREA_ORDER.filter((a) => present.has(a));
  }, [photos]);

  const [tab, setTab] = useState<FacilityPhoto["area"] | "all">(areas[0] ?? "all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const shown = useMemo(
    () => (tab === "all" ? photos : photos.filter((p) => p.area === tab)),
    [photos, tab]
  );

  // ESC로 닫기 — 라이트박스가 열려 있으면 라이트박스부터 닫는다
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (lightboxIndex !== null) setLightboxIndex(null);
      else requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, onClose]);

  // 모달이 열려 있는 동안 배경 스크롤 잠금 — 공용 훅으로 통일(iOS 스크롤 위치 복원 포함)
  useBodyScrollLock();

  // 뒤로가기 = 모달 닫기(네이티브 앱 관성). 이게 없으면 사진을 보다 뒤로가기를 눌렀을 때
  // 상세 페이지가 통째로 pop되어 메인/목록으로 튕긴다 — 사용자는 "사진만 닫힐 것"을
  // 기대한다.
  //
  // 설계: 닫힘의 단일 경로는 popstate다 — X·ESC도 history.back()을 불러 같은 길로 온다.
  // 그래서 어느 쪽으로 닫아도 쌓아둔 히스토리 한 칸이 정확히 걷힌다.
  // (처음엔 effect 정리에서 back()을 불렀는데, StrictMode의 이중 실행에서 그 back()이
  // 스스로 popstate를 쏴 모달을 여는 즉시 닫아버렸다 — 정리에서는 리스너만 걷고
  // 히스토리는 건드리지 않는다. push도 이미 쌓여 있으면 건너뛰어 이중 실행에 안전하다.)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (window.history.state?.dolbodaPhotoModal !== true) {
      window.history.pushState({ dolbodaPhotoModal: true }, "");
    }
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function requestClose() {
    if (window.history.state?.dolbodaPhotoModal === true) window.history.back();
    else onCloseRef.current();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="animate-overlay-in fixed inset-0 z-[70] flex flex-col bg-ink-900/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{facilityName}</p>
          <p className="text-xs text-white/60">사진 {photos.length}장</p>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="닫기"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
        >
          <X size={20} />
        </button>
      </div>

      {areas.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabChip active={tab === "all"} onClick={() => setTab("all")} label="전체" />
          {areas.map((a) => (
            <TabChip key={a} active={tab === a} onClick={() => setTab(a)} label={PHOTO_AREA_LABEL[a]} />
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shown.map((p, i) => (
            <button
              key={p.url + i}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-ink-800"
            >
              <img
                src={p.url}
                alt={p.caption ?? `${facilityName} 사진`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 group-active:scale-95"
              />
              {p.caption && (
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-[11px] text-white">
                  {p.caption}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={shown}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>,
    document.body
  );
}

function TabChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[36px] shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
        active ? "bg-white text-ink-900" : "bg-white/10 text-white/70 hover:bg-white/15"
      }`}
    >
      {label}
    </button>
  );
}

// 확대뷰 — 그리드가 이미 내려받은 <img>를 그대로 키워서 보여준다(재요청 없음).
// 좌우 스와이프/화살표로 같은 탭 안에서만 이동한다.
function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: { url: string; caption: string | null }[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const current = items[index];
  if (!current) return null;

  function go(delta: number) {
    const next = index + delta;
    if (next >= 0 && next < items.length) onIndexChange(next);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx > 50) go(-1);
        else if (dx < -50) go(1);
        touchStartX.current = null;
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
      >
        <X size={22} />
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          aria-label="이전 사진"
          className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {index < items.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          aria-label="다음 사진"
          className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
        >
          <ChevronRight size={22} />
        </button>
      )}

      <img
        src={current.url}
        alt={current.caption ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain"
      />
      {current.caption && (
        <p className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
          {current.caption}
        </p>
      )}
    </div>
  );
}
