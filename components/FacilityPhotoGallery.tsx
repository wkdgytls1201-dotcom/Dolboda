"use client";

import { useState } from "react";
import { Facility } from "@/lib/types";
import { FacilityThumbnail } from "./FacilityThumbnail";

// 실제 사진이 2장 이상 있는 시설만 옆으로 넘기는 갤러리로 보여주고,
// 그 외(사진 없음/1장)는 기존 썸네일(로드뷰·일러스트·스톡사진) 그대로 보여준다.
export function FacilityPhotoGallery({ facility }: { facility: Facility }) {
  const photos = facility.photos ?? [];
  const [index, setIndex] = useState(0);

  if (photos.length < 2) {
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
    setIndex(Math.min(photos.length - 1, Math.max(0, i)));
  }

  return (
    <div className="relative mb-6">
      <div
        onScroll={handleScroll}
        className="flex aspect-[21/9] snap-x snap-mandatory overflow-x-auto rounded-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((url, i) => (
          <img
            key={url + i}
            src={url}
            alt={`${facility.name} 사진 ${i + 1}`}
            className="h-full w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>

      <span className="absolute right-3 top-3 rounded-full bg-ink-900/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
        {index + 1} / {photos.length}
      </span>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {photos.map((_, i) => (
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
