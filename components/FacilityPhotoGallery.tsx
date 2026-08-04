"use client";

import { useMemo, useState } from "react";
import {
  Facility,
  FacilityPhoto,
  PHOTO_AREA_LABEL,
  PHOTO_AREA_ORDER,
} from "@/lib/types";
import { FacilityThumbnail } from "./FacilityThumbnail";

// 실제 사진이 2장 이상 있는 시설만 옆으로 넘기는 갤러리로 보여주고,
// 그 외(사진 없음/1장)는 기존 썸네일(로드뷰·일러스트·스톡사진) 그대로 보여준다.
// photoItems(영역 정보)가 있으면 슬라이드마다 "외관"·"생활실" 같은 영역 라벨을 붙이고,
// 외관 → 생활 공간 → 활동 → 부대시설 순서로 정렬한다(PHOTO_AREA_ORDER).
export function FacilityPhotoGallery({ facility }: { facility: Facility }) {
  // 영역 정보가 있으면 그걸 쓰고, 없으면(과거 데이터) URL 목록을 라벨 없이 보여준다
  const slides = useMemo<{ url: string; label: string | null }[]>(() => {
    const items = facility.photoItems ?? [];
    if (items.length > 0) {
      const order = (p: FacilityPhoto) => {
        const i = PHOTO_AREA_ORDER.indexOf(p.area);
        return i === -1 ? PHOTO_AREA_ORDER.length : i;
      };
      return [...items]
        .sort((a, b) => order(a) - order(b))
        .map((p) => ({ url: p.url, label: p.caption ?? PHOTO_AREA_LABEL[p.area] ?? null }));
    }
    return (facility.photos ?? []).map((url) => ({ url, label: null }));
  }, [facility.photoItems, facility.photos]);

  const [index, setIndex] = useState(0);

  if (slides.length < 2) {
    return (
      <div className="relative mb-6 aspect-[21/9] overflow-hidden rounded-2xl">
        <FacilityThumbnail facility={facility} />
        <span className="absolute bottom-3 right-3 rounded-full bg-ink-900/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {facility.dataSource === "public" ? "실제 시설 사진 준비 중" : "예시 이미지 (실제 시설 사진 아님)"}
        </span>
      </div>
    );
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const track = e.currentTarget;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    setIndex(Math.min(slides.length - 1, Math.max(0, i)));
  }

  return (
    <div className="relative mb-6">
      <div
        onScroll={handleScroll}
        className="flex aspect-[21/9] snap-x snap-mandatory overflow-x-auto rounded-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <img
            key={s.url + i}
            src={s.url}
            alt={`${facility.name} ${s.label ?? `사진 ${i + 1}`}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="h-full w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>

      {/* 현재 슬라이드의 영역 라벨 — 어느 공간을 보고 있는지 알려준다 */}
      {slides[index]?.label && (
        <span className="absolute left-3 top-3 rounded-full bg-ink-900/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
          {slides[index].label}
        </span>
      )}

      <span className="absolute right-3 top-3 rounded-full bg-ink-900/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
        {index + 1} / {slides.length}
      </span>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
