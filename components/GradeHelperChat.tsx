"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, ClipboardList, RotateCcw, Search, ShoppingBag } from "lucide-react";
import {
  HELPER_QUESTIONS,
  HelperAnswers,
  HelperResult,
  calcHelperResult,
  visibleQuestions,
} from "@/lib/gradeHelper";
import { APPLY_STEPS } from "@/lib/gradeTest";

interface ChatEntry {
  role: "bot" | "user";
  text: string;
}

export function GradeHelperChat() {
  const [answers, setAnswers] = useState<HelperAnswers>({});
  const [entries, setEntries] = useState<ChatEntry[]>([
    { role: "bot", text: HELPER_QUESTIONS[0].ask },
  ]);
  const [result, setResult] = useState<HelperResult | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const queue = visibleQuestions(answers);
  const current = result ? null : queue.find((q) => answers[q.id] == null) ?? null;
  const answeredCount = queue.filter((q) => answers[q.id] != null).length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries.length, result, showApply]);

  function pick(optionLabel: string, score: number) {
    if (!current) return;
    const nextAnswers = { ...answers, [current.id]: score };
    const nextEntries: ChatEntry[] = [...entries, { role: "user", text: optionLabel }];

    // 대상 아님 → 즉시 종료
    if (current.id === "eligible" && score === -1) {
      finish(nextAnswers, nextEntries);
      return;
    }

    const nextQueue = visibleQuestions(nextAnswers);
    const nextQuestion = nextQueue.find((q) => nextAnswers[q.id] == null);
    if (nextQuestion) {
      nextEntries.push({ role: "bot", text: nextQuestion.ask });
      setAnswers(nextAnswers);
      setEntries(nextEntries);
    } else {
      finish(nextAnswers, nextEntries);
    }
  }

  function finish(finalAnswers: HelperAnswers, finalEntries: ChatEntry[]) {
    const r = calcHelperResult(finalAnswers);
    setAnswers(finalAnswers);
    setEntries(finalEntries);
    setResult(r);

    if (!r.ineligible && r.summaryForLlm) {
      setAiLoading(true);
      fetch("/api/grade-helper/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ summary: r.summaryForLlm }),
      })
        .then((res) => res.json())
        .then((data) => setAiText(typeof data?.text === "string" ? data.text : null))
        .catch(() => setAiText(null))
        .finally(() => setAiLoading(false));
    }
  }

  function restart() {
    setAnswers({});
    setEntries([{ role: "bot", text: HELPER_QUESTIONS[0].ask }]);
    setResult(null);
    setAiText(null);
    setShowApply(false);
  }

  return (
    <div className="mx-auto max-w-xl">
      {!result && (
        <div className="mb-4 flex items-center justify-between text-xs text-ink-300">
          <span>버튼만 눌러서 답하면 돼요</span>
          <span className="font-semibold text-ink-500">
            {answeredCount}/{queue.length}
          </span>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((e, i) =>
          e.role === "bot" ? (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal-100">
                <Bot size={16} className="text-royal-600" />
              </span>
              <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-ink-900 shadow-card">
                {e.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-royal-500 px-4 py-3 text-sm leading-relaxed text-white">
                {e.text}
              </p>
            </div>
          )
        )}
      </div>

      {current && (
        <div className="mt-4 flex flex-col gap-2">
          {current.options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => pick(o.label, o.score)}
              className="min-h-[48px] rounded-xl border border-royal-200 bg-white px-4 py-3 text-left text-sm font-semibold text-ink-900 transition hover:border-royal-400 hover:bg-royal-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            {result.ineligible ? (
              <p className="text-base font-bold text-ink-900">
                지금은 신청 대상이 아닐 수 있어요
              </p>
            ) : result.rangeLabel ? (
              <>
                <p className="text-xs font-semibold text-royal-600">예상 등급 범위</p>
                <p className="mt-1 text-2xl font-extrabold text-ink-900">
                  {result.rangeLabel}
                  <span className="ml-1 text-base font-bold text-ink-500">이 예상돼요</span>
                </p>
              </>
            ) : (
              <p className="text-base font-bold text-ink-900">등급 판정이 어려울 수 있어요</p>
            )}

            {!result.ineligible && result.areaPercents.length > 0 && (
              <div className="mt-4 space-y-2">
                {result.areaPercents.map((a) => (
                  <div key={a.area}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="text-ink-500">{a.label}</span>
                      <span className="font-semibold text-ink-700">도움 필요 {a.percent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-ink-100">
                      <div
                        className="h-1.5 rounded-full bg-royal-400"
                        style={{ width: `${a.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-xl bg-royal-50/70 px-4 py-3">
              {aiLoading ? (
                <p className="animate-pulse text-sm text-ink-500">설명을 정리하고 있어요…</p>
              ) : (
                <p className="text-sm leading-relaxed text-ink-700">
                  {aiText ?? result.fallbackExplanation}
                </p>
              )}
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-ink-300">
              간단 스크리닝으로 추정한 참고 범위예요. 실제 등급은 공단 방문조사(52개 항목)와
              의사소견서를 바탕으로 등급판정위원회가 결정해요.
            </p>
          </div>

          {!result.ineligible && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <a
                href="https://www.longtermcare.or.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-3 text-sm font-bold text-ink-700 shadow-card transition hover:-translate-y-0.5"
              >
                <ShoppingBag size={16} className="text-mint-600" />
                복지용구 보기
              </a>
              <button
                type="button"
                onClick={() => setShowApply(!showApply)}
                className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-3 text-sm font-bold text-ink-700 shadow-card transition hover:-translate-y-0.5"
              >
                <ClipboardList size={16} className="text-royal-600" />
                신청 방법 보기
              </button>
              <Link
                href="/search"
                className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-3 py-3 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5"
              >
                <Search size={16} />
                시설 찾기
              </Link>
            </div>
          )}

          {showApply && (
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <p className="mb-3 text-sm font-bold text-ink-900">등급 신청은 이렇게 진행돼요</p>
              <ol className="space-y-3">
                {APPLY_STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-royal-100 text-xs font-bold text-royal-600">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            type="button"
            onClick={restart}
            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-ink-300 transition hover:text-ink-500"
          >
            <RotateCcw size={13} />
            처음부터 다시 하기
          </button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
