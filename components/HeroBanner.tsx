"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FACILITY_TYPE_LABEL, type FacilityType } from "@/lib/types";
import { facilityPhotoFor } from "@/lib/stockPhotos";
import { useViewGate } from "@/lib/viewGateContext";

export interface HeroSlide {
  id: string;
  name: string;
  address: string;
  facilityType: FacilityType;
  grade: number | null;
}

// 슬라이드는 서버(app/page.tsx)에서 실제 1등급 시설로 골라 넘겨준다.
// 예전엔 코드 안의 데모 시설(서울행복요양병원 등)을 썼는데, 실재하지 않는 시설이
// 메인에 뜨는 건 신뢰 문제라 실데이터로 바꿨다. 서버에서 넘어오므로 첫 페인트에 바로 보인다.
export function HeroBanner({ slides }: { slides: HeroSlide[] }) {
  const SLIDES = slides;
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

  // 사진은 현재 슬라이드와 양옆 이웃만 마운트한다(자동 넘김 5초면 다음 장 받기에 충분).
  // 예전엔 7장 전부 eager였는데, DPR 3 폰은 84vw에 맞춰 1200w를 골라 첫 화면에서
  // 800KB 가까이 내려받았다. loading="lazy"는 가로 캐러셀에서 브라우저가 "화면 밖"으로
  // 오판해 안 뜨는 문제가 있었으므로(아래 주석), 추측에 맡기지 않고 index 상태로 직접 정한다.
  // 한 번 마운트한 장은 Set에 남겨 되돌아와도 다시 받지 않는다.
  const mountedSlides = useRef<Set<number>>(new Set());
  {
    const n = SLIDES.length;
    if (n > 0) {
      mountedSlides.current.add(index);
      mountedSlides.current.add((index + 1) % n);
      mountedSlides.current.add((index - 1 + n) % n);
    }
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
            {/* 마운트된 장만 즉시 로드(eager). loading="lazy"는 가로 스크롤 캐러셀이라
                브라우저가 "화면 밖"으로 잘못 판단해서 자동으로 넘어가도 사진이 안 뜨는
                문제가 있었다 — 어떤 장을 받을지는 위 mountedSlides가 index로 직접 정한다. */}
            {mountedSlides.current.has(i) ? (
              <img
                src={facilityPhotoFor(f.id, 800)}
                srcSet={`${facilityPhotoFor(f.id, 480)} 480w, ${facilityPhotoFor(
                  f.id,
                  800
                )} 800w, ${facilityPhotoFor(f.id, 1200)} 1200w`}
                sizes="(max-width: 640px) 84vw, 78vw"
                alt=""
                loading="eager"
                fetchPriority={i === 0 ? "high" : "low"}
                decoding="async"
                className="absolute inset-0 h-full w-full bg-ink-100 object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-ink-100" aria-hidden />
            )}
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
            className="absolute left-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white opacity-0 backdrop-blur transition-all duration-200 ease-snappy hover:scale-110 hover:bg-white/50 active:scale-95 group-hover:opacity-100 sm:left-3"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="다음 시설"
            onClick={next}
            className="absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white opacity-0 backdrop-blur transition-all duration-200 ease-snappy hover:scale-110 hover:bg-white/50 active:scale-95 group-hover:opacity-100 sm:right-3"
          >
            <ChevronRight size={20} />
          </button>

          {/* 점은 작게 보이되 손가락으로 누를 수 있게 버튼 자체는 위아래 여백을 넉넉히 준다 */}
          <div className="absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}번째 시설로 이동`}
                onClick={() => setIndex(i)}
                className="flex h-10 w-6 items-center justify-center"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
