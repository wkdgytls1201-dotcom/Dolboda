"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFacilities } from "@/lib/useFacilities";
import { FACILITY_TYPE_LABEL } from "@/lib/types";
import { facilityPhotoFor } from "@/lib/stockPhotos";
import { useViewGate } from "@/lib/viewGateContext";

export function HeroBanner() {
  const { requestFacilityView } = useViewGate();
  const { facilities, loading } = useFacilities();
  // 실사진 없는 실제 공공데이터 시설엔 스톡사진을 못 붙이므로 배너는 데모(mock) 시설만 사용
  const SLIDES = facilities.filter((f) => f.grade === 1 && f.dataSource === "mock").slice(0, 5);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    if (paused || SLIDES.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused]);

  // index가 바뀌면 해당 슬라이드가 가운데로 오도록 트랙을 스크롤한다.
  useEffect(() => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    const target = slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;
    isProgrammaticScroll.current = true;
    track.scrollTo({ left: target, behavior: "smooth" });
    const t = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 500);
    return () => clearTimeout(t);
  }, [index]);

  // 데이터가 오기 전 배너가 잠깐 사라졌다가 나타나면 아래 검색창까지 같이 밀리는
  // 레이아웃 흔들림이 생긴다 — 로딩 중엔 같은 크기의 스켈레톤으로 자리를 미리 잡아둔다.
  if (loading) {
    return (
      <div className="relative mx-auto aspect-[5/4] w-[84%] animate-pulse rounded-3xl bg-ink-100/60 shadow-soft sm:aspect-[21/9] sm:w-[78%]" />
    );
  }

  if (SLIDES.length === 0) return null;

  function handleScroll() {
    const track = trackRef.current;
    if (!track || isProgrammaticScroll.current) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const elCenter = el.offsetLeft + el.clientWidth / 2;
      const dist = Math.abs(elCenter - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    if (closest !== index) setIndex(closest);
  }

  function prev() {
    setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  }
  function next() {
    setIndex((i) => (i + 1) % SLIDES.length);
  }

  return (
    <div
      className="group relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((f, i) => (
          <div
            key={f.id}
            role="button"
            tabIndex={i === index ? 0 : -1}
            onClick={() => (i === index ? requestFacilityView(f.id) : setIndex(i))}
            onKeyDown={(e) => e.key === "Enter" && requestFacilityView(f.id)}
            className={`relative aspect-[5/4] w-[84%] shrink-0 snap-center overflow-hidden rounded-3xl shadow-soft transition-all duration-500 ease-out sm:aspect-[21/9] sm:w-[78%] ${
              i === index ? "scale-100 opacity-100" : "scale-[0.94] cursor-pointer opacity-50"
            }`}
          >
            <img
              src={facilityPhotoFor(f.id, 1200)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/10 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 w-full px-5 pb-12 pt-6 sm:px-8 sm:pb-14">
              <div className="inline-block max-w-full rounded-2xl bg-black/20 px-4 py-3 text-white backdrop-blur-sm sm:px-5 sm:py-4">
                <span className="mb-1.5 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  {FACILITY_TYPE_LABEL[f.facilityType]} · {f.grade}등급
                </span>
                <h3 className="text-lg font-extrabold leading-snug sm:text-2xl">{f.name}</h3>
                <p className="mt-0.5 text-xs text-white/85 sm:text-sm">{f.address}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {SLIDES.length > 1 && (
        <>
          <button
            type="button"
            aria-label="이전 시설"
            onClick={prev}
            className="absolute left-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white opacity-0 backdrop-blur transition-all duration-200 ease-snappy hover:scale-110 hover:bg-white/50 active:scale-95 group-hover:opacity-100 sm:left-3"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="다음 시설"
            onClick={next}
            className="absolute right-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white opacity-0 backdrop-blur transition-all duration-200 ease-snappy hover:scale-110 hover:bg-white/50 active:scale-95 group-hover:opacity-100 sm:right-3"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}번째 시설로 이동`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
