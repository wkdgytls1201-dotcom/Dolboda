"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X, Building2, Award, Navigation, Stethoscope, ShieldCheck } from "lucide-react";
import { FACILITY_TYPE_LABEL, Facility, FacilityType, isHospital } from "@/lib/types";
import { InfoTooltip } from "./InfoTooltip";
import { TOOLTIPS } from "@/lib/tooltips";

const ALL_TYPES: FacilityType[] = [
  "NURSING_HOSPITAL",
  "NURSING_HOME",
  "DAY_NIGHT_CARE",
  "HOME_CARE",
  "SILVER_TOWN",
];

const DISTANCE_OPTIONS = [
  { label: "전체", value: null },
  { label: "3km 이내", value: 3 },
  { label: "10km 이내", value: 10 },
  { label: "50km 이내", value: 50 },
  { label: "100km 이내", value: 100 },
];

export interface FacilityFilters {
  types: FacilityType[];
  grades: number[];
  maxDistanceKm: number | null;
  departments: string[];
  onlyVacancy: boolean;
  verifiedOnly: boolean;
}

export const EMPTY_FILTERS: FacilityFilters = {
  types: [],
  grades: [],
  maxDistanceKm: null,
  departments: [],
  onlyVacancy: false,
  verifiedOnly: false,
};

function FilterDropdown({
  label,
  icon,
  count,
  active,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ${
          active
            ? "bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200"
            : "text-ink-500 hover:bg-ink-100/60"
        }`}
      >
        <span className={active ? "text-primary-500" : "text-ink-300"}>{icon}</span>
        {label}
        {!!count && (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          {children}
        </div>
      )}
    </div>
  );
}

export function FilterBar({
  filters,
  onChange,
  facilities,
}: {
  filters: FacilityFilters;
  onChange: (next: FacilityFilters) => void;
  facilities: Facility[];
}) {
  const allDepartments = useMemo(
    () =>
      Array.from(
        new Set(facilities.filter(isHospital).flatMap((f) => f.departments.map((d) => d.name)))
      ).sort(),
    [facilities]
  );

  function toggleType(type: FacilityType) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onChange({ ...filters, types: next });
  }

  // "N등급 이상"(caredoc과 달리 연속 임계값 하나만 고르는 방식) — grades 배열엔 [1..N]을 그대로 담아
  // 검색 페이지의 기존 includes() 필터 로직을 바꾸지 않고도 재사용한다.
  const gradeThreshold = filters.grades.length > 0 ? Math.max(...filters.grades) : null;
  function setGradeThreshold(n: number | null) {
    onChange({ ...filters, grades: n === null ? [] : Array.from({ length: n }, (_, i) => i + 1) });
  }

  function toggleDepartment(name: string) {
    const next = filters.departments.includes(name)
      ? filters.departments.filter((d) => d !== name)
      : [...filters.departments, name];
    onChange({ ...filters, departments: next });
  }

  const distanceLabel =
    DISTANCE_OPTIONS.find((d) => d.value === filters.maxDistanceKm)?.label ?? "전체";

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    filters.types.forEach((t) =>
      chips.push({
        key: `type-${t}`,
        label: FACILITY_TYPE_LABEL[t],
        onRemove: () => toggleType(t),
      })
    );
    if (gradeThreshold !== null) {
      chips.push({
        key: "grade",
        label: `${gradeThreshold}등급 이상`,
        onRemove: () => setGradeThreshold(null),
      });
    }
    if (filters.maxDistanceKm !== null) {
      chips.push({
        key: "distance",
        label: distanceLabel,
        onRemove: () => onChange({ ...filters, maxDistanceKm: null }),
      });
    }
    filters.departments.forEach((d) =>
      chips.push({ key: `dept-${d}`, label: d, onRemove: () => toggleDepartment(d) })
    );
    if (filters.onlyVacancy) {
      chips.push({
        key: "vacancy",
        label: "빈자리 있는 곳만",
        onRemove: () => onChange({ ...filters, onlyVacancy: false }),
      });
    }
    if (filters.verifiedOnly) {
      chips.push({
        key: "verified",
        label: "공공데이터 확인 시설",
        onRemove: () => onChange({ ...filters, verifiedOnly: false }),
      });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-ink-100/40 p-1.5">
        <FilterDropdown
          label="시설 유형"
          icon={<Building2 size={15} />}
          count={filters.types.length}
          active={filters.types.length > 0}
        >
          <p className="mb-2 flex items-center text-[11px] text-ink-300">
            시설 유형이 헷갈리시나요?
            <InfoTooltip text={TOOLTIPS.facilityTypes} />
          </p>
          <div className="space-y-2">
            {ALL_TYPES.map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2 text-sm text-ink-700"
              >
                <input
                  type="checkbox"
                  checked={filters.types.includes(type)}
                  onChange={() => toggleType(type)}
                  className="h-4 w-4 rounded accent-primary-500"
                />
                {FACILITY_TYPE_LABEL[type]}
              </label>
            ))}
          </div>
        </FilterDropdown>

        <FilterDropdown
          label="평가등급"
          icon={<Award size={15} />}
          active={gradeThreshold !== null}
        >
          <p className="mb-2 flex items-center text-[11px] text-ink-300">
            등급이 뭘 의미하나요?
            <InfoTooltip text={TOOLTIPS.gradeOneToFive} />
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGradeThreshold(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                gradeThreshold === null
                  ? "bg-primary-500 text-white"
                  : "bg-ink-100/60 text-ink-500 hover:bg-ink-100"
              }`}
            >
              전체
            </button>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setGradeThreshold(n)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  gradeThreshold === n
                    ? "bg-primary-500 text-white"
                    : "bg-ink-100/60 text-ink-500 hover:bg-ink-100"
                }`}
              >
                {n}등급 이상
              </button>
            ))}
          </div>
        </FilterDropdown>

        <FilterDropdown
          label="거리"
          icon={<Navigation size={15} />}
          active={filters.maxDistanceKm !== null}
        >
          <div className="space-y-2">
            {DISTANCE_OPTIONS.map((opt) => (
              <label
                key={opt.label}
                className="flex cursor-pointer items-center gap-2 text-sm text-ink-700"
              >
                <input
                  type="radio"
                  name="distance"
                  checked={filters.maxDistanceKm === opt.value}
                  onChange={() => onChange({ ...filters, maxDistanceKm: opt.value })}
                  className="h-4 w-4 accent-primary-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </FilterDropdown>

        <FilterDropdown
          label="진료과목"
          icon={<Stethoscope size={15} />}
          count={filters.departments.length}
          active={filters.departments.length > 0}
        >
          <p className="mb-2 flex items-center text-[11px] text-ink-300">
            진료과목이 뭔가요?
            <InfoTooltip text={TOOLTIPS.departments} />
          </p>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {allDepartments.map((name) => (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2 text-sm text-ink-700"
              >
                <input
                  type="checkbox"
                  checked={filters.departments.includes(name)}
                  onChange={() => toggleDepartment(name)}
                  className="h-4 w-4 rounded accent-primary-500"
                />
                {name}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-300">요양병원에만 해당하는 항목이에요.</p>
        </FilterDropdown>

        <span className="mx-0.5 h-5 w-px shrink-0 bg-ink-100" />

        <button
          type="button"
          onClick={() => onChange({ ...filters, onlyVacancy: !filters.onlyVacancy })}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-150 active:scale-95 ${
            filters.onlyVacancy
              ? "bg-mint-500 text-white"
              : "text-ink-500 hover:bg-ink-100/60"
          }`}
        >
          빈자리 있는 곳만
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...filters, verifiedOnly: !filters.verifiedOnly })}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-150 active:scale-95 ${
            filters.verifiedOnly
              ? "bg-primary-500 text-white"
              : "text-ink-500 hover:bg-ink-100/60"
          }`}
        >
          <ShieldCheck size={15} className={filters.verifiedOnly ? "text-white" : "text-mint-500"} />
          공공데이터 확인 시설
        </button>

        {activeChips.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-ink-300 transition-colors duration-150 hover:text-ink-700"
          >
            초기화
          </button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-1 rounded-lg bg-primary-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary-700"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`${chip.label} 필터 제거`}
                onClick={chip.onRemove}
                className="rounded-full p-0.5 transition-colors duration-150 hover:bg-primary-100 active:scale-90"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
