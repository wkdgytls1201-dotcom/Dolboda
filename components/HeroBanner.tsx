"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { FACILITY_TYPE_LABEL, type FacilityType } from "@/lib/types";
import { facilityPhotoFor } from "@/lib/stockPhotos";
import { useViewGate } from "@/lib/viewGateContext";
import { tagFacilityTransition } from "@/lib/navTransition";

export interface HeroSlide {
  id: string;
  name: string;
  address: string;
  facilityType: FacilityType;
  grade: number | null;
  /** 시설 실사진(R2) 첫 장 — 사진 파이프라인이 채운 시설만 있고, 없으면 스톡 폴백 */
  photo?: string | null;
}

// 배너는 광고가 아니라 보호자가 읽고 비교하는 시설 정보라 자동 넘김을 넉넉히 둔다.
const AUTO_MS = 7000;
// 사용자가 배너를 만진 뒤 자동 넘김을 쉬는 시간
const INTERACT_HOLD_MS = 12000;
// 이 이상 움직였으면 탭이 아니라 스와이프로 본다
const TAP_SLOP_PX = 10;

// 슬라이드는 서버(app/page.tsx)에서 실제 1등급 시설로 골라 넘겨준다.
// 예전엔 코드 안의 데모 시설(서울행복요양병원 등)을 썼는데, 실재하지 않는 시설이
// 메인에 뜨는 건 신뢰 문제라 실데이터로 바꿨다. 서버에서 넘어오므로 첫 페인트에 바로 보인다.
//
// 동작 원칙: 스크롤 위치의 주인은 브라우저(CSS scroll snap)다. JS는 ① 현재 카드 감지
// (IntersectionObserver — 스크롤마다 전체 순회하던 예전 방식은 프레임마다 setState를 불렀다)
// ② 버튼·점·자동 넘김이 부르는 goTo() 딱 두 가지만 한다. index를 바꿔서 스크롤을 따라
// 움직이게 하던 구조를 없앴기 때문에, 정렬 애니메이션 중에 손가락을 대면 브라우저가
// 그냥 사용자 입력을 따라간다(끊고 이어받는 코드가 필요 없다).
export function HeroBanner({ slides }: { slides: HeroSlide[] }) {
  const SLIDES = slides;
  const { requestFacilityView } = useViewGate();
  const [index, setIndex] = useState(0);
  // 자동 넘김을 사용자가 직접 끄는 스위치(WCAG 2.2.2 — 호버·포커스 정지와 별개로,
  // "읽는 동안 움직이지 마라"를 명시적으로 선택할 수 있어야 한다)
  const [userPaused, setUserPaused] = useState(false);
  const trackRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 렌더가 필요 없는 상태는 전부 ref — 자동 넘김 타이머가 매 틱 조건만 읽는다.
  const indexRef = useRef(0);
  const userPausedRef = useRef(false);
  const hoverPausedRef = useRef(false);
  const focusPausedRef = useRef(false);
  const bannerVisibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const lastInteractRef = useRef(0);
  const navLockRef = useRef(0);
  const downRef = useRef<{ x: number; y: number } | null>(null);

  function markInteract() {
    lastInteractRef.current = Date.now();
  }

  function goTo(rawIndex: number, behavior?: ScrollBehavior) {
    const track = trackRef.current;
    const n = SLIDES.length;
    if (!track || n === 0) return;
    const i = ((rawIndex % n) + n) % n;
    const slide = track.children[i] as HTMLElement | undefined;
    if (!slide) return;
    const target = slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;
    track.scrollTo({
      left: target,
      behavior: behavior ?? (reducedMotionRef.current ? "auto" : "smooth"),
    });
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // 현재 카드 감지 — 카드가 트랙 안에서 60% 이상 보이면 그 카드가 활성이다.
  // IO가 없는 구형 웹뷰에서만 rAF로 묶은 스크롤 폴백을 쓴다(없으면 점·이미지 마운트가 멈춘다).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const setActive = (i: number) => {
      if (i !== indexRef.current) {
        indexRef.current = i;
        setIndex(i);
      }
    };

    // 1티어: Scroll Snap Event(Chrome 129+) — 스냅 "예정" 카드를 브라우저가 직접 알려줘
    // 임계값 추측(IO 60%)보다 정확하고, 드래그 중에도 갱신된다. 필수 의존 금지(스펙 §1-1)
    // 이라 미지원이면 아래 IO로 자연히 내려간다.
    if ("onscrollsnapchanging" in track) {
      const onSnap = (e: Event) => {
        const target = (e as Event & { snapTargetInline?: HTMLElement | null }).snapTargetInline;
        const i = Number(target?.dataset.index);
        if (!Number.isNaN(i)) setActive(i);
      };
      track.addEventListener("scrollsnapchanging", onSnap);
      return () => track.removeEventListener("scrollsnapchanging", onSnap);
    }

    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
            const i = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(i)) setActive(i);
          }
        },
        { root: track, threshold: 0.6 }
      );
      Array.from(track.children).forEach((el) => io.observe(el));
      return () => io.disconnect();
    }

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const center = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let min = Infinity;
        Array.from(track.children).forEach((child, i) => {
          const el = child as HTMLElement;
          const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - center);
          if (d < min) {
            min = d;
            best = i;
          }
        });
        setActive(best);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("scroll", onScroll);
    };
  }, [SLIDES.length]);

  // 배너가 화면에서 반 이상 사라지면 자동 넘김을 멈춘다(아래로 읽으러 간 사용자 방해 금지).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        bannerVisibleRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      },
      { threshold: [0, 0.5] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 자동 넘김 — 탭 비활성·배너 화면 밖·호버/포커스·최근 상호작용·reduced-motion이면 쉰다.
  // 조건을 전부 ref로 읽어서 타이머를 다시 만들 일도, 틱마다 렌더할 일도 없다.
  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const timer = setInterval(() => {
      if (reducedMotionRef.current) return;
      if (userPausedRef.current) return;
      if (document.hidden) return;
      if (!bannerVisibleRef.current) return;
      if (hoverPausedRef.current || focusPausedRef.current) return;
      if (Date.now() - lastInteractRef.current < INTERACT_HOLD_MS) return;
      goTo(indexRef.current + 1);
    }, AUTO_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SLIDES.length]);

  // 사진은 현재 슬라이드와 양옆 이웃만 마운트한다(자동 넘김 7초면 다음 장 받기에 충분).
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

  function prev() {
    markInteract();
    goTo(indexRef.current - 1);
  }
  function next() {
    markInteract();
    goTo(indexRef.current + 1);
  }

  return (
    <div
      ref={rootRef}
      className="group relative"
      // 모바일 터치는 mouseenter만 발생하고 mouseleave가 안 와서 한 번 터치하면
      // paused가 true로 눌어붙어 자동 넘김이 영영 안 되는 문제가 있었음 —
      // 실제 마우스(hover 가능한 포인터)일 때만 정지시킨다.
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hoverPausedRef.current = true;
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") hoverPausedRef.current = false;
      }}
      onFocus={() => {
        focusPausedRef.current = true;
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          focusPausedRef.current = false;
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        markInteract();
        goTo(indexRef.current + (e.key === "ArrowRight" ? 1 : -1));
      }}
    >
      <ul
        ref={trackRef}
        aria-label="1등급 시설 배너"
        onPointerDown={(e) => {
          markInteract();
          downRef.current = { x: e.clientX, y: e.clientY };
        }}
        onWheel={(e) => {
          // 가로 휠(트랙패드)만 상호작용으로 본다 — 세로 스크롤로 지나가는 것까지 잡으면
          // 페이지를 읽고 돌아온 사용자에게 배너가 계속 멈춰 있다.
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) markInteract();
        }}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((f, i) => (
          <li
            key={f.id}
            data-index={i}
            className={`relative aspect-[5/4] w-[84%] shrink-0 snap-center overflow-hidden rounded-3xl shadow-soft transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none sm:aspect-[21/9] sm:w-[78%] ${
              i === index ? "scale-100 opacity-100" : "scale-[0.97] opacity-85"
            }`}
          >
            {/* 진짜 <a href> — JS가 죽어도, 크롤러도, 새 탭 열기·링크 복사도 전부 동작한다.
                일반 클릭만 preventDefault로 가로채 열람 제한 게이트(ViewGate)를 태운다. */}
            <a
              href={`/facility/${f.id}`}
              aria-current={i === index ? "true" : undefined}
              className="absolute inset-0 block rounded-3xl transition-transform duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/90 active:scale-[0.985]"
              onFocus={() => {
                // 탭 이동으로 옆 카드에 포커스가 가면 그 카드를 가운데로 데려온다
                if (i !== indexRef.current) goTo(i);
              }}
              onClick={(e) => {
                // 수정키 클릭(새 탭 등)은 브라우저 기본 동작에 맡긴다
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                // 스와이프 끝에 카드 위에서 손을 뗀 것이면 이동하지 않는다
                // (detail 0은 키보드 Enter라 거리 검사를 건너뛴다)
                const down = downRef.current;
                if (
                  e.detail > 0 &&
                  down &&
                  Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_SLOP_PX
                ) {
                  return;
                }
                // 옆에 살짝 보이는 카드를 누르면 이동 대신 그 카드를 앞으로 가져온다
                if (i !== indexRef.current) {
                  markInteract();
                  goTo(i);
                  return;
                }
                // 연속 탭으로 상세페이지가 두 번 열리는 것 방지
                if (Date.now() - navLockRef.current < 1000) return;
                navLockRef.current = Date.now();
                // 클릭한 배너 카드의 사진·시설명만 상세로 이어지는 전환 대상으로 표시
                tagFacilityTransition(e.currentTarget);
                requestFacilityView(f.id);
              }}
            >
              {/* 마운트된 장만 즉시 로드(eager). loading="lazy"는 가로 스크롤 캐러셀이라
                  브라우저가 "화면 밖"으로 잘못 판단해서 자동으로 넘어가도 사진이 안 뜨는
                  문제가 있었다 — 어떤 장을 받을지는 위 mountedSlides가 index로 직접 정한다. */}
              {/* 실사진은 R2에 1000px webp 한 장뿐이라 srcset 없이 그대로 쓴다(~50KB).
                  스톡 폴백만 예전처럼 폭별 후보를 준다. */}
              {mountedSlides.current.has(i) ? (
                <img
                  src={f.photo ?? facilityPhotoFor(f.id, 800)}
                  srcSet={
                    f.photo
                      ? undefined
                      : `${facilityPhotoFor(f.id, 480)} 480w, ${facilityPhotoFor(
                          f.id,
                          800
                        )} 800w, ${facilityPhotoFor(f.id, 1200)} 1200w`
                  }
                  sizes={f.photo ? undefined : "(max-width: 640px) 84vw, 78vw"}
                  alt=""
                  loading="eager"
                  fetchPriority={i === 0 ? "high" : "low"}
                  decoding="async"
                  onError={(e) => {
                    // 사진이 죽어도 카드 크기는 그대로 — 배경색+그라데이션+캡션이 대신 남는다
                    e.currentTarget.style.opacity = "0";
                  }}
                  data-vt-hero=""
                  // hero-drift: 스와이프 진행도에 따라 이미지가 ±9px만 따라오는 미세 이동
                  // (globals.css, 스크롤 드리븐 애니메이션 — 메인스레드 0, 미지원이면 정지)
                  className="hero-drift absolute inset-0 h-full w-full bg-ink-100 object-cover"
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
                  <h3
                    data-vt-title=""
                    className="line-clamp-2 text-lg font-extrabold leading-snug sm:text-2xl"
                  >
                    {f.name}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-white/85 sm:text-sm">{f.address}</p>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>

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

          {/* 세그먼트는 작게 보이되 손가락으로 누를 수 있게 버튼 자체는 위아래 여백을 넉넉히 준다.
              활성 표시는 opacity+scaleX만 쓴다 — 예전 width 전환은 프레임마다 레이아웃을 다시 쟀다. */}
          <div className="absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 items-center">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}번째 시설로 이동`}
                aria-current={i === index}
                onClick={() => {
                  markInteract();
                  goTo(i);
                }}
                className="flex h-10 w-6 items-center justify-center"
              >
                <span
                  className={`block h-1 w-4 rounded-full bg-white transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
                    i === index ? "scale-x-100 opacity-100" : "scale-x-[0.6] opacity-40"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* 자동 넘김 정지/재생 — 읽는 속도는 사람마다 달라서, 호버·터치로 잠깐 멈추는 것과
              별개로 아예 꺼둘 수 있어야 한다(§8). 시각적으론 작게, 히트영역은 40px. */}
          <button
            type="button"
            aria-label={userPaused ? "자동 넘김 재생" : "자동 넘김 일시정지"}
            aria-pressed={userPaused}
            onClick={() => {
              userPausedRef.current = !userPaused;
              setUserPaused(!userPaused);
            }}
            className="absolute bottom-0 right-1 z-20 flex h-10 w-10 items-center justify-center text-white/70 transition-colors duration-150 hover:text-white active:scale-90 sm:right-2"
          >
            {userPaused ? (
              <Play size={13} fill="currentColor" />
            ) : (
              <Pause size={13} fill="currentColor" />
            )}
          </button>
        </>
      )}
    </div>
  );
}
