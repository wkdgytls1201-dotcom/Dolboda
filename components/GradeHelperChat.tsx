"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  Brain,
  ClipboardList,
  Heart,
  RotateCcw,
  Search,
  ShoppingBag,
  Stethoscope,
  Waves,
} from "lucide-react";
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

const AREA_ICON: Record<string, typeof Activity> = {
  physical: Activity,
  cognitive: Brain,
  behavior: Heart,
  nursing: Stethoscope,
  rehab: Waves,
};

const TYPING_DELAY_MS = 550;

function BotAvatar() {
  return (
    <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-card ring-1 ring-royal-100">
      <Image src="/logo.png" alt="돌보다" width={32} height={32} className="object-contain" />
    </span>
  );
}

function TypingBubble() {
  return (
    <div className="flex animate-message-in items-center gap-2.5">
      <BotAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-white px-4 py-3.5 shadow-card">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-royal-300"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function GradeHelperChat() {
  const [answers, setAnswers] = useState<HelperAnswers>({});
  const [entries, setEntries] = useState<ChatEntry[]>([
    { role: "bot", text: HELPER_QUESTIONS[0].ask },
  ]);
  const [typing, setTyping] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [result, setResult] = useState<HelperResult | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const queue = visibleQuestions(answers);
  const current = result || typing ? null : queue.find((q) => answers[q.id] == null) ?? null;
  const answeredCount = queue.filter((q) => answers[q.id] != null).length;
  const progressPct = queue.length > 0 ? Math.round((answeredCount / queue.length) * 100) : 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries.length, result, showApply, typing]);

  function pick(optionLabel: string, score: number) {
    if (!current || pendingSelection) return;
    // 고른 버튼이 잠깐 선택된 채로 보였다가 다음으로 넘어가야 눌렀다는 게 느껴진다
    setPendingSelection(optionLabel);

    setTimeout(() => {
      const nextAnswers = { ...answers, [current.id]: score };
      const nextEntries: ChatEntry[] = [...entries, { role: "user", text: optionLabel }];
      setPendingSelection(null);

      if (current.id === "eligible" && score === -1) {
        setEntries(nextEntries);
        finish(nextAnswers, nextEntries);
        return;
      }

      const nextQueue = visibleQuestions(nextAnswers);
      const nextQuestion = nextQueue.find((q) => nextAnswers[q.id] == null);
      setAnswers(nextAnswers);
      setEntries(nextEntries);

      if (nextQuestion) {
        // 봇이 바로 답하지 않고 "타이핑 중" 텀을 둬야 실제 대화처럼 느껴진다
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setEntries((prev) => [...prev, { role: "bot", text: nextQuestion.ask }]);
        }, TYPING_DELAY_MS);
      } else {
        finish(nextAnswers, nextEntries);
      }
    }, 320);
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
    setTyping(false);
    setPendingSelection(null);
    setResult(null);
    setAiText(null);
    setShowApply(false);
  }

  return (
    <div className="mx-auto max-w-xl">
      {!result && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-ink-300">버튼만 눌러서 답하면 돼요</span>
            <span className="font-bold text-royal-600">{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-royal-500 to-primary-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((e, i) =>
          e.role === "bot" ? (
            <div key={i} className="flex animate-message-in items-start gap-2.5">
              <BotAvatar />
              <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-ink-900 shadow-card">
                {e.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex animate-message-in justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-royal-500 px-4 py-3 text-sm font-semibold leading-relaxed text-white shadow-card">
                {e.text}
              </p>
            </div>
          )
        )}
        {typing && <TypingBubble />}
      </div>

      {current && (
        <div className="mt-4 flex flex-col gap-2">
          {current.options.map((o) => {
            const selected = pendingSelection === o.label;
            return (
              <button
                key={o.label}
                type="button"
                disabled={!!pendingSelection}
                onClick={() => pick(o.label, o.score)}
                className={`min-h-[48px] rounded-xl border px-4 py-3 text-center text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                  selected
                    ? "border-royal-500 bg-royal-500 text-white"
                    : pendingSelection
                    ? "border-ink-100 bg-white text-ink-300"
                    : "border-royal-200 bg-white text-ink-900 hover:border-royal-400 hover:bg-royal-50"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {result && (
        <div className="mt-5 animate-message-in space-y-4">
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
              <div className="mt-4 space-y-2.5">
                {result.areaPercents.map((a) => {
                  const Icon = AREA_ICON[a.area] ?? Activity;
                  return (
                    <div key={a.area} className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-royal-50 text-royal-600">
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex justify-between text-xs">
                          <span className="text-ink-500">{a.label}</span>
                          <span className="font-semibold text-ink-700">
                            도움 필요 {a.percent}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-ink-100">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-royal-400 to-primary-400 transition-all duration-700"
                            style={{ width: `${a.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            <div className="animate-message-in rounded-2xl bg-white p-5 shadow-card">
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
