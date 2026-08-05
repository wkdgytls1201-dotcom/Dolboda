"use client";

import { useMemo, useState } from "react";
import { Images } from "lucide-react";
import { Facility, FacilityPhoto, PHOTO_AREA_LABEL, PHOTO_AREA_ORDER } from "@/lib/types";
import { FacilityThumbnail } from "./FacilityThumbnail";
import { FacilityPhotoModal } from "./FacilityPhotoModal";

// 대표사진 1장만 첫 화면에 걸고, 나머지는 버튼을 눌러야 그때 받는다(팝업 열기 전엔
// 추가 다운로드 0건) — 사진이 많은 시설(공단 대량 사진 기준 시설당 최대 12장)에서
// 상세페이지 첫 로딩이 느려지지 않게 하기 위함. 예전엔 전체를 캐러셀로 깔아
// 스와이프해야 다음 사진을 봤는데, 그 방식은 사진이 늘어날수록 첫 화면 데이터가 커졌다.
//
// 대표사진 선정: photoItems에 area="exterior"가 있으면 그걸 최우선으로 쓴다
// (건물 밖에서 본 모습이 보호자에게 첫인상이 되어야 한다는 원칙, lib/types.ts 참고).
export function FacilityPhotoGallery({ facility }: { facility: Facility }) {
  const [open, setOpen] = useState(false);

  const items = useMemo<{ url: string; area: FacilityPhoto["area"] | null; caption: string | null }[]>(() => {
    const photoItems = facility.photoItems ?? [];
    if (photoItems.length > 0) {
      const order = (p: FacilityPhoto) => {
        const i = PHOTO_AREA_ORDER.indexOf(p.area);
        return i === -1 ? PHOTO_AREA_ORDER.length : i;
      };
      return [...photoItems]
        .sort((a, b) => order(a) - order(b))
        .map((p) => ({ url: p.url, area: p.area, caption: p.caption ?? PHOTO_AREA_LABEL[p.area] ?? null }));
    }
    return (facility.photos ?? []).map((url) => ({ url, area: null, caption: null }));
  }, [facility.photoItems, facility.photos]);

  if (items.length === 0) {
    return (
      // facility-hero: 목록 카드·배너의 대표 사진이 이 자리로 모핑해 들어온다
      <div
        style={{ viewTransitionName: "facility-hero" }}
        className="relative mb-6 aspect-[21/9] overflow-hidden rounded-2xl"
      >
        <FacilityThumbnail facility={facility} />
        <span className="absolute bottom-3 right-3 rounded-full bg-ink-900/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {facility.dataSource === "public" ? "실제 시설 사진 준비 중" : "예시 이미지 (실제 시설 사진 아님)"}
        </span>
      </div>
    );
  }

  // 외관을 최우선으로 대표사진을 고른다 — 하나도 없으면 첫 장을 그대로 쓴다
  const hero = items.find((p) => p.area === "exterior") ?? items[0];

  return (
    <>
      <button
        type="button"
        onClick={() => items.length > 1 && setOpen(true)}
        style={{ viewTransitionName: "facility-hero" }}
        className="relative mb-6 block aspect-[21/9] w-full overflow-hidden rounded-2xl"
        aria-label={items.length > 1 ? `사진 ${items.length}장 전체보기` : undefined}
      >
        <img
          src={hero.url}
          alt={`${facility.name} ${hero.caption ?? "대표사진"}`}
          loading="eager"
          className="h-full w-full object-cover"
        />
        {hero.caption && (
          <span className="absolute left-3 top-3 rounded-full bg-ink-900/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
            {hero.caption}
          </span>
        )}
        {items.length > 1 && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ink-900/60 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur">
            <Images size={13} aria-hidden />
            사진 {items.length}장 보기
          </span>
        )}
      </button>

      {open && (
        <FacilityPhotoModal photos={items} facilityName={facility.name} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
