"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  X,
  Building2,
  Award,
  Navigation,
  Stethoscope,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FACILITY_TYPE_LABEL, Facility, FacilityType, isHospital } from "@/lib/types";
import { InfoTooltip } from "./InfoTooltip";
import { TOOLTIPS } from "@/lib/tooltips";
import { PROGRAM_TAG_META, type ProgramTag } from "@/lib/programTaxonomy";

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
  /** 프로그램 태그 — 공단 프로그램 12만 건을 분류해 만든 필터 */
  programTags: ProgramTag[];
  /** 안심지수 70점(우수) 이상만 — 돌보다의 핵심 지표를 필터 첫 자리에 내세운다 */
  goodScoreOnly: boolean;
}

export const EMPTY_FILTERS: FacilityFilters = {
  types: [],
  grades: [],
  maxDistanceKm: null,
  departments: [],
  onlyVacancy: false,
  verifiedOnly: false,
  programTags: [],
  goodScoreOnly: false,
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
  // 필터 줄은 모바일에서 7개가 한 줄에 안 들어가 옆으로 밀어야 한다(줄바꿈은 아래 주석 참고).
  // 문제는 밀 수 있다는 걸 알 방법이 없다는 것 — 매니저 메뉴·활동지역 탭에서 겪은 것과 같다.
  // 오른쪽 끝을 흐리게 해서 "더 있다"를 알리고, 끝까지 밀면 흐림을 없앤다.
  // 배경색 위에 덧그리는 대신 마스크로 처리해서, 이 줄이 어떤 배경 위에 있든 맞아떨어진다.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMoreRight, setHasMoreRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setHasMoreRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 8);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

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

  function toggleProgramTag(tag: ProgramTag) {
    const next = filters.programTags.includes(tag)
      ? filters.programTags.filter((t) => t !== tag)
      : [...filters.programTags, tag];
    onChange({ ...filters, programTags: next });
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
    filters.programTags.forEach((t) =>
      chips.push({
        key: `prog-${t}`,
        label: PROGRAM_TAG_META[t].label,
        onRemove: () => toggleProgramTag(t),
      })
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
    if (filters.goodScoreOnly) {
      chips.push({
        key: "good-score",
        label: "안심지수 우수만",
        onRemove: () => onChange({ ...filters, goodScoreOnly: false }),
      });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div>
      {/* 모바일에서는 줄바꿈 대신 옆으로 밀어보게 한다.
          7개 필터가 3줄로 접히면 목록이 보이기도 전에 화면 절반을 필터가 차지한다.
          대신 오른쪽 끝에 옅은 그라데이션을 덮어 "더 있다"를 알린다(위 hasMoreRight 참고).
          스크롤 박스 자체에 mask를 걸면 안 된다 — 안쪽 드롭다운 패널이 position:fixed로
          overflow 클리핑을 빠져나가는 구조라, containing block이 생기면 패널이 잘린다.
          그래서 형제 오버레이로 얹는다(relative는 fixed에 영향이 없다). */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="-mx-1 flex items-center gap-1 overflow-x-auto rounded-2xl bg-ink-100/40 p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
        {/* 안심지수 필터 — 돌보다만의 핵심 지표라 필터 줄 맨 앞, 항상 테두리가 있는
            도드라진 모양으로 둔다(다른 필터와 달리 꺼져 있어도 눈에 들어오게) */}
        <button
          type="button"
          onClick={() => onChange({ ...filters, goodScoreOnly: !filters.goodScoreOnly })}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-all duration-150 active:scale-95 ${
            filters.goodScoreOnly
              ? "bg-gradient-to-r from-royal-500 to-primary-500 text-white shadow-soft"
              : "bg-white text-royal-600 ring-1 ring-inset ring-royal-200 hover:bg-royal-50"
          }`}
        >
          <ShieldCheck size={15} className={filters.goodScoreOnly ? "text-white" : "text-royal-500"} />
          안심지수 우수만
        </button>

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
          label="프로그램"
          icon={<Sparkles size={15} />}
          count={filters.programTags.length}
          active={filters.programTags.length > 0}
        >
          <p className="mb-2 text-[11px] leading-relaxed text-ink-300">
            공단에 등록된 프로그램 12만 건을 분류했어요. 어르신께 필요한 활동으로 골라보세요.
          </p>
          <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
            {(Object.keys(PROGRAM_TAG_META) as ProgramTag[]).map((tag) => (
              <FilterPill
                key={tag}
                label={`${PROGRAM_TAG_META[tag].emoji} ${PROGRAM_TAG_META[tag].label}`}
                selected={filters.programTags.includes(tag)}
                onClick={() => toggleProgramTag(tag)}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-300">
            요양원·주야간보호·방문요양에만 있는 정보예요.
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

        {hasMoreRight && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-9 rounded-r-2xl bg-gradient-to-l from-[#F5F4F9] to-transparent sm:hidden"
          />
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-0.5 rounded-lg bg-primary-50 py-0.5 pl-2.5 pr-0.5 text-xs font-medium text-primary-700"
            >
              {chip.label}
              {/* X 버튼이 12px이라 손가락으로 누르기 어려워서 여백으로 영역을 넓혔다 */}
              <button
                type="button"
                aria-label={`${chip.label} 필터 제거`}
                onClick={chip.onRemove}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-primary-100 active:scale-90"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
