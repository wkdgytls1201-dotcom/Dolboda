"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Check,
  Sparkles,
  ClipboardList,
  RotateCcw,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  TEST_AREAS,
  TOTAL_ITEMS,
  APPLY_STEPS,
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

export function GradeTest() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [areaIndex, setAreaIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

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

  function next() {
    if (areaIndex < TEST_AREAS.length - 1) {
      setAreaIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPhase("result");
      window.scrollTo({ top: 0 });
    }
  }

  function back() {
    if (areaIndex > 0) {
      setAreaIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPhase("intro");
    }
  }

  function restart() {
    setAnswers({});
    setAreaIndex(0);
    setPhase("intro");
    window.scrollTo({ top: 0 });
  }

  /* ---------------------------------- 소개 ---------------------------------- */
  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
        <div className="mb-6 text-center">
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

        <div className="mb-5 space-y-2.5">
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

        <div className="mb-6 flex gap-2.5 rounded-2xl bg-ink-100/40 p-4">
          <Info size={16} className="mt-0.5 shrink-0 text-ink-300" />
          <p className="text-xs leading-relaxed text-ink-500">
            실제 등급은 공단 직원의 방문조사와 의사소견서를 바탕으로
            등급판정위원회가 결정해요. 이 테스트는 미리 가늠해보는 참고용이라 결과가 다를 수 있어요.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPhase("test")}
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
    return (
      <main className="mx-auto max-w-lg px-4 pb-20 pt-6">
        <div className="mb-5 rounded-3xl border border-ink-100 bg-white p-6 text-center shadow-card">
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

        <section className="mb-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
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

        <section className="mb-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
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

        <section className="mb-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
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
            className="mt-3 block rounded-xl border border-ink-100 py-2.5 text-center text-xs font-bold text-ink-500 transition-colors duration-150 hover:bg-ink-100"
          >
            노인장기요양보험 공식 홈페이지에서 신청하기
          </a>
        </section>

        <div className="mb-4 flex gap-2.5 rounded-2xl bg-accent-50 p-4">
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

      <p className="mb-4 text-sm leading-relaxed text-ink-500">{area.subtitle}</p>

      <div className="space-y-3">
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
