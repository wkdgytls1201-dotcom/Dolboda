"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AuthModal } from "./AuthModal";
import {
  ChevronLeft,
  Check,
  Sparkles,
  ClipboardList,
  Lock,
  RotateCcw,
  ArrowRight,
  ExternalLink,
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

const TONE_STYLES: Record<string, { chip: string; ring: string; bar: string }> = {
  high: { chip: "bg-primary-50 text-primary-700", ring: "text-primary-500", bar: "bg-primary-500" },
  mid: { chip: "bg-royal-50 text-royal-700", ring: "text-royal-500", bar: "bg-royal-500" },
  low: { chip: "bg-mint-100 text-mint-700", ring: "text-mint-600", bar: "bg-mint-500" },
  none: { chip: "bg-ink-100 text-ink-500", ring: "text-ink-300", bar: "bg-ink-300" },
};

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
  const saved = typeof window !== "undefined" ? readSaved() : null;

  const [phase, setPhase] = useState<Phase>(saved?.phase ?? "intro");
  const [areaIndex, setAreaIndex] = useState(saved?.areaIndex ?? 0);
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? {});

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

  // 진행 상황을 계속 저장해둔다 (로그인 왕복 후 복원용)
  useEffect(() => {
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({ phase, areaIndex, answers }));
    } catch {
      // 저장이 막혀 있어도 테스트 자체는 계속 진행된다
    }
  }, [phase, areaIndex, answers]);

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
      <main className="mx-auto max-w-lg px-4 pb-24 pt-8">
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
                <span className="block truncate text-xs text-ink-300">{a.subtitle}</span>
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
        <div className="mb-6 rounded-3xl border border-ink-100 bg-white p-7 text-center shadow-card sm:p-8">
          <p className="mb-2 text-xs font-bold text-ink-300">예상 결과</p>
          <h1 className="mb-2 text-2xl font-bold text-ink-900">{result.band.label}</h1>
          <p className="mb-4 text-sm leading-relaxed text-ink-500">{result.band.summary}</p>

          <div className="mb-4 flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`h-2 flex-1 rounded-full ${
                  result.score >= n * 20 - 10 ? tone.bar : "bg-ink-100"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-ink-300">도움 필요도 {result.score}점 / 100점 기준</p>
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

        <section className="mb-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-2 text-sm font-bold text-ink-900">이런 서비스를 주로 이용해요</h2>
          <p className="mb-3 text-xs leading-relaxed text-ink-500">{result.band.detail}</p>
          <div className="flex flex-wrap gap-1.5">
            {result.band.services.map((s) => (
              <span key={s} className={`rounded-full px-3 py-1.5 text-xs font-bold ${tone.chip}`}>
                {s}
              </span>
            ))}
          </div>
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
      <div className="sticky top-12 z-20 -mx-4 mb-5 border-b border-ink-100 bg-ivory/95 px-4 pb-3 pt-3 backdrop-blur sm:top-16">
        <div className="mb-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={back}
            aria-label="이전"
            className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors duration-150 hover:bg-ink-100 active:scale-95"
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
              className={`rounded-2xl border p-4 transition-colors duration-200 ${
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
