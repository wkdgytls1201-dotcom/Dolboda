"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AuthModal } from "./AuthModal";
import {
  ChevronLeft,
  ChevronDown,
  Check,
  Sparkles,
  ClipboardList,
  Lock,
  RotateCcw,
  ArrowRight,
  ExternalLink,
  HeartHandshake,
  Info,
} from "lucide-react";
import {
  TEST_AREAS,
  TOTAL_ITEMS,
  APPLY_STEPS,
  PROGRAM_FACTS,
  optionsFor,
  calculateResult,
  type Answers,
} from "@/lib/gradeTest";

type Phase = "intro" | "test" | "result";

// hero: 결과 카드 배경(등급대별 색). 결과 화면에서 가장 먼저 눈이 가야 하는 자리라
// 다른 섹션(흰 카드)과 확실히 구분되게 색을 채운다.
const TONE_STYLES: Record<
  string,
  { chip: string; ring: string; bar: string; hero: string }
> = {
  high: {
    chip: "bg-primary-50 text-primary-700",
    ring: "text-primary-500",
    bar: "bg-primary-500",
    hero: "bg-gradient-to-br from-primary-500 via-primary-500 to-peach-500 shadow-royal",
  },
  mid: {
    chip: "bg-royal-50 text-royal-700",
    ring: "text-royal-500",
    bar: "bg-royal-500",
    hero: "bg-gradient-to-br from-royal-600 via-royal-500 to-royal-400 shadow-royal",
  },
  low: {
    chip: "bg-mint-100 text-mint-700",
    ring: "text-mint-600",
    bar: "bg-mint-500",
    hero: "bg-gradient-to-br from-mint-600 via-mint-500 to-mint-400 shadow-soft",
  },
  none: {
    chip: "bg-ink-100 text-ink-500",
    ring: "text-ink-300",
    bar: "bg-ink-300",
    hero: "bg-gradient-to-br from-ink-500 via-ink-400 to-ink-300 shadow-soft",
  },
};

// useLayoutEffect는 서버 렌더에서 호출하면 React가 경고를 낸다(서버에는 화면이 없으니
// 당연하다). 서버에서는 아무 일도 안 하는 useEffect로 바꿔치기해 경고만 피한다 —
// 실제 동작(그리기 전에 복원)은 브라우저에서만 필요하다.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// 카카오 로그인은 페이지를 완전히 떠났다가 돌아오기 때문에, 답변을 세션에 저장해두지
// 않으면 로그인하고 온 사이에 52문항이 전부 날아간다.
const SAVE_KEY = "dolboda-grade-test";

interface SavedState {
  phase: Phase;
  areaIndex: number;
  answers: Answers;
}

function readSaved(): SavedState | null {
  try {
    const raw = sessionStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    return parsed?.answers ? parsed : null;
  } catch {
    return null;
  }
}

export function GradeTest() {
  const { status } = useSession();
  const [showAuth, setShowAuth] = useState(false);

  // 첫 렌더는 서버와 똑같은 값(인트로)으로 시작한다.
  //
  // 예전엔 렌더 도중에 sessionStorage를 읽어 초기값을 정했는데, 서버에는
  // sessionStorage가 없어서 서버는 "인트로", 클라이언트는 "결과"를 그렸다.
  // 그 차이 때문에 하이드레이션이 깨지고 React가 화면을 통째로 다시 그렸다
  // — 로그인하고 돌아오는 흐름(이 화면의 주 사용 경로)에서 매번 일어났다.
  // 검색 페이지(app/search/SearchPageClient.tsx)가 같은 문제를 먼저 겪고
  // 같은 방식으로 고쳐둔 전례가 있다.
  const [phase, setPhase] = useState<Phase>("intro");
  const [areaIndex, setAreaIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  // 복원이 끝나기 전에는 아래 "진행 상황 저장" effect가 돌지 않게 막는다
  // (인트로 초기값으로 저장분을 덮어써 버리면 답변 52개가 날아간다).
  const [restored, setRestored] = useState(false);

  // 저장분 복원은 화면이 그려지기 **전에** 끝내야 한다. useEffect(그리고 난 뒤 실행)로
  // 하면 결과 화면으로 돌아온 사람에게 인트로가 한 번 번쩍인다. useLayoutEffect는
  // 브라우저가 그리기 직전에 실행돼 그 깜빡임이 없다. 서버에서는 실행되지 않으므로
  // 위 초기값(인트로)이 그대로 서버 HTML이 되고, 하이드레이션도 어긋나지 않는다.
  useIsomorphicLayoutEffect(() => {
    const saved = readSaved();
    if (saved) {
      setPhase(saved.phase);
      setAreaIndex(saved.areaIndex);
      setAnswers(saved.answers);
    }
    setRestored(true);
    // 최초 1회만 — 이후 사용자의 진행을 되돌리면 안 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 하단 탭바는 등급테스트 전 단계에서 경로 기반으로 숨긴다(MobileTabBar의
  // HIDDEN_PREFIXES — 2026-08-05 사용자 지시). 14차의 "진행 중만 숨기고 바닥에서
  // 등장+CTA 승강" 상태 신호 로직은 이 결정으로 제거됐다.

  // 인트로에서 5개 영역 중 3개쯤에서 화면이 잘리면 아래에 더 있는지 모른다 —
  // 스크롤 전까지만 "아래에 더 있어요" 힌트를 띄우고, 내리기 시작하면 치운다.
  const [showScrollHint, setShowScrollHint] = useState(true);
  useEffect(() => {
    const onScroll = () => setShowScrollHint(window.scrollY < 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 단계가 바뀌면 항상 맨 위에서 시작한다.
  // - 클릭 핸들러 안에서 스크롤하면 아직 이전 화면 기준이라 위치가 어긋난다 →
  //   화면이 그려진 뒤(useEffect)에 옮긴다.
  // - behavior를 생략하거나 "auto"로 두면 전역 CSS의 scroll-behavior:smooth가 적용돼
  //   애니메이션 도중 내용이 바뀌면서 중간에 멈춘다 → "instant"로 강제한다.
  // - 브라우저의 스크롤 앵커링이 화면 높이가 바뀐 뒤 위치를 되돌려놓기 때문에,
  //   다음 프레임에 한 번 더 맞춘다.
  useEffect(() => {
    const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    toTop();
    const raf = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(raf);
  }, [phase, areaIndex]);

  // 진행 상황을 계속 저장해둔다 (로그인 왕복 후 복원용).
  // 복원이 끝나기 전에는 저장하지 않는다 — 그러지 않으면 첫 렌더의 초기값(인트로·답변
  // 없음)이 저장분을 덮어써, 로그인하고 돌아온 사람의 답변 52개가 날아간다.
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({ phase, areaIndex, answers }));
    } catch {
      // 저장이 막혀 있어도 테스트 자체는 계속 진행된다
    }
  }, [restored, phase, areaIndex, answers]);

  const area = TEST_AREAS[areaIndex];
  const answeredCount = Object.keys(answers).length;
  const areaAnswered = area?.items.filter((i) => answers[i.id] !== undefined).length ?? 0;
  const areaComplete = area ? areaAnswered === area.items.length : false;

  const result = useMemo(
    () => (phase === "result" ? calculateResult(answers) : null),
    [phase, answers]
  );

  function pick(itemId: string, score: number) {
    setAnswers((prev) => ({ ...prev, [itemId]: score }));
    // 답을 고르면 다음 미답변 문항으로 부드럽게 이동 — 52문항을 손으로 일일이
    // 내리지 않아도 흐름이 이어진다. 방금 고른 답이 반영된 상태 기준으로 찾는다.
    const idx = area.items.findIndex((it) => it.id === itemId);
    const next = area.items.find(
      (it, i) => i > idx && it.id !== itemId && answers[it.id] === undefined
    );
    if (next) {
      // setState 직후라 DOM은 아직 그대로지만, 문항 요소 자체는 이미 존재하므로
      // 살짝 뒤에 스크롤하면 선택 표시가 그려진 뒤 자연스럽게 이동한다.
      // (rAF는 화면이 백그라운드면 실행이 밀린다 — setTimeout이 어느 상황에서든 돈다)
      setTimeout(() => {
        document
          .getElementById(`grade-q-${next.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }

  function start() {
    setPhase("test");
    setAreaIndex(0);
  }

  function next() {
    if (areaIndex < TEST_AREAS.length - 1) setAreaIndex((i) => i + 1);
    else setPhase("result");
  }

  function back() {
    if (areaIndex > 0) setAreaIndex((i) => i - 1);
    else setPhase("intro");
  }

  function restart() {
    setAnswers({});
    setAreaIndex(0);
    setPhase("intro");
    try {
      sessionStorage.removeItem(SAVE_KEY);
    } catch {
      /* 무시 */
    }
  }

  /* ---------------------------------- 소개 ---------------------------------- */
  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        {/* 1분 AI 도우미 배너 — 테스트를 시작하기 전에만 보여준다.
            52문항을 이미 진행/완료한 사람에게 "1분 컷"을 계속 노출하면 헷갈린다 */}
        <a
          href="/grade-helper"
          className="group relative mb-6 flex min-h-[64px] items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-royal-600 via-royal-500 to-primary-500 px-4 py-3.5 shadow-royal transition-all hover:-translate-y-0.5 hover:shadow-royal-hover"
        >
          <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" />
          <span className="absolute -bottom-8 right-10 h-16 w-16 rounded-full bg-white/10" />

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Sparkles size={18} className="text-white" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
              AI 도우미로 1분만에
              <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-extrabold">
                NEW
              </span>
            </span>
            <span className="mt-0.5 block text-[11px] text-white/80">
              버튼 13번만 눌러도 예상 등급이 나와요
            </span>
          </span>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-royal-600 transition-transform group-hover:translate-x-0.5">
            <ArrowRight size={16} />
          </span>
        </a>

        <div className="mb-8 text-center">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5 text-xs font-bold text-primary-700">
            <Sparkles size={13} />
            3분이면 충분해요
          </span>
          <h1 className="mb-3 text-[26px] font-bold leading-tight text-ink-900">
            우리 어머니, 아버지
            <br />
            장기요양등급 받으실 수 있을까요?
          </h1>
          <p className="text-sm leading-relaxed text-ink-500">
            공단 방문조사에서 실제로 확인하는 <strong className="text-ink-700">{TOTAL_ITEMS}가지</strong>를
            그대로 여쭤볼게요. 답만 고르시면 예상 등급과 이용하실 수 있는 서비스를 정리해드려요.
          </p>
        </div>

        <div className="mb-6 space-y-2.5">
          {TEST_AREAS.map((a, i) => (
            <div
              key={a.key}
              className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">{a.title}</span>
                {/* truncate로 한 줄 자르면 375px에서 설명이 "일상생활 동작을 혼…"처럼
                    잘려 무슨 내용인지 알 수 없다 — 줄바꿈을 허용해 끝까지 보여준다 */}
                <span className="block text-xs leading-relaxed text-ink-400">{a.subtitle}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-ink-300">{a.items.length}개</span>
            </div>
          ))}
        </div>

        <div className="mb-8 flex gap-2.5 rounded-2xl bg-ink-100/40 p-4">
          <Info size={16} className="mt-0.5 shrink-0 text-ink-300" />
          <p className="text-xs leading-relaxed text-ink-500">
            실제 등급은 공단 직원의 방문조사와 의사소견서를 바탕으로
            등급판정위원회가 결정해요. 이 테스트는 미리 가늠해보는 참고용이라 결과가 다를 수 있어요.
          </p>
        </div>

        <button
          type="button"
          onClick={start}
          className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 text-base font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99]"
        >
          <ClipboardList size={18} />
          테스트 시작하기
        </button>

        {/* 화면이 영역 카드 중간에서 잘렸을 때 아래에 더 있다는 걸 알려주는 힌트 —
            스크롤을 시작하면 바로 사라진다 */}
        {showScrollHint && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 sm:hidden">
            <div className="h-16 bg-gradient-to-t from-ivory-50 to-transparent" />
            <div className="flex justify-center bg-ivory-50 pb-4">
              <span className="flex animate-bounce items-center gap-1 rounded-full bg-ink-900/85 px-3.5 py-2 text-xs font-semibold text-white shadow-card backdrop-blur">
                아래에 더 있어요
                <ChevronDown size={14} />
              </span>
            </div>
          </div>
        )}
      </main>
    );
  }

  /* ---------------------------------- 결과 ---------------------------------- */
  if (phase === "result" && result) {
    const tone = TONE_STYLES[result.band.tone];
    // 로그인 전에는 예상 등급을 가려두고, 로그인하면 그대로 펼쳐 보여준다.
    const locked = status !== "authenticated";
    return (
      <main className="mx-auto max-w-lg px-4 pb-24 pt-8">
        <div className="relative mb-6">
          <div
            className={
              locked ? "pointer-events-none select-none blur-[7px] saturate-50" : undefined
            }
            aria-hidden={locked}
          >
        {/* 결과 카드 — 52문항을 끝내고 처음 만나는 화면이라 여기가 가장 눈에 띄어야 한다.
            예전엔 흰 카드에 검은 글씨라 아래 섹션들과 구분이 안 돼 밋밋했다.
            등급대별 색을 채우고, 등급 문구는 등장할 때 한 번 pop으로 튀어나온다
            (계속 움직이지 않고 딱 한 번 — 40~60대 사용자에게 반복 움직임은 산만하다).
            눈금은 왼쪽에서 차오르며 "채점됐다"는 느낌을 준다. */}
        <div
          className={`animate-fade-up relative mb-6 overflow-hidden rounded-3xl p-7 text-center sm:p-8 ${tone.hero}`}
        >
          {/* 장식 원 — 저장하기 배너와 같은 문법으로 맞춘다 */}
          <span aria-hidden className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/10" />
          <span aria-hidden className="absolute -bottom-14 -left-8 h-28 w-28 rounded-full bg-white/[0.08]" />

          <div className="relative">
            <p className="mb-2 text-xs font-bold text-white/70">예상 결과</p>
            <h1 className="animate-pop mb-2 text-3xl font-extrabold leading-snug text-white sm:text-[2rem]">
              {result.band.label}
            </h1>
            <p className="mb-5 text-sm leading-relaxed text-white/85">{result.band.summary}</p>

            <div className="mb-3 flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="h-2 flex-1 overflow-hidden rounded-full bg-white/25">
                  {/* 채워지는 칸만 안쪽 막대가 왼쪽에서 100%로 자란다 — 순서대로 조금씩
                      늦게 시작해 눈금이 차례로 차오르는 것처럼 보인다 */}
                  {result.score >= n * 20 - 10 && (
                    <span
                      className="block h-full origin-left rounded-full bg-white"
                      style={{ animation: `grade-fill 0.5s cubic-bezier(.32,.72,0,1) ${n * 90}ms both` }}
                    />
                  )}
                </span>
              ))}
            </div>
            <p className="text-xs text-white/70">도움 필요도 {result.score}점 / 100점 기준</p>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-3 text-sm font-bold text-ink-900">영역별로 살펴보면</h2>
          <div className="space-y-3">
            {result.areaScores.map((a) => (
              <div key={a.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-700">{a.title}</span>
                  <span className="text-ink-300">{a.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
                    style={{ width: `${a.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-ink-100/40 p-3 text-xs leading-relaxed text-ink-500">
            특히 <strong className="text-ink-700">{result.topNeeds[0].title}</strong>
            {result.topNeeds[1].percent > 0 && (
              <>
                {" "}과 <strong className="text-ink-700">{result.topNeeds[1].title}</strong>
              </>
            )}{" "}
            쪽에서 도움이 많이 필요한 것으로 보여요.
          </p>
        </section>

        {/* 결과를 보호자 프로필에 저장 — 결과 화면에서 가장 눈에 띄어야 하는 다음 행동.
            저장해두면 시설 찾기·돌봄 요청에서 재사용되고, 나중에 재판정 시기 안내의 기준이 된다.
            반짝이는 띠(shimmer)는 3회만 지나가고 멈춘다 — 시선은 끌되 계속 산만하지 않게. */}
        {!locked && (
          <Link
            href={`/mypage/care-profile?estimate=${encodeURIComponent(result.band.id)}`}
            // animate-bob-slow: 4px·3초 주기로 아주 천천히 오르내린다. 결과 화면에서
            // 다음 행동이 이 버튼이라는 걸 계속 상기시키되, 진폭이 작아 산만하지 않다
            // (움직임 줄이기 설정이면 globals.css에서 멈춘다). 마우스를 올리면 hover의
            // -translate-y와 겹쳐 어긋나 보이므로 그때는 멈춘다.
            className="group animate-bob-slow relative mb-6 block overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-500 to-peach-500 p-5 shadow-royal transition-all duration-200 ease-snappy hover:animate-none hover:-translate-y-0.5 hover:shadow-royal-hover active:translate-y-0 active:scale-[0.99]"
          >
            {/* 장식 원 — 배너 톤과 맞춘 일러스트풍 배경 */}
            <span aria-hidden className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
            <span aria-hidden className="absolute -bottom-12 right-14 h-24 w-24 rounded-full bg-white/10" />
            <span aria-hidden className="absolute -left-6 -bottom-8 h-20 w-20 rounded-full bg-white/[0.07]" />
            {/* 반짝이는 띠 */}
            <span
              aria-hidden
              className="animate-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
            <span className="relative flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur">
                <HeartHandshake size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-base font-extrabold leading-snug text-white">
                  이 결과를 저장하기
                  <Sparkles size={15} className="shrink-0" />
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-white/85">
                  저장해두면 시설마다 우리 어르신 기준 체크포인트를 보여드리고,
                  돌봄 요청서도 자동으로 채워져요
                </span>
              </span>
              <span className="animate-nudge-x flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary-600 transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight size={17} />
              </span>
            </span>
          </Link>
        )}

        <section className="mb-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-2 text-sm font-bold text-ink-900">이런 서비스를 주로 이용해요</h2>
          <p className="mb-3 text-xs leading-relaxed text-ink-500">{result.band.detail}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {result.band.services.map((s) => (
              <span key={s} className={`rounded-full px-3 py-1.5 text-xs font-bold ${tone.chip}`}>
                {s}
              </span>
            ))}
            {/* 돌보다 매니저는 등급과 무관하게 항상 보여준다 — 공단 급여 서비스는 등급별로
                갈리지만, 집에서 곁을 지켜줄 사람이 필요한 상황은 어느 등급에서나 생긴다.
                다른 서비스와 같은 칩 모양으로 둔다(누르는 것이 아니라 "이런 선택지도 있다"는 안내). */}
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${tone.chip}`}>
              돌보다 매니저
            </span>
          </div>
          {/* 칩 모양이 공단 급여 서비스와 같아져서, 돌보다 매니저도 공단 급여로 오해할 수 있다.
              무엇이 다른지 한 줄로 짚어둔다(공단 급여 여부는 비용이 갈리는 문제라 중요하다). */}
          <p className="mt-2.5 text-[11px] leading-relaxed text-ink-400">
            돌보다 매니저는 공단 급여가 아니라, 돌보다에서 보호자와 매니저를
            연결해드리는 서비스예요. 등급과 상관없이 이용하실 수 있어요.
          </p>
        </section>
          </div>

          {locked && (
            <div className="absolute inset-0 flex items-center justify-center px-2">
              <div className="w-full max-w-[320px] rounded-3xl border border-ink-100 bg-white/95 p-6 text-center shadow-card-hover backdrop-blur-sm">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <Lock size={20} />
                </span>
                <h2 className="mb-1.5 text-base font-bold text-ink-900">
                  답변 {TOTAL_ITEMS}개를 모두 마쳤어요
                </h2>
                <p className="mb-5 text-xs leading-relaxed text-ink-500">
                  로그인하시면 예상 등급과 영역별 분석 결과를 바로 확인하실 수 있어요.
                  지금까지 고르신 답변은 그대로 남아 있어요.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="flex min-h-[50px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
                >
                  로그인하고 결과 보기
                  <ArrowRight size={16} />
                </button>
                <p className="mt-3 text-[11px] text-ink-300">카카오로 3초면 가입돼요</p>
              </div>
            </div>
          )}
        </div>

        <section className="mb-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-3 text-sm font-bold text-ink-900">신청은 이렇게 진행돼요</h2>
          <ol className="space-y-3">
            {APPLY_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-600">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink-900">{step.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                    {step.desc}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <a
            href="https://www.longtermcare.or.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex min-h-[56px] items-center gap-3 rounded-xl border border-ink-100 px-4 py-3 transition-colors duration-150 hover:bg-ink-100/60"
          >
            <ExternalLink size={16} className="shrink-0 text-ink-300" />
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-bold text-ink-900">공식 홈페이지에서 신청</span>
              <span className="block text-xs text-ink-300">노인장기요양보험 · 새 창에서 열려요</span>
            </span>
            <ArrowRight size={15} className="shrink-0 text-ink-300" />
          </a>
        </section>

        <section className="mb-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-4 text-sm font-bold text-ink-900">알아두면 좋아요</h2>
          <dl className="space-y-4">
            {PROGRAM_FACTS.map((f) => (
              <div key={f.title}>
                <dt className="mb-1 text-sm font-bold text-ink-900">{f.title}</dt>
                <dd className="text-xs leading-relaxed text-ink-500">{f.desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mb-6 flex gap-2.5 rounded-2xl bg-accent-50 p-4">
          <Info size={16} className="mt-0.5 shrink-0 text-accent-600" />
          <p className="text-xs leading-relaxed text-ink-700">
            이 결과는 공단의 공식 판정이 아니에요. 실제 등급은 방문조사와 의사소견서를 거쳐
            등급판정위원회가 정하며, 같은 상태여도 결과가 다를 수 있어요.
          </p>
        </div>

        <div className="space-y-2.5">
          <Link
            href="/search"
            className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 text-base font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99]"
          >
            우리 동네 시설 찾아보기
            <ArrowRight size={18} />
          </Link>
          <button
            type="button"
            onClick={restart}
            className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-2xl border border-ink-100 text-sm font-bold text-ink-500 transition-colors duration-150 hover:bg-ink-100"
          >
            <RotateCcw size={15} />
            다시 해보기
          </button>
        </div>

        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            reason="로그인하면 예상 등급 결과를 확인할 수 있어요."
          />
        )}
      </main>
    );
  }

  /* ---------------------------------- 문항 ---------------------------------- */
  const options = optionsFor(area.scale);

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-3">
      <div className="sticky z-20 -mx-4 mb-5 border-b border-ink-100 bg-ivory/95 px-4 pb-3 pt-3 backdrop-blur [top:calc(3rem+var(--safe-top))] sm:[top:calc(4rem+var(--safe-top))]">
        <div className="mb-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={back}
            aria-label="이전"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors duration-150 hover:bg-ink-100 active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-primary-600">
              {areaIndex + 1} / {TEST_AREAS.length} · {answeredCount}개 답변
            </p>
            <h1 className="truncate text-lg font-bold text-ink-900">{area.title}</h1>
          </div>
          <span className="shrink-0 text-xs font-bold text-ink-300">
            {areaAnswered}/{area.items.length}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${(answeredCount / TOTAL_ITEMS) * 100}%` }}
          />
        </div>
      </div>

      <p className="mb-5 text-sm leading-relaxed text-ink-500">{area.subtitle}</p>

      <div className="space-y-4">
        {area.items.map((item, idx) => {
          const value = answers[item.id];
          return (
            <div
              key={item.id}
              id={`grade-q-${item.id}`}
              // scroll-margin: 자동 스크롤로 이동했을 때 sticky 진행률 바에 가리지 않게
              className={`rounded-2xl border p-4 transition-colors duration-200 [scroll-margin-top:calc(3rem+var(--safe-top)+96px)] sm:[scroll-margin-top:calc(4rem+var(--safe-top)+96px)] ${
                value !== undefined ? "border-ink-100 bg-white" : "border-primary-100 bg-white"
              }`}
            >
              <div className="mb-2.5 flex items-start gap-2">
                <span className="mt-0.5 text-xs font-bold text-ink-300">{idx + 1}</span>
                <p className="flex-1 text-sm font-bold leading-snug text-ink-900">{item.label}</p>
                {value !== undefined && (
                  <Check size={15} className="mt-0.5 shrink-0 text-primary-500" />
                )}
              </div>
              <div className={`grid gap-1.5 ${options.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {options.map((opt) => {
                  const on = value === opt.score;
                  return (
                    <button
                      key={opt.short}
                      type="button"
                      onClick={() => pick(item.id, opt.score)}
                      className={`min-h-[44px] rounded-xl border px-1 text-xs font-bold leading-tight transition-all duration-150 active:scale-95 ${
                        on
                          ? "border-primary-500 bg-primary-500 text-white shadow-soft"
                          : "border-ink-100 bg-white text-ink-500 hover:border-primary-200 hover:bg-primary-50/50"
                      }`}
                    >
                      {opt.short}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 px-4 pt-3 backdrop-blur [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            disabled={!areaComplete}
            onClick={next}
            className="min-h-[52px] w-full rounded-xl bg-primary-500 text-base font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-300 disabled:shadow-none"
          >
            {areaComplete
              ? areaIndex === TEST_AREAS.length - 1
                ? "결과 보기"
                : "다음"
              : `${area.items.length - areaAnswered}개 더 답해주세요`}
          </button>
        </div>
      </div>
    </main>
  );
}
