"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { FacilityType } from "@/lib/types";
import {
  COPAY_RATE,
  COPAY_TIER_LABEL,
  CopayTier,
  DAY_NIGHT_BAND_LABEL,
  DayNightBand,
  HOME_CARE_MONTHLY_LIMIT,
  HOME_VISIT_MINUTES,
  HOME_VISIT_RATE,
  LTCI_GRADE_LABEL,
  LtciGrade,
  ServiceType,
  calcDayNightCopay,
  calcFacilityCareCopay,
  calcHomeVisitCopay,
} from "@/lib/copay";
import { InfoTooltip } from "./InfoTooltip";
import { TOOLTIPS } from "@/lib/tooltips";
import { CalcStepFlow } from "./CalcStepFlow";
import { CostBreakdownBar } from "./CostBreakdownBar";

const GRADES: LtciGrade[] = [1, 2, 3, 4, 5, "cognitive"];
const TIERS: CopayTier[] = ["general", "reducedLight", "reducedHeavy", "basic"];
const BANDS: DayNightBand[] = ["3to6", "6to8", "8to10", "10to13"];

type CalcMode = "facility" | "dayNight" | "homeVisit";

function modeOf(facilityType: FacilityType): CalcMode {
  if (facilityType === "NURSING_HOME") return "facility";
  if (facilityType === "DAY_NIGHT_CARE") return "dayNight";
  return "homeVisit";
}

function won(n: number) {
  return `${Math.round(n).toLocaleString()}원`;
}

function chipClass(active: boolean) {
  return `min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition ${
    active
      ? "border-primary-500 bg-primary-500 text-white"
      : "border-ink-100 bg-white text-ink-700 hover:border-primary-300"
  }`;
}

function LimitGauge({ used, limit, over }: { used: number; limit: number; over: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center text-ink-500">
          월 한도액 사용률
          <InfoTooltip text={TOOLTIPS.monthlyLimit} />
        </span>
        <span className="font-semibold text-ink-900">
          {won(Math.min(used, limit))} / {won(limit)}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-ink-100">
        <div
          className="h-2.5 rounded-full bg-primary-500 transition-all"
          style={{ width: `${Math.min(100, Math.round((used / limit) * 100))}%` }}
        />
      </div>
      {over > 0 && (
        <p className="mt-1 text-[11px] font-medium text-accent-600">
          한도를 {won(over)} 초과했어요 — 초과분은 전액 본인부담이에요.
        </p>
      )}
    </div>
  );
}

function TotalCard({ amount }: { amount: number }) {
  return (
    <div className="rounded-xl bg-primary-50 px-4 py-3 text-center">
      <p className="text-xs text-ink-500">월 실제 예상금액</p>
      <p className="text-2xl font-extrabold text-primary-700">{won(amount)}</p>
    </div>
  );
}

export function CopayCalculator({
  facilityType,
  defaultMonthlyMealCost = 0,
  defaultMonthlySnackCost = 0,
}: {
  facilityType: FacilityType;
  defaultMonthlyMealCost?: number;
  defaultMonthlySnackCost?: number;
}) {
  const mode = modeOf(facilityType);
  const serviceType: ServiceType = mode === "facility" ? "facility" : "home";

  const [grade, setGrade] = useState<LtciGrade>(3);
  const [tier, setTier] = useState<CopayTier>("general");
  // 요양원(시설급여)
  const [days, setDays] = useState(30);
  const [mealCost, setMealCost] = useState(defaultMonthlyMealCost || 400000);
  const [snackCost, setSnackCost] = useState(defaultMonthlySnackCost || 50000);
  // 주야간보호
  const [dayNightDays, setDayNightDays] = useState(22);
  const [band, setBand] = useState<DayNightBand>("8to10");
  const [dailyMeal, setDailyMeal] = useState(5000);
  // 방문요양
  const [visitsPerWeek, setVisitsPerWeek] = useState(5);
  const [minutes, setMinutes] = useState<number>(180);

  const notEligibleFacility = grade === "cognitive" && mode === "facility";
  const notEligibleVisit = grade === "cognitive" && mode === "homeVisit";

  const result = useMemo(() => {
    if (mode === "facility") {
      if (notEligibleFacility) return null;
      return {
        kind: "facility" as const,
        ...calcFacilityCareCopay(grade, tier, days, mealCost, snackCost),
      };
    }
    if (mode === "dayNight") {
      return {
        kind: "dayNight" as const,
        ...calcDayNightCopay(grade, tier, dayNightDays, band, dailyMeal),
      };
    }
    if (notEligibleVisit) return null;
    const visitsPerMonth = Math.round(visitsPerWeek * 4.345);
    return {
      kind: "homeVisit" as const,
      visitsPerMonth,
      ...calcHomeVisitCopay(grade, tier, visitsPerMonth, minutes),
    };
  }, [
    mode,
    grade,
    tier,
    days,
    mealCost,
    snackCost,
    dayNightDays,
    band,
    dailyMeal,
    visitsPerWeek,
    minutes,
    notEligibleFacility,
    notEligibleVisit,
  ]);

  return (
    <div className="rounded-2xl bg-primary-50/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calculator size={18} className="text-primary-600" />
        <h3 className="text-sm font-bold text-ink-900">
          {mode === "dayNight"
            ? "월 실부담 시뮬레이터 — 주야간보호"
            : mode === "homeVisit"
            ? "월 실부담 시뮬레이터 — 방문요양"
            : "월 실부담 시뮬레이터"}
        </h3>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center text-xs font-semibold text-ink-700">
            장기요양등급
            <InfoTooltip text={TOOLTIPS.ltciGrade} />
          </label>
          <select
            value={grade}
            onChange={(e) => {
              const v = e.target.value;
              setGrade((v === "cognitive" ? "cognitive" : Number(v)) as LtciGrade);
            }}
            className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {LTCI_GRADE_LABEL[g]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 flex items-center text-xs font-semibold text-ink-700">
            본인부담 구분
            <InfoTooltip
              text={
                tier === "basic"
                  ? TOOLTIPS.basicRecipient
                  : tier === "general"
                  ? TOOLTIPS.benefit
                  : TOOLTIPS.reduced
              }
            />
          </label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as CopayTier)}
            className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {COPAY_TIER_LABEL[t]} ({Math.round(COPAY_RATE[t][serviceType] * 100)}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {notEligibleFacility && (
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-ink-500">
          인지지원등급은 시설급여(요양원 입소) 대상이 아니에요. 재가급여(방문요양·주야간보호)를
          이용해 주세요.
        </p>
      )}
      {notEligibleVisit && (
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-ink-500">
          인지지원등급은 일반 방문요양 급여 대상이 아니에요. 주야간보호와 인지활동형 프로그램을
          이용하실 수 있어요.
        </p>
      )}

      {mode === "dayNight" && result?.kind === "dayNight" && (
        <>
          <div className="mb-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">
                하루 이용시간
              </label>
              <div className="flex flex-wrap gap-2">
                {BANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBand(b)}
                    className={chipClass(band === b)}
                  >
                    {DAY_NIGHT_BAND_LABEL[b]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">
                  월 이용일수(일)
                </label>
                <input
                  type="number"
                  value={dayNightDays}
                  onChange={(e) => setDayNightDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-base focus:border-primary-400 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-ink-300">주 5일 이용 시 약 22일이에요.</p>
              </div>
              <div>
                <label className="mb-1 flex items-center text-xs font-semibold text-ink-700">
                  1일 식비(원)
                  <InfoTooltip text={TOOLTIPS.nonCovered} />
                </label>
                <input
                  type="number"
                  value={dailyMeal}
                  onChange={(e) => setDailyMeal(Number(e.target.value))}
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-base focus:border-primary-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-white p-4">
            <CalcStepFlow
              steps={[
                { label: `1일 수가 (${DAY_NIGHT_BAND_LABEL[band]})`, value: won(result.dailyRate) },
                { label: "월 이용일수", value: `${dayNightDays}일` },
                { label: "월 급여비용", value: won(result.usageAmount) },
              ]}
              operators={["×", "="]}
            />
            <LimitGauge used={result.usageAmount} limit={result.limit} over={result.overLimit} />
            <div className="border-t border-ink-100 pt-3">
              <p className="mb-2 text-xs font-semibold text-ink-700">월 실제 예상금액 구성</p>
              <CostBreakdownBar
                total={result.copay}
                segments={[
                  {
                    label: `본인부담금 ${Math.round(COPAY_RATE[tier].home * 100)}%`,
                    value: result.withinLimitCopay,
                    colorClassName: "bg-primary-600",
                  },
                  {
                    label: "한도초과 전액부담",
                    value: result.overLimit,
                    colorClassName: "bg-accent-600",
                  },
                  { label: "식비(비급여)", value: result.mealCost, colorClassName: "bg-mint-600" },
                ]}
              />
              <p className="mt-2 text-[11px] text-ink-300">
                식비는 비급여 항목이라 본인부담 감경 혜택이 적용되지 않아요.
              </p>
            </div>
            <TotalCard amount={result.copay} />
          </div>
        </>
      )}

      {mode === "homeVisit" && result?.kind === "homeVisit" && (
        <>
          <div className="mb-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">
                1회 방문시간
              </label>
              <div className="flex flex-wrap gap-2">
                {HOME_VISIT_MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    className={chipClass(minutes === m)}
                  >
                    {m % 60 === 0 ? `${m / 60}시간` : `${Math.floor(m / 60)}시간 ${m % 60}분`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">
                주 방문횟수
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 5, 6, 7].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisitsPerWeek(v)}
                    className={chipClass(visitsPerWeek === v)}
                  >
                    주 {v}회
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-white p-4">
            <CalcStepFlow
              steps={[
                { label: "1회 방문 수가", value: won(result.visitRate) },
                { label: "월 방문횟수", value: `약 ${result.visitsPerMonth}회` },
                { label: "월 급여비용", value: won(result.usageAmount) },
              ]}
              operators={["×", "="]}
            />
            <LimitGauge used={result.usageAmount} limit={result.limit} over={result.overLimit} />
            <div className="border-t border-ink-100 pt-3">
              <p className="mb-2 text-xs font-semibold text-ink-700">월 실제 예상금액 구성</p>
              <CostBreakdownBar
                total={result.copay}
                segments={[
                  {
                    label: `본인부담금 ${Math.round(COPAY_RATE[tier].home * 100)}%`,
                    value: result.withinLimitCopay,
                    colorClassName: "bg-primary-600",
                  },
                  {
                    label: "한도초과 전액부담",
                    value: result.overLimit,
                    colorClassName: "bg-accent-600",
                  },
                ]}
              />
            </div>
            <TotalCard amount={result.copay} />
          </div>
        </>
      )}

      {mode === "facility" && result?.kind === "facility" && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">이용일수(일)</label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-base focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center text-xs font-semibold text-ink-700">
                월 식비
                <InfoTooltip text={TOOLTIPS.nonCovered} />
              </label>
              <input
                type="number"
                value={mealCost}
                onChange={(e) => setMealCost(Number(e.target.value))}
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-base focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">월 간식비</label>
              <input
                type="number"
                value={snackCost}
                onChange={(e) => setSnackCost(Number(e.target.value))}
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-base focus:border-primary-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-white p-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-ink-700">급여비용 계산</p>
              <CalcStepFlow
                steps={[
                  { label: "1일 수가", value: won(result.dailyRate) },
                  { label: "이용일수", value: `${days}일` },
                  { label: "급여비용 합계", value: won(result.careCost) },
                ]}
                operators={["×", "="]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
              <span className="text-xs text-ink-500">
                본인부담률 {Math.round(COPAY_RATE[tier].facility * 100)}% 적용 →
              </span>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-bold text-primary-700">
                급여 본인부담금 {won(result.careCopay)}
              </span>
            </div>

            <div className="border-t border-ink-100 pt-3">
              <p className="mb-2 text-xs font-semibold text-ink-700">월 실제 예상금액 구성</p>
              <CostBreakdownBar
                total={result.copay}
                segments={[
                  {
                    label: "급여 본인부담금",
                    value: result.careCopay,
                    colorClassName: "bg-primary-600",
                  },
                  { label: "식비", value: result.mealCost, colorClassName: "bg-mint-600" },
                  { label: "간식비", value: result.snackCost, colorClassName: "bg-accent-600" },
                ]}
              />
              <p className="mt-2 text-[11px] text-ink-300">
                식비·간식비는 비급여 항목이라 본인부담 감경 혜택이 적용되지 않아요.
              </p>
            </div>

            <TotalCard amount={result.copay} />
          </div>
        </>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-ink-300">
        수가·한도액은 고시 개정에 따라 달라질 수 있는 예시 계산이에요.
        <br />
        정확한 금액은 시설 또는 국민건강보험공단에 문의해 주세요.
      </p>
    </div>
  );
}
