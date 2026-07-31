"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { NonCoveredFee } from "@/lib/types";

function won(n: number) {
  return `${Math.round(n).toLocaleString()}원`;
}

function range(min: number, max: number) {
  return min === max ? won(min) : `${won(min)} ~ ${won(max)}`;
}

function chipClass(active: boolean) {
  return `min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition ${
    active
      ? "border-primary-500 bg-primary-500 text-white"
      : "border-ink-100 bg-white text-ink-700 hover:border-primary-300"
  }`;
}

export function HospitalCostEstimator({ fees }: { fees: NonCoveredFee[] }) {
  const careFee = useMemo(
    () => fees.find((f) => f.name.includes("간병") && f.min > 10000),
    [fees]
  );
  // 병실료 명칭이 병원마다 제각각(상급병실료·병실차액·1인실료 등)이라 넓게 잡되 소액 증명서류는 제외
  const roomFees = useMemo(
    () => fees.filter((f) => /[인병]실|병상/.test(f.name) && f.max >= 5000).slice(0, 6),
    [fees]
  );

  const [days, setDays] = useState(30);
  // -1 = 일반병실(건강보험 적용). 간병비 데이터가 없으면 병실차액이라도 보이게 첫 상급병실을 기본 선택
  const [roomIdx, setRoomIdx] = useState(() =>
    fees.some((f) => f.name.includes("간병") && f.min > 10000) ? -1 : 0
  );

  if (!careFee && roomFees.length === 0) return null;

  const room = roomIdx >= 0 ? roomFees[roomIdx] ?? null : null;
  const careMin = careFee ? careFee.min * days : 0;
  const careMax = careFee ? careFee.max * days : 0;
  const roomMin = room ? room.min * days : 0;
  const roomMax = room ? room.max * days : 0;

  return (
    <div className="rounded-2xl bg-primary-50/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calculator size={18} className="text-primary-600" />
        <h3 className="text-sm font-bold text-ink-900">월 실부담 시뮬레이터 — 비급여</h3>
      </div>

      <div className="mb-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-700">입원일수(일)</label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-base focus:border-primary-400 focus:outline-none sm:max-w-[200px]"
          />
        </div>

        {roomFees.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">병실 선택</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setRoomIdx(-1)} className={chipClass(roomIdx === -1)}>
                일반병실
              </button>
              {roomFees.map((f, i) => (
                <button
                  key={`${f.name}-${i}`}
                  type="button"
                  onClick={() => setRoomIdx(i)}
                  className={chipClass(roomIdx === i)}
                >
                  {f.name.match(/\d인실/)?.[0] ?? "상급병실"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4">
        {careFee && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <span className="text-ink-700">
              간병비 <span className="text-xs text-ink-300">(1일 {range(careFee.min, careFee.max)})</span>
            </span>
            <span className="font-semibold text-ink-900">{range(careMin, careMax)}</span>
          </div>
        )}
        {room && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <span className="text-ink-700">
              {room.name} <span className="text-xs text-ink-300">(1일 {range(room.min, room.max)})</span>
            </span>
            <span className="font-semibold text-ink-900">{range(roomMin, roomMax)}</span>
          </div>
        )}
        {careMax + roomMax > 0 ? (
          <div className="rounded-xl bg-primary-50 px-4 py-3 text-center">
            <p className="text-xs text-ink-500">월 비급여 예상금액 ({days}일 기준)</p>
            <p className="text-2xl font-extrabold text-primary-700">
              {range(careMin + roomMin, careMax + roomMax)}
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-ink-100/40 px-4 py-3 text-sm text-ink-500">
            일반병실은 건강보험이 적용돼 병실료 차액이 없어요. 상급병실을 선택하면 예상 차액을
            보여드려요.
          </p>
        )}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-ink-300">
        이 시설이 공공데이터에 등록한 비급여 금액 기준의 예시 계산이에요. 진료비·입원료 등
        건강보험 적용 항목은 진료 내용에 따라 달라 포함하지 않았어요.
        <br />
        정확한 금액은 병원에 직접 문의해 주세요.
      </p>
    </div>
  );
}
