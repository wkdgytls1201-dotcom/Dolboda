"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Building2,
  Award,
  Navigation,
  Stethoscope,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
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

// 드롭다운 안에서 쓰는 알약형 선택지 — 모든 섹션이 같은 모양을 공유한다.
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

// 시트 안의 한 묶음 — 아이콘+라벨 제목과 그 아래 내용(주로 FilterPill 그리드).
function FilterSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-ink-100 py-4 first:pt-0 last:border-0">
      <p className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-ink-900">
        <span className="text-ink-400">{icon}</span>
        {label}
      </p>
      {children}
    </div>
  );
}

export function FilterBar({
  filters,
  onChange,
  facilities,
  resultCount,
}: {
  filters: FacilityFilters;
  onChange: (next: FacilityFilters) => void;
  facilities: Facility[];
  /** 지금 필터 조건으로 몇 건이 남는지 — 시트 하단 버튼에 실시간으로 보여준다 */
  resultCount: number;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // 시트가 떠 있는 동안 배경 스크롤 잠금 (ApplyConfirmSheet와 같은 패턴)
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

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

  // 필터 버튼 배지 — 시트 안에서 바꿀 수 있는 조건만 센다. 안심지수 우수만은 시트
  // 밖에 자체 토글이 있어 거기서 이미 켜짐/꺼짐이 보이므로 중복해서 세지 않는다.
  const sheetFilterCount =
    filters.types.length +
    (gradeThreshold !== null ? 1 : 0) +
    (filters.maxDistanceKm !== null ? 1 : 0) +
    filters.programTags.length +
    filters.departments.length +
    (filters.onlyVacancy ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0);

  return (
    <div>
      <div className="flex items-center gap-2">
        {/* 안심지수 필터 — 돌보다만의 핵심 지표라 시트 안에 묻지 않고 항상 한 번의
            탭으로 켤 수 있게 밖에 둔다(꺼져 있어도 눈에 띄는 톤) */}
        <button
          type="button"
          onClick={() => onChange({ ...filters, goodScoreOnly: !filters.goodScoreOnly })}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-all duration-150 active:scale-95 ${
            filters.goodScoreOnly
              ? "bg-gradient-to-r from-royal-500 to-primary-500 text-white shadow-soft"
              : "bg-white text-royal-600 shadow-card ring-1 ring-inset ring-royal-200 hover:bg-royal-50"
          }`}
        >
          <ShieldCheck size={15} className={filters.goodScoreOnly ? "text-white" : "text-royal-500"} />
          안심지수 우수만
        </button>

        {/* 나머지 조건은 전부 이 버튼 하나로 — 예전엔 7개 드롭다운이 가로로 늘어서
            좁은 화면에서 옆으로 밀어야만 나머지가 보였다. 하나로 모으고 활성 개수만
            배지로 보여주면, 안 눌러본 사람도 "여기 더 있다"를 바로 안다. */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ${
            sheetFilterCount > 0
              ? "bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200"
              : "bg-white text-ink-500 shadow-card hover:bg-ink-100/60"
          }`}
        >
          <SlidersHorizontal size={15} className={sheetFilterCount > 0 ? "text-primary-500" : "text-ink-300"} />
          필터
          {sheetFilterCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white">
              {sheetFilterCount}
            </span>
          )}
        </button>
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

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setSheetOpen(false)}
            className="animate-overlay-in absolute inset-0 bg-ink-900/50 backdrop-blur-[2px]"
          />
          {/* 모바일에서는 진짜 바텀시트, 데스크톱(sm:)에서는 중앙 카드 — ApplyConfirmSheet와 같은 패턴 */}
          <div className="animate-slide-up relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-card-hover sm:max-h-[80vh] sm:rounded-3xl">
            <div className="flex shrink-0 items-center justify-between border-b border-ink-100 px-5 py-4">
              <h2 className="text-base font-bold text-ink-900">필터</h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setSheetOpen(false)}
                className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-300 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              <FilterSection icon={<Building2 size={15} />} label="시설 유형">
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
              </FilterSection>

              <FilterSection icon={<Award size={15} />} label="평가등급">
                <p className="mb-2 flex items-center text-[11px] text-ink-300">
                  등급이 뭘 의미하나요?
                  <InfoTooltip text={TOOLTIPS.gradeOneToFive} />
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <FilterPill label="전체" selected={gradeThreshold === null} onClick={() => setGradeThreshold(null)} />
                  {[1, 2, 3, 4].map((n) => (
                    <FilterPill
                      key={n}
                      label={`${n}등급 이상`}
                      selected={gradeThreshold === n}
                      onClick={() => setGradeThreshold(n)}
                    />
                  ))}
                </div>
              </FilterSection>

              <FilterSection icon={<Navigation size={15} />} label="거리">
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
              </FilterSection>

              <FilterSection icon={<Sparkles size={15} />} label="프로그램">
                <p className="mb-2 text-[11px] leading-relaxed text-ink-300">
                  공단에 등록된 프로그램 12만 건을 분류했어요. 어르신께 필요한 활동으로 골라보세요.
                </p>
                <div className="flex flex-wrap gap-1.5">
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
              </FilterSection>

              <FilterSection icon={<Stethoscope size={15} />} label="진료과목">
                <p className="mb-2 flex items-center text-[11px] text-ink-300">
                  진료과목이 뭔가요?
                  <InfoTooltip text={TOOLTIPS.departments} />
                </p>
                {allDepartments.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
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
              </FilterSection>

              <FilterSection icon={<ShieldCheck size={15} />} label="추가 조건">
                <div className="flex flex-wrap gap-1.5">
                  <FilterPill
                    label="빈자리 있는 곳만"
                    selected={filters.onlyVacancy}
                    onClick={() => onChange({ ...filters, onlyVacancy: !filters.onlyVacancy })}
                  />
                  <FilterPill
                    label="공공데이터 확인 시설"
                    selected={filters.verifiedOnly}
                    onClick={() => onChange({ ...filters, verifiedOnly: !filters.verifiedOnly })}
                  />
                </div>
              </FilterSection>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-ink-100 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="min-h-[48px] flex-1 rounded-xl border border-ink-100 text-sm font-bold text-ink-500 transition-colors duration-150 hover:bg-ink-100/60"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="min-h-[48px] flex-[2] rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
              >
                {resultCount.toLocaleString()}개 시설 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
