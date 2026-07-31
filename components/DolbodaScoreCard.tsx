"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { DolbodaScore, scoreLevel } from "@/lib/dolbodaScore";

// 원형 점수 링 — 외부 라이브러리 없이 SVG stroke로만 그린다
function ScoreRing({ total }: { total: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - total / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-extrabold leading-none">{total}</span>
        <span className="mt-0.5 text-[10px] font-medium opacity-80">/ 100점</span>
      </div>
    </div>
  );
}

export function DolbodaScoreCard({ score }: { score: DolbodaScore }) {
  const [open, setOpen] = useState(false);

  if (score.total == null) {
    return (
      <div className="rounded-2xl bg-ink-100/40 p-5">
        <p className="text-sm leading-relaxed text-ink-500">
          이 시설은 공개된 공공데이터가 부족해 돌보다 AI기반 안심지수를 계산하지 않았어요. 부족한
          데이터로 시설을 판단하지 않는 것이 돌보다의 원칙이에요.
        </p>
      </div>
    );
  }

  const level = scoreLevel(score.total);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      {/* 점수 히어로 — 보라→코랄 그라데이션. 모바일은 세로 스택, sm 이상은 가로 배치 */}
      <div className="bg-gradient-to-br from-royal-600 via-royal-500 to-primary-500 px-5 py-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
          <ScoreRing total={score.total} />
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
              <Sparkles size={11} />
              돌보다 AI기반 안심지수
            </span>
            <p className="mt-2 text-xl font-extrabold text-white">{level.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/70">
              공공데이터 {score.coverage}% 확보 기준 · 6개 영역 가중치 자동 산출
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="space-y-3.5">
          {score.areas.map((area) => (
            <div key={area.key}>
              {/* 모바일에서 라벨·점수를 윗줄, 막대를 아랫줄 전체 폭으로 — 좁은 화면에서 막대가 짓눌리지 않게 */}
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-ink-700">
                  {area.label}
                  <span className="ml-1 text-[10px] font-medium text-ink-300">
                    {area.weight}%
                  </span>
                </p>
                <span
                  className={`shrink-0 text-xs ${
                    area.score != null ? "font-bold text-ink-900" : "text-ink-300"
                  }`}
                >
                  {area.score != null ? `${area.score}점` : "데이터 없음"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-ink-100/70">
                {area.score != null && (
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-royal-400 to-primary-400 transition-all duration-500"
                    style={{ width: `${area.score}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-xl bg-ink-100/40 text-xs font-semibold text-ink-500 transition hover:bg-ink-100/70 hover:text-ink-700"
        >
          어떻게 계산했나요? {open ? "접기" : "전체 근거 보기"}
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="mt-3 space-y-3">
            {score.areas.map((area) => (
              <div key={area.key} className="rounded-xl border border-ink-100 p-3">
                <p className="mb-1.5 text-xs font-bold text-ink-900">
                  {area.label}
                  <span className="ml-1 font-medium text-ink-300">가중치 {area.weight}%</span>
                </p>
                <ul className="space-y-1">
                  {area.signals.map((s) => (
                    <li
                      key={s.label}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs"
                    >
                      <span className="text-ink-500">
                        {s.label}
                        {s.note && <span className="ml-1 text-ink-300">({s.note})</span>}
                      </span>
                      <span
                        className={s.score != null ? "font-semibold text-ink-900" : "text-ink-300"}
                      >
                        {s.score != null ? `${s.score}점` : "미공개"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-ink-300">
          평가등급·인력·시설 같은 공공데이터만으로 자동 계산한 참고 지표예요. 데이터가 공개되지
          않은 항목은 전국 평균 수준으로 보수적으로 반영했어요.
          <br />
          입소 결정 전에는 꼭 직접 방문해서 확인해 보세요.
        </p>
      </div>
    </div>
  );
}
