"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// 물리형 바텀시트 — "애니메이션이 재생되는 패널"이 아니라 "얇은 판을 손으로 밀고 당기는" 감각.
//
// 설계 원칙(성능):
//  - 드래그 프레임마다 React 상태를 갱신하지 않는다. 위치(y)는 ref에만 두고
//    rAF 안에서 style.transform / opacity를 직접 쓴다. React가 아는 것은
//    "열림/닫힘"과 "어느 스냅에 있는지"(콘텐츠 스크롤 허용 판단용)뿐이다.
//  - transform·opacity만 움직인다. top/height를 프레임마다 바꾸지 않는다.
//  - 스프링은 임계감쇠에 가깝게(과한 바운스 없음) 튜닝했고, 애니메이션 중에도
//    손을 대면 즉시 중단하고 손가락을 따라간다.
//
// 3단 스냅: 닫힘 / 중간(뷰포트의 60%) / 전체(뷰포트 92%, 상단 safe-area 제외).
// 데스크톱(sm 이상)은 기존 패턴대로 중앙 모달 — 드래그 물리는 모바일 전용이다.
//
// 내부 스크롤 규칙(스펙 그대로):
//  - 중간 상태에서 위로 끌면: 콘텐츠를 스크롤하지 않고 시트가 전체로 확장
//  - 전체 상태: 콘텐츠가 정상 스크롤
//  - 전체 상태 + 스크롤 최상단에서 아래로 당기면: 시트가 내려간다

type SnapState = "mid" | "full";

const SPRING_STIFFNESS = 420;
const SPRING_DAMPING = 40; // 2*sqrt(420) ≈ 41 — 임계감쇠 바로 아래(아주 약한 탄성)
const FLICK_VELOCITY = 0.5; // px/ms — 이보다 빠르면 거리와 무관하게 다음 스냅으로
const SKIP_VELOCITY = 1.6; // 아주 빠른 아래 던지기 → 전체에서 바로 닫힘까지
const DRAG_DEAD_ZONE = 8; // px — 이만큼 움직이기 전엔 탭으로 간주(버튼 클릭 보호)

export function BottomSheet({
  open,
  onDismiss,
  ariaLabel,
  children,
  footer,
  title,
}: {
  open: boolean;
  /** 적용 없이 닫힘(배경 탭·아래로 던짐·ESC·X) — 부모는 임시 상태를 버리면 된다 */
  onDismiss: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  /** 시트 안 하단 고정 영역(적용 버튼) — 콘텐츠 스크롤과 무관하게 항상 보인다 */
  footer?: React.ReactNode;
  title?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false); // 포털 SSR 가드
  const [rendered, setRendered] = useState(false); // 닫힘 애니메이션까지 살아있는 마운트 상태
  const [snap, setSnap] = useState<SnapState>("mid");
  const [isDesktop, setIsDesktop] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ---- 위치·물리 상태 (전부 ref — 리렌더 없음) ----
  const yRef = useRef(0); // 현재 translateY(px). 0=전체, sheetH=화면 밖
  const velRef = useRef(0);
  const rafRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const geomRef = useRef({ sheetH: 0, midY: 0 }); // closedY == sheetH
  const snapRef = useRef<SnapState>("mid");
  const openRef = useRef(open);
  const reducedRef = useRef(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ---- 프레임 적용: 여기 말고는 아무도 transform을 직접 만지지 않는다 ----
  const paint = useCallback(() => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    const { sheetH } = geomRef.current;
    if (!sheet || sheetH === 0) return;
    sheet.style.transform = `translate3d(0, ${yRef.current}px, 0)`;
    if (backdrop) {
      // 딤은 아주 약하게(최대 0.4) — 강한 블러·짙은 오버레이 금지 스펙
      const progress = 1 - yRef.current / sheetH;
      backdrop.style.opacity = String(Math.max(0, Math.min(1, progress)) * 0.8);
    }
  }, []);

  const stopAnimation = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    targetRef.current = null;
  }, []);

  /** 스프링으로 target까지 — 도중에 잡으면(stopAnimation) 그 자리에서 이어받는다 */
  const animateTo = useCallback(
    (target: number, onArrive?: () => void) => {
      stopAnimation();
      targetRef.current = target;
      if (reducedRef.current) {
        // 모션 최소화: 물리 대신 짧은 이동 — 드래그 기능 자체는 그대로 산다
        yRef.current = target;
        velRef.current = 0;
        paint();
        onArrive?.();
        return;
      }
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min((now - last) / 1000, 1 / 30); // 탭 전환 등으로 프레임이 벌어져도 폭주 방지
        last = now;
        const y = yRef.current;
        const dist = target - y;
        const accel = SPRING_STIFFNESS * dist - SPRING_DAMPING * velRef.current;
        velRef.current += accel * dt;
        yRef.current += velRef.current * dt;
        if (Math.abs(target - yRef.current) < 0.5 && Math.abs(velRef.current) < 20) {
          yRef.current = target;
          velRef.current = 0;
          paint();
          targetRef.current = null;
          onArrive?.();
          return;
        }
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [paint, stopAnimation]
  );

  // ---- 뷰포트 크기 → 스냅 좌표. 주소창 출몰·회전·키보드에 흔들리지 않게 visualViewport 우선 ----
  const measure = useCallback(() => {
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const safeTop = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--safe-top") || "0"
    );
    const sheetH = Math.min(vh * 0.92, vh - safeTop - 8);
    const midH = vh * 0.6;
    geomRef.current = { sheetH, midY: Math.max(0, sheetH - midH) };
    const sheet = sheetRef.current;
    if (sheet) sheet.style.height = `${sheetH}px`;
  }, []);

  const snapY = useCallback((s: SnapState | "closed") => {
    const { sheetH, midY } = geomRef.current;
    return s === "full" ? 0 : s === "mid" ? midY : sheetH;
  }, []);

  const settle = useCallback(
    (s: SnapState | "closed") => {
      if (s === "closed") {
        animateTo(snapY("closed"), () => {
          setRendered(false);
          if (openRef.current) onDismiss();
        });
        return;
      }
      snapRef.current = s;
      setSnap(s);
      animateTo(snapY(s));
    },
    [animateTo, onDismiss, snapY]
  );

  // ---- 열림/닫힘 오케스트레이션 ----
  useEffect(() => {
    openRef.current = open;
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      setRendered(true);
    } else if (rendered) {
      // 부모가 닫음(적용 버튼 등) — 현재 위치에서 아래로 흘려보낸다
      settle("closed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!rendered) return;
    measure();
    // 화면 밖에서 시작해 중간까지 — 첫 프레임에 번쩍이지 않게 layout 단계에서 세팅
    yRef.current = snapY("closed");
    velRef.current = 0;
    snapRef.current = "mid";
    setSnap("mid");
    paint();
    if (isDesktop) {
      // 데스크톱은 물리 없이 그냥 자리로
      yRef.current = 0;
      paint();
    } else {
      animateTo(snapY("mid"));
    }
    const onResize = () => {
      const wasClosed = targetRef.current === null && yRef.current >= geomRef.current.sheetH - 1;
      measure();
      if (!wasClosed && targetRef.current === null) {
        yRef.current = snapY(snapRef.current);
        paint();
      }
    };
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onResize);
      stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, isDesktop]);

  // 배경 스크롤 잠금 — body를 fixed로 고정해야 iOS에서도 확실히 막힌다(기존 FilterBar 패턴 이관)
  useEffect(() => {
    if (!rendered) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [rendered]);

  // 포커스: 열리면 시트 안으로, 닫히면 원래 버튼으로. Tab은 시트 안에서 순환.
  useEffect(() => {
    if (!rendered) return;
    const sheet = sheetRef.current;
    sheet?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        settle("closed");
        return;
      }
      if (e.key !== "Tab" || !sheet) return;
      const focusables = sheet.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [rendered, settle]);

  // ---- 드래그 ----
  // 샘플 몇 개로 놓는 순간의 실제 속도를 잰다(마지막 100ms 창)
  const samplesRef = useRef<{ t: number; y: number }[]>([]);
  const dragRef = useRef<{
    startPointerY: number;
    startSheetY: number;
    active: boolean; // 데드존을 넘어 실제로 시트를 잡았는지
    fromContent: boolean;
    decided: boolean; // 콘텐츠 제스처의 소유권(스크롤 vs 시트)을 정했는지
  } | null>(null);

  const rubberband = (y: number) => {
    // 전체(0)보다 위로 끌면 약한 저항 — 이동량의 15%만 따라온다
    if (y < 0) return y * 0.15;
    return y;
  };

  const beginDrag = useCallback(
    (pointerY: number, fromContent: boolean) => {
      stopAnimation();
      samplesRef.current = [{ t: performance.now(), y: pointerY }];
      dragRef.current = {
        startPointerY: pointerY,
        startSheetY: yRef.current,
        active: !fromContent, // 핸들에서 시작하면 데드존 없이 바로 잡는다
        fromContent,
        decided: !fromContent,
      };
    },
    [stopAnimation]
  );

  const moveDrag = useCallback(
    (pointerY: number): boolean => {
      const d = dragRef.current;
      if (!d) return false;
      const delta = pointerY - d.startPointerY;

      if (!d.active) {
        if (Math.abs(delta) < DRAG_DEAD_ZONE) return false;
        d.active = true;
        // 데드존을 지나고 나서부터의 이동만 반영해 "탁 튀는" 시작을 없앤다
        d.startPointerY = pointerY;
        d.startSheetY = yRef.current;
        return true;
      }

      const now = performance.now();
      samplesRef.current.push({ t: now, y: pointerY });
      while (samplesRef.current.length > 2 && now - samplesRef.current[0].t > 100) {
        samplesRef.current.shift();
      }

      yRef.current = rubberband(d.startSheetY + (pointerY - d.startPointerY));
      paint();
      return true;
    },
    [paint]
  );

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d?.active) return;

    const s = samplesRef.current;
    let v = 0; // px/ms, 아래가 +
    if (s.length >= 2) {
      const first = s[0];
      const lastS = s[s.length - 1];
      if (lastS.t > first.t) v = (lastS.y - first.y) / (lastS.t - first.t);
    }

    const { midY } = geomRef.current;
    const y = yRef.current;

    if (v <= -FLICK_VELOCITY) {
      settle("full"); // 위로 던짐 — 어디서든 전체로
      return;
    }
    if (v >= FLICK_VELOCITY) {
      // 아래로 던짐: 전체→중간, 중간→닫힘. 아주 빠르면 전체→닫힘까지
      if (y < midY) settle(v >= SKIP_VELOCITY ? "closed" : "mid");
      else settle("closed");
      return;
    }
    // 천천히 놓음 — 가장 가까운 스냅
    const { sheetH } = geomRef.current;
    const candidates: { s: SnapState | "closed"; at: number }[] = [
      { s: "full", at: 0 },
      { s: "mid", at: midY },
      { s: "closed", at: sheetH },
    ];
    candidates.sort((a, b) => Math.abs(y - a.at) - Math.abs(y - b.at));
    settle(candidates[0].s);
  }, [settle]);

  // 핸들·헤더: 포인터 이벤트(마우스·터치·펜 통합) — 여긴 항상 시트 드래그
  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isDesktop) return;
      try {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      } catch {
        // 일부 브라우저·합성 이벤트에서 캡처가 거부될 수 있다 — 캡처 없이도 드래그는 된다
      }
      beginDrag(e.clientY, false);
    },
    [beginDrag, isDesktop]
  );
  const onHandlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) moveDrag(e.clientY);
    },
    [moveDrag]
  );
  const onHandlePointerUp = useCallback(() => endDrag(), [endDrag]);

  // 콘텐츠: 터치 전용(비-passive) — 스크롤과 시트 드래그의 소유권을 첫 움직임에서 정한다
  useEffect(() => {
    if (!rendered || isDesktop) return;
    const content = contentRef.current;
    if (!content) return;

    const onTouchStart = (e: TouchEvent) => {
      beginDrag(e.touches[0].clientY, true);
    };
    const onTouchMove = (e: TouchEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const pointerY = e.touches[0].clientY;

      if (!d.decided) {
        const delta = pointerY - d.startPointerY;
        if (Math.abs(delta) < DRAG_DEAD_ZONE) return;
        const goingDown = delta > 0;
        const atFull = snapRef.current === "full";
        const atTop = content.scrollTop <= 0;
        // 전체 상태에서 (최상단에서 아래로 당기는 경우만) 시트를 잡는다.
        // 그 외 전체 상태 제스처는 콘텐츠 네이티브 스크롤에 양보.
        // 전체가 아니면(중간) 어느 방향이든 시트를 잡는다 — "중간에서 위로 = 확장" 스펙.
        const takeSheet = atFull ? goingDown && atTop : true;
        d.decided = true;
        if (!takeSheet) {
          dragRef.current = null; // 이 제스처는 스크롤 소유 — 시트는 손 뗌
          return;
        }
        d.active = true;
        d.startPointerY = pointerY;
        d.startSheetY = yRef.current;
      }

      if (d.active) {
        e.preventDefault(); // 시트가 소유한 제스처 — 네이티브 스크롤 차단
        moveDrag(pointerY);
      }
    };
    const onTouchEnd = () => endDrag();

    content.addEventListener("touchstart", onTouchStart, { passive: true });
    content.addEventListener("touchmove", onTouchMove, { passive: false });
    content.addEventListener("touchend", onTouchEnd, { passive: true });
    content.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      content.removeEventListener("touchstart", onTouchStart);
      content.removeEventListener("touchmove", onTouchMove);
      content.removeEventListener("touchend", onTouchEnd);
      content.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [rendered, isDesktop, beginDrag, moveDrag, endDrag]);

  if (!mounted || !rendered) return null;

  const fullOpen = snap === "full";

  return createPortal(
    <div
      className={`fixed inset-0 z-50${isDesktop ? " flex items-center justify-center" : ""}`}
      role="presentation"
    >
      {/* 딤 — opacity는 paint()가 시트 위치에 비례해 직접 구동. 블러 없음(성능 스펙) */}
      <div
        ref={backdropRef}
        onClick={() => settle("closed")}
        className="absolute inset-0 bg-ink-900/50"
        style={{ opacity: 0 }}
        aria-hidden
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={
          isDesktop
            ? // 중앙정렬을 transform(-translate-x/y-1/2)으로 하면 안 된다: slide-up 키프레임의
              // 최종 transform(fill-mode both)과 paint()의 인라인 transform이 둘 다 이 값을
              // 덮어써서 시트가 화면 정중앙이 아니라 "중앙점에서 오른쪽·아래로" 놓이고,
              // 아래쪽(적용 버튼)이 화면 밖으로 잘린다. 부모 flex 중앙정렬이면 transform이
              // 무엇이든 자리가 흔들리지 않는다.
              "animate-slide-up relative flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-card-hover outline-none"
            : "absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl bg-white shadow-[0_-2px_16px_rgba(27,23,48,0.10)] outline-none will-change-transform"
        }
        style={isDesktop ? undefined : { transform: "translate3d(0, 100vh, 0)" }}
      >
        {/* 드래그 핸들 + 헤더 — 이 영역은 언제나 시트를 잡는다 */}
        <div
          className={isDesktop ? "" : "cursor-grab touch-none select-none active:cursor-grabbing"}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          {!isDesktop && (
            <div className="flex justify-center pb-1 pt-2.5" aria-hidden>
              <div className="h-1 w-9 rounded-full bg-ink-200" />
            </div>
          )}
          {title}
        </div>

        <div
          ref={contentRef}
          className={`min-h-0 flex-1 overscroll-contain px-5 ${
            isDesktop || fullOpen ? "overflow-y-auto" : "overflow-hidden"
          }`}
          style={isDesktop ? { touchAction: "pan-y" } : undefined}
        >
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-ink-100 bg-white pb-[env(safe-area-inset-bottom)]">
            {footer}
          </div>
        )}
      </div>

      {/* 중간 스냅에서는 화면 하단 모서리가 콘텐츠를 자르는 경계다 — 거기에 페이드를 얹어
          "아래 더 있음"을 말없이 보여준다(사용자 피드백: 시설유형·거리 아래에 뭐가 더
          있는지 몰라서 내려야 하는지 알 수 없었다). 전체로 펼치면 콘텐츠가 실제로
          스크롤되므로 페이드를 걷는다. 시트가 inset-x-0이라 이 띠 아래는 전부 시트 흰
          배경 — 흰 그라데이션이 자연스럽게 섞인다. */}
      {!isDesktop && (
        <div
          aria-hidden
          className={`pointer-events-none fixed inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/70 to-transparent transition-opacity duration-200 ${
            snap === "mid" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>,
    document.body
  );
}
