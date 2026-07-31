"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Crown, Plus, X } from "lucide-react";
import { useFacilitiesByIds } from "@/lib/useFacilities";
import { Facility, FACILITY_TYPE_LABEL, isHospital } from "@/lib/types";
import { GradeBadge, TypeBadge, NHIS_GRADE_LETTER } from "@/components/GradeBadge";
import { useCompare } from "@/lib/compareContext";
import { useViewGate } from "@/lib/viewGateContext";

interface CompareRow {
  label: string;
  getValue: (f: Facility) => string;
  getScore: (f: Facility) => number | null;
  better: "higher" | "lower";
}

const ROWS: CompareRow[] = [
  {
    label: "평가등급",
    getValue: (f) =>
      f.grade === null
        ? "등급 제외"
        : f.gradeSource === "NHIS"
        ? `${NHIS_GRADE_LETTER[f.grade - 1] ?? f.grade}등급`
        : `${f.grade}등급`,
    getScore: (f) => f.grade,
    better: "lower",
  },
  {
    label: "설립연차",
    getValue: (f) =>
      f.establishedYear === undefined
        ? "정보 없음"
        : `${new Date().getFullYear() - f.establishedYear}년차`,
    getScore: (f) => (f.establishedYear === undefined ? null : new Date().getFullYear() - f.establishedYear),
    better: "lower",
  },
  {
    label: "병상수 / 정원",
    getValue: (f) =>
      isHospital(f)
        ? `${f.facilityStatus.generalBeds + f.facilityStatus.upgradeBeds}병상`
        : `${f.capacity}명`,
    getScore: (f) => (isHospital(f) ? f.facilityStatus.generalBeds + f.facilityStatus.upgradeBeds : f.capacity),
    better: "higher",
  },
  {
    label: "의사 인력 등급",
    getValue: (f) => (isHospital(f) ? `${f.doctorGrade}등급` : "-"),
    getScore: (f) => (isHospital(f) ? f.doctorGrade : null),
    better: "lower",
  },
  {
    label: "간호 인력 등급",
    getValue: (f) => (isHospital(f) ? `${f.nurseGrade}등급` : "-"),
    getScore: (f) => (isHospital(f) ? f.nurseGrade : null),
    better: "lower",
  },
  {
    label: "응급실(주간/야간)",
    getValue: (f) =>
      isHospital(f)
        ? `${f.emergencyRoom.day ? "운영" : "미운영"} / ${f.emergencyRoom.night ? "운영" : "미운영"}`
        : "-",
    getScore: (f) =>
      isHospital(f) ? Number(f.emergencyRoom.day) + Number(f.emergencyRoom.night) : null,
    better: "higher",
  },
  {
    label: "의료장비 종류",
    getValue: (f) => (isHospital(f) ? `${f.equipment.length}종` : "-"),
    getScore: (f) => (isHospital(f) ? f.equipment.length : null),
    better: "higher",
  },
  {
    label: "요양보호사/간병 인력",
    getValue: (f) => (!isHospital(f) ? `${f.staff.careWorkers}명` : "-"),
    getScore: (f) => (!isHospital(f) ? f.staff.careWorkers : null),
    better: "higher",
  },
  {
    label: "월 식대",
    getValue: (f) => {
      if (isHospital(f)) return "-";
      const meal = f.nonCoveredFees.find((fee) => fee.name.includes("식재료") || fee.name.includes("식비"));
      return meal ? `${meal.monthly.toLocaleString()}원` : "-";
    },
    getScore: (f) => {
      if (isHospital(f)) return null;
      const meal = f.nonCoveredFees.find((fee) => fee.name.includes("식재료") || fee.name.includes("식비"));
      return meal ? meal.monthly : null;
    },
    better: "lower",
  },
  {
    label: "주차",
    getValue: (f) => (f.parking ? `${f.parking.spots}대 · ${f.parking.isFree ? "무료" : "유료"}` : "정보 없음"),
    getScore: (f) => f.parking?.spots ?? null,
    better: "higher",
  },
];

function bestIds(row: CompareRow, facilities: Facility[]): Set<string> {
  const scored = facilities
    .map((f) => ({ id: f.id, score: row.getScore(f) }))
    .filter((x) => x.score !== null) as { id: string; score: number }[];
  if (scored.length < 2) return new Set();
  const best =
    row.better === "higher"
      ? Math.max(...scored.map((x) => x.score))
      : Math.min(...scored.map((x) => x.score));
  const allSame = scored.every((x) => x.score === scored[0].score);
  if (allSame) return new Set();
  return new Set(scored.filter((x) => x.score === best).map((x) => x.id));
}

function CompareContent() {
  const params = useSearchParams();
  const idsParam = params.get("ids") ?? "";
  const { selectedIds, maxCompare, toggle } = useCompare();
  const { requestFacilityView } = useViewGate();

  // ?ids=... 로 들어온 경우 URL은 그대로라 X를 눌러도 목록이 안 줄었다.
  // 제거한 id를 따로 기억해 화면에서도 즉시 빠지게 한다.
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  function handleRemove(id: string) {
    toggle(id);
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  const ids = (idsParam ? idsParam.split(",").filter(Boolean) : selectedIds).filter(
    (id) => !removedIds.includes(id)
  );
  const { facilities: fetched, loading } = useFacilitiesByIds(ids);
  // ids 순서(비교함에 담은 순서)를 그대로 유지
  const facilities = ids
    .map((id) => fetched.find((f) => f.id === id))
    .filter((f): f is Facility => !!f);

  const hasMixedTypes =
    facilities.some((f) => isHospital(f)) && facilities.some((f) => !isHospital(f));

  const emptySlots = Math.max(0, maxCompare - facilities.length);

  // fetched가 아직 안 온 상태에서 "비교할 시설이 없어요"가 잠깐 잘못 뜨는 걸 막는다.
  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8" />;
  }

  if (facilities.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">비교할 시설이 없어요</h1>
        <p className="mb-6 text-sm text-ink-500">
          시설 찾기에서 2~3개 시설을 선택하면 나란히 비교할 수 있어요.
        </p>
        <Link
          href="/search"
          className="inline-block rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
        >
          시설 찾으러 가기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-xl font-bold text-ink-900">시설 비교하기</h1>
      <p className="mb-6 indent-[-1rem] pl-4 text-sm text-ink-500">
        최대 {maxCompare}개까지 나란히 비교할 수 있어요. 항목별로 더 나은 쪽에는 왕관 표시가
        붙어요.
      </p>

      {hasMixedTypes && (
        <div className="mb-5 rounded-xl bg-accent-50 px-4 py-3 text-sm text-ink-700">
          시설 유형이 서로 달라 일부 항목(의료 관련 지표)은 공통 비교 기준이 아닐 수 있어요.
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {facilities.map((f, idx) => (
          <div
            key={f.id}
            // 모바일은 카드 하나가 화면을 거의 꽉 채워서 옆으로 스와이프해야 하는 걸 모르고
            // 넘어갈 수 있다. 다음 카드가 살짝 걸쳐 보이게 1.2~1.5장 정도 노출되는 너비로.
            className="w-[72vw] shrink-0 rounded-2xl border border-ink-100 bg-white p-5 shadow-card-hover transition hover:-translate-y-0.5 hover:shadow-soft sm:w-72"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                {idx + 1}
              </span>
              <button
                type="button"
                aria-label="비교에서 제거"
                onClick={() => handleRemove(f.id)}
                className="rounded-full p-1 text-ink-300 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-700 active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-2 flex flex-wrap gap-1.5">
              <TypeBadge type={f.facilityType} label={FACILITY_TYPE_LABEL[f.facilityType]} />
              <GradeBadge grade={f.grade} gradeSource={f.gradeSource} />
            </div>

            <Link
              href={`/facility/${f.id}`}
              onClick={(e) => {
                e.preventDefault();
                requestFacilityView(f.id);
              }}
              className="mb-4 block"
            >
              {/* 띄어쓰기 없는 긴 시설명(예: 시립서대문노인종합복지관데이케어센터)이
                  카드 밖으로 넘치지 않게 강제로 줄바꿈한다 (body의 keep-all 예외) */}
              <h3 className="text-base font-bold text-ink-900 [overflow-wrap:anywhere] hover:text-primary-600">
                {f.name}
              </h3>
              <p className="mt-0.5 text-xs text-ink-500 [overflow-wrap:anywhere]">{f.address}</p>
            </Link>

            <div className="space-y-3 border-t border-ink-100 pt-3">
              {ROWS.map((row) => {
                const value = row.getValue(f);
                if (value === "-") return null;
                const isBest = bestIds(row, facilities).has(f.id);
                return (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 ${
                      isBest ? "bg-primary-50 ring-1 ring-inset ring-primary-200" : ""
                    }`}
                  >
                    <span className={`text-xs ${isBest ? "font-semibold text-primary-600" : "text-ink-300"}`}>
                      {row.label}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-right ${
                        isBest
                          ? "text-base font-extrabold text-primary-700"
                          : "text-sm font-semibold text-ink-700"
                      }`}
                    >
                      {isBest && <Crown size={14} className="shrink-0 text-accent-400" fill="currentColor" />}
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>

            <Link
              href={`/facility/${f.id}`}
              onClick={(e) => {
                e.preventDefault();
                requestFacilityView(f.id);
              }}
              className="mt-4 block rounded-xl border border-primary-300 py-2 text-center text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              상세보기
            </Link>
          </div>
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <Link
            key={`empty-${i}`}
            href="/search"
            className="flex w-[72vw] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-100 py-16 text-ink-300 hover:border-primary-300 hover:text-primary-500 sm:w-72"
          >
            <Plus size={28} />
            <span className="text-sm font-semibold">시설 추가하기</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareContent />
    </Suspense>
  );
}
