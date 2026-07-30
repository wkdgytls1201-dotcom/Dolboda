"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { FacilityType } from "@/lib/types";
import {
  COPAY_RATE,
  COPAY_TIER_LABEL,
  CopayTier,
  FACILITY_CARE_DAILY_RATE,
  HOME_CARE_MONTHLY_LIMIT,
  LTCI_GRADE_LABEL,
  LtciGrade,
  ServiceType,
  calcFacilityCareCopay,
  calcHomeCareCopay,
} from "@/lib/copay";
import { InfoTooltip } from "./InfoTooltip";
import { TOOLTIPS } from "@/lib/tooltips";
import { CalcStepFlow } from "./CalcStepFlow";
import { CostBreakdownBar } from "./CostBreakdownBar";

const GRADES: LtciGrade[] = [1, 2, 3, 4, 5, "cognitive"];
const TIERS: CopayTier[] = ["general", "reducedLight", "reducedHeavy", "basic"];

function won(n: number) {
  return `${Math.round(n).toLocaleString()}원`;
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
  const serviceType: ServiceType = facilityType === "NURSING_HOME" ? "facility" : "home";

  const [grade, setGrade] = useState<LtciGrade>(3);
  const [tier, setTier] = useState<CopayTier>("general");
  const [usageAmount, setUsageAmount] = useState(HOME_CARE_MONTHLY_LIMIT[3]);
  const [days, setDays] = useState(30);
  const [mealCost, setMealCost] = useState(defaultMonthlyMealCost || 400000);
  const [snackCost, setSnackCost] = useState(defaultMonthlySnackCost || 50000);

  const notEligible = grade === "cognitive" && serviceType === "facility";

  const result = useMemo(() => {
    if (notEligible) return null;
    if (serviceType === "home") {
      return { kind: "home" as const, ...calcHomeCareCopay(grade, tier, usageAmount) };
    }
    return {
      kind: "facility" as const,
      ...calcFacilityCareCopay(grade, tier, days, mealCost, snackCost),
    };
  }, [serviceType, grade, tier, usageAmount, days, mealCost, snackCost, notEligible]);

  return (
    <div className="rounded-2xl bg-primary-50/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calculator size={18} className="text-primary-600" />
        <h3 className="text-sm font-bold text-ink-900">예상 본인부담금 계산기</h3>
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
              const next = (v === "cognitive" ? "cognitive" : Number(v)) as LtciGrade;
              setGrade(next);
              if (typeof next === "number") setUsageAmount(HOME_CARE_MONTHLY_LIMIT[next]);
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

      {notEligible ? (
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-ink-500">
          인지지원등급은 시설급여(요양원 입소) 대상이 아니에요. 재가급여(방문요양·주야간보호)를
          이용해 주세요.
        </p>
      ) : serviceType === "home" ? (
        <>
          <div className="mb-4">
            <label className="mb-1 flex items-center text-xs font-semibold text-ink-700">
              이번 달 예상 이용금액(원)
              <InfoTooltip text={TOOLTIPS.homeBenefit} />
            </label>
            <input
              type="number"
              value={usageAmount}
              onChange={(e) => setUsageAmount(Number(e.target.value))}
              className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            />
          </div>

          {result?.kind === "home" && (
            <div className="space-y-4 rounded-xl bg-white p-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center text-ink-500">
                    월 한도액 사용률
                    <InfoTooltip text={TOOLTIPS.monthlyLimit} />
                  </span>
                  <span className="font-semibold text-ink-900">
                    {won(Math.min(usageAmount, result.limit))} / {won(result.limit)}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-ink-100">
                  <div
                    className="h-2.5 rounded-full bg-primary-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((usageAmount / result.limit) * 100))}%`,
                    }}
                  />
                </div>
                {result.overLimit > 0 && (
                  <p className="mt-1 text-[11px] font-medium text-accent-600">
                    한도를 {won(result.overLimit)} 초과했어요 — 초과분은 전액 본인부담이에요.
                  </p>
                )}
              </div>

              <CalcStepFlow
                steps={[
                  { label: "한도 내 이용액", value: won(result.withinLimit) },
                  { label: `본인부담률 ${Math.round(COPAY_RATE[tier].home * 100)}%`, value: "" },
                  { label: "한도 내 본인부담금", value: won(result.withinLimitCopay) },
                ]}
                operators={["×", "="]}
              />

              <div className="border-t border-ink-100 pt-3">
                <p className="mb-2 text-xs font-semibold text-ink-700">월 실제 예상금액 구성</p>
                <CostBreakdownBar
                  total={result.copay}
                  segments={[
                    {
                      label: "한도 내 본인부담금",
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

              <div className="rounded-xl bg-primary-50 px-4 py-3 text-center">
                <p className="text-xs text-ink-500">월 실제 예상금액</p>
                <p className="text-2xl font-extrabold text-primary-700">{won(result.copay)}</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">
                이용일수(일)
              </label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
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
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">월 간식비</label>
              <input
                type="number"
                value={snackCost}
                onChange={(e) => setSnackCost(Number(e.target.value))}
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              />
            </div>
          </div>

          {result?.kind === "facility" && (
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

              <div className="rounded-xl bg-primary-50 px-4 py-3 text-center">
                <p className="text-xs text-ink-500">월 실제 예상금액</p>
                <p className="text-2xl font-extrabold text-primary-700">{won(result.copay)}</p>
              </div>
            </div>
          )}
        </>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-ink-300">
        실제 청구 금액은 시설별 세부 산정 기준과 고시 개정에 따라 달라질 수 있는 예시
        계산이에요.
        <br />
        정확한 금액은 시설 또는 국민건강보험공단에 문의해 주세요.
      </p>
    </div>
  );
}
