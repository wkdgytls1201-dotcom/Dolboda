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
        <div
          // 모바일에서는 트리거 버튼 위치에 따라 296px짜리 패널이 화면 오른쪽으로
          // 잘려나가는 문제가 있어서(예: "평가등급"의 "2등급 이상" 잘림), 좁은 화면에선
          // 화면 기준 고정 위치(양옆 여백만 두고 중앙)로 띄우고, sm 이상에서만 원래대로
          // 트리거 버튼 아래 붙는 팝오버로 되돌린다.
          className="fixed inset-x-4 top-1/2 z-30 max-h-[70vh] -translate-y-1/2 overflow-y-auto rounded-2xl border border-ink-100 bg-white p-4 shadow-soft sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-64 sm:max-h-none sm:translate-y-0"
        >
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
  // 드롭다운 안에서 쓰는 알약형 선택지 — 평가등급과 같은 모양으로 통일한다.
  function FilterPill({
    label,
    selected,
    onClick,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
          selected
            ? "bg-primary-500 text-white"
            : "bg-ink-100/60 text-ink-500 hover:bg-ink-100"
        }`}
      >
        {label}
      </button>
    );
  }

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
          <div className="flex flex-wrap gap-1.5">
            {ALL_TYPES.map((type) => (
              <FilterPill
                key={type}
                label={FACILITY_TYPE_LABEL[type]}
                selected={filters.types.includes(type)}
                onClick={() => toggleType(type)}
              />
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
          <div className="flex flex-wrap gap-1.5">
            {DISTANCE_OPTIONS.map((opt) => (
              <FilterPill
                key={opt.label}
                label={opt.label}
                selected={filters.maxDistanceKm === opt.value}
                onClick={() => onChange({ ...filters, maxDistanceKm: opt.value })}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
            내 위치를 켜두면 실제 거리로 걸러져요.
          </p>
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
          {allDepartments.length > 0 ? (
            <>
              <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                {allDepartments.map((name) => (
                  <FilterPill
                    key={name}
                    label={name}
                    selected={filters.departments.includes(name)}
                    onClick={() => toggleDepartment(name)}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-300">요양병원에만 해당하는 항목이에요.</p>
            </>
          ) : (
            // 진료과목은 지금 목록에 있는 요양병원에서 뽑아온다. 요양병원이 하나도 없으면
            // 고를 게 없으므로, 빈 화면 대신 무엇을 하면 되는지 알려준다.
            <div className="rounded-xl bg-ink-100/40 p-3">
              <p className="mb-2 text-[11px] leading-relaxed text-ink-500">
                지금 목록에 요양병원이 없어 고를 진료과목이 없어요. 시설 유형에서 요양병원을
                선택하면 진료과목으로 좁힐 수 있어요.
              </p>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...filters, types: ["NURSING_HOSPITAL"], departments: [] })
                }
                className="w-full rounded-lg bg-primary-500 px-3 py-2 text-xs font-bold text-white transition-colors duration-150 hover:bg-primary-600 active:scale-95"
              >
                요양병원만 보기
              </button>
            </div>
          )}
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
