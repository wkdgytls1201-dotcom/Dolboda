"use client";

import { useState } from "react";
import { ChevronDown, Info, Sparkles } from "lucide-react";
import { DolbodaScore, scoreLevel, weightTier } from "@/lib/dolbodaScore";
import { NHIS_GRADE_LETTER } from "./GradeBadge";

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

export function DolbodaScoreCard({
  score,
  regionContext,
  grade,
  gradeSource,
}: {
  score: DolbodaScore;
  /** 같은 시군구·같은 유형 시설들의 안심지수 평균 (서버에서 동일 산식으로 계산) */
  regionContext?: { name: string; average: number; count: number } | null;
  /** 국가 평가등급 — 지수와 엇갈릴 때 이유를 설명하기 위해 받는다 */
  grade?: number | null;
  gradeSource?: "HIRA" | "NHIS";
}) {
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

  // 국가 평가등급과 안심지수가 엇갈려 보일 때(3등급인데 "우수" 등) 왜 그런지 밝힌다.
  // 두 숫자는 보는 대상이 다르다 — 평가등급은 정해진 주기의 심사 결과 하나이고,
  // 안심지수는 그 등급을 가장 크게 반영하되 인력·시설·공개 정보까지 함께 본 값이다.
  // 설명 없이 나란히 두면 "국가는 3등급인데 여기선 우수?"로 읽혀 오히려 신뢰를 잃는다.
  const gradeLabel =
    grade == null
      ? null
      : gradeSource === "NHIS"
      ? `${NHIS_GRADE_LETTER[grade - 1] ?? grade}등급`
      : `${grade}등급`;
  // "무엇 덕분에 올랐는지"는 비중이 큰 영역에서 골라야 설득력이 있다 —
  // 점수만 보고 고르면 보조 반영(10%)인 정보 투명성 100점이 뽑혀,
  // 정작 핵심인 의료·간호 대응 94점을 놔두고 곁가지를 이유로 대게 된다.
  const scored = score.areas.filter((a) => a.score != null) as (typeof score.areas)[number][];
  const best = scored.reduce<(typeof scored)[number] | null>((top, a) => {
    if ((a.score as number) < 75) return top; // 강점이라 부를 수 없는 점수는 후보에서 제외
    if (top == null) return a;
    return a.weight > top.weight ||
      (a.weight === top.weight && (a.score as number) > (top.score as number))
      ? a
      : top;
  }, null);
  const mismatch =
    grade != null &&
    gradeLabel &&
    best &&
    ((grade >= 3 && score.total >= 70) || (grade <= 2 && score.total < 70));

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      {/* 점수 히어로 — 보라→코랄 그라데이션. 모바일은 세로 스택, sm 이상은 가로 배치 */}
      <div className="bg-gradient-to-br from-royal-600 via-royal-500 to-primary-500 px-5 py-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
          <ScoreRing total={score.total} />
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
              <Sparkles size={12} />
              돌보다 AI기반 안심지수
            </span>
            <p className="mt-2 text-2xl font-extrabold text-white">{level.label}</p>
          </div>
        </div>

        {/* 같은 지역 평균 대비 — 보호자가 가장 궁금해하는 "우리 동네에서 어느 정도?".
            숫자가 작으면 그냥 지나쳐서, 평균과 차이를 크게 보여준다 */}
        {regionContext && (
          <div className="mt-4 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
            <p className="mb-1.5 text-center text-xs text-white/80 sm:text-left">
              {regionContext.name} 같은 유형 {regionContext.count}곳과 비교하면
            </p>
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              <span className="text-center sm:text-left">
                <span className="block text-[11px] text-white/70">지역 평균</span>
                <span className="text-xl font-bold text-white/90">{regionContext.average}점</span>
              </span>
              <span className="text-lg text-white/40" aria-hidden>
                →
              </span>
              <span
                className={`rounded-xl px-3 py-1.5 text-center ${
                  score.total >= regionContext.average ? "bg-white" : "bg-white/25"
                }`}
              >
                <span
                  className={`block text-[11px] font-semibold ${
                    score.total >= regionContext.average ? "text-royal-500" : "text-white/80"
                  }`}
                >
                  이 시설
                </span>
                <span
                  className={`text-xl font-extrabold ${
                    score.total >= regionContext.average ? "text-royal-600" : "text-white"
                  }`}
                >
                  {score.total >= regionContext.average ? "+" : ""}
                  {score.total - regionContext.average}점
                </span>
              </span>
            </div>
          </div>
        )}

        {/* 설계 근거는 히어로 바로 아래에 — 점수만 보고 넘어가지 않게.
            한 줄에 붙이면 좁은 화면에서 어중간하게 접혀 읽기 어려워, 두 줄로 나누고
            둘째 줄은 들여써서 첫 줄에 딸린 부연임이 드러나게 한다. */}
        <div className="mt-3 space-y-0.5 text-xs leading-relaxed text-white/75">
          <p>돌보다가 자체 설계한 6개 영역 지표</p>
          <p className="pl-3 text-white/60">└ 공공데이터 {score.coverage}% 확보 기준</p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {mismatch && (
          <p className="mb-3.5 flex items-start gap-1.5 rounded-xl bg-ink-100/50 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
            <Info size={12} className="mt-0.5 shrink-0 text-ink-300" aria-hidden />
            <span>
              평가등급 {gradeLabel} · 안심지수 {score.total}점 —{" "}
              {grade! >= 3
                ? `등급을 가장 크게 반영하지만 ${best!.label}(${best!.score}점)이 좋아 총점이 올랐어요.`
                : `등급은 좋지만 다른 영역 점수가 낮아 총점은 ${score.total}점이에요.`}
            </span>
          </p>
        )}

        <div className="space-y-3.5">
          {score.areas.map((area) => (
            <div key={area.key}>
              {/* 모바일에서 라벨·점수를 윗줄, 막대를 아랫줄 전체 폭으로 — 좁은 화면에서 막대가 짓눌리지 않게 */}
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                  {area.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      weightTier(area.weight).tone
                    }`}
                  >
                    {weightTier(area.weight).label}
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
          className={`mt-4 flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all ${
            open
              ? "bg-ink-100/60 text-ink-700"
              : "bg-gradient-to-r from-royal-500 to-primary-500 text-white shadow-royal hover:-translate-y-0.5 hover:shadow-royal-hover"
          }`}
        >
          <Sparkles size={15} className={open ? "text-royal-500" : ""} />
          어떻게 계산했나요? {open ? "접기" : "전체 근거 보기"}
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="mt-3 space-y-3">
            {score.areas.map((area) => (
              <div key={area.key} className="rounded-xl border border-ink-100 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink-900">
                  {area.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      weightTier(area.weight).tone
                    }`}
                  >
                    {weightTier(area.weight).label}
                  </span>
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
