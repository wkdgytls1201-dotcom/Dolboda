"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DEMO_FACILITIES } from "@/lib/mockData";
import { FACILITY_TYPE_LABEL } from "@/lib/types";
import { facilityPhotoFor } from "@/lib/stockPhotos";
import { useViewGate } from "@/lib/viewGateContext";

// 배너에 쓰는 데모 시설은 코드 안에 있는 고정 데이터라 서버를 기다릴 필요가 없다.
// 예전엔 시설 200건을 통째로 받아온 뒤 그중 7개를 골라서, 새로고침하면 배너가
// 한참 뒤에야 떴다. 모듈 로드 시점에 한 번만 계산해서 첫 페인트에 바로 보이게 한다.
const SLIDES = DEMO_FACILITIES.filter((f) => f.grade === 1 || f.grade === 2).slice(0, 7);

export function HeroBanner() {
  const { requestFacilityView } = useViewGate();
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
      // 모바일 터치는 mouseenter만 발생하고 mouseleave가 안 와서 한 번 터치하면
      // paused가 true로 눌어붙어 자동 넘김이 영영 안 되는 문제가 있었음 —
      // 실제 마우스(hover 가능한 포인터)일 때만 정지시킨다.
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
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
            {/* 첫 장만 즉시 받고 나머지는 지연 로드. 화면 폭에 맞는 크기를 고르게 해서
                모바일에서 1200px 원본을 통째로 받지 않도록 한다. */}
            <img
              src={facilityPhotoFor(f.id, 800)}
              srcSet={`${facilityPhotoFor(f.id, 480)} 480w, ${facilityPhotoFor(
                f.id,
                800
              )} 800w, ${facilityPhotoFor(f.id, 1200)} 1200w`}
              sizes="(max-width: 640px) 84vw, 78vw"
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              decoding="async"
              className="absolute inset-0 h-full w-full bg-ink-100 object-cover"
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
