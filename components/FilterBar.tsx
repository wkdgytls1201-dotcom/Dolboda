"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  X,
  Building2,
  Award,
  Navigation,
  Stethoscope,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  BellPlus,
  ArrowDownUp,
  Loader2,
} from "lucide-react";
import { FACILITY_TYPE_LABEL, Facility, FacilityType, isHospital } from "@/lib/types";
import { InfoTooltip } from "./InfoTooltip";
import { TOOLTIPS } from "@/lib/tooltips";
import { PROGRAM_TAG_META, type ProgramTag } from "@/lib/programTaxonomy";
import { hasAnyFilter } from "@/lib/savedSearch";
import { AuthModal } from "./AuthModal";
import { BottomSheet } from "./BottomSheet";
import { useFacilities, useNearbyFacilities } from "@/lib/useFacilities";
import {
  EMPTY_FILTERS,
  filterFacilityList,
  type FacilityFilters,
  type FilterContext,
  type SearchSortKey,
} from "@/lib/facilityFilters";

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

const SORT_OPTIONS: { key: SearchSortKey; label: string }[] = [
  { key: "distance", label: "거리순" },
  { key: "grade", label: "등급순" },
  { key: "score", label: "안심지수순" },
];

// 타입·기본값·필터 함수는 lib/facilityFilters.ts에 있다(서버 코드와 공유).
// 기존 import 경로가 안 깨지게 여기서 재수출한다.
export type { FacilityFilters };
export { EMPTY_FILTERS };

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
      className={`flex min-h-[44px] items-center rounded-lg px-3.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
        selected ? "bg-primary-500 text-white" : "bg-ink-100/60 text-ink-500 hover:bg-ink-100"
      }`}
    >
      {label}
    </button>
  );
}

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
    <div className="border-b border-ink-100 py-4 first:pt-1 last:border-0">
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
  sortKey,
  onSortKeyChange,
  countCtx,
}: {
  /** 실제 목록에 "적용된" 조건 — 시트 안의 임시 조건과 구분된다 */
  filters: FacilityFilters;
  onChange: (next: FacilityFilters) => void;
  facilities: Facility[];
  resultCount: number;
  sortKey: SearchSortKey;
  onSortKeyChange: (k: SearchSortKey) => void;
  /** 임시 조건의 결과 수를 적용 전에 셈하기 위한 검색 화면 문맥 */
  countCtx: Omit<FilterContext, "sortKey">;
}) {
  const { data: session } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---- 임시(draft) 상태 — 시트를 여는 순간 적용 조건을 복사해 온다.
  // 시트 안에서 무엇을 바꾸든 목록은 그대로고, "N곳 보기"를 눌러야 적용된다.
  // 배경 탭·아래로 던지기·X로 닫으면 통째로 버려진다(다음에 열 때 다시 복사).
  const [draft, setDraft] = useState<FacilityFilters>(filters);
  const [draftSort, setDraftSort] = useState<SearchSortKey>(sortKey);

  function openSheet() {
    setDraft(filters);
    setDraftSort(sortKey);
    setSheetOpen(true);
  }

  // ---- 임시 조건 결과 수 ----
  // 유형·프로그램 태그는 서버 쿼리 범위라, 적용 조건과 달라지면 로드된 목록만으로는
  // 정확히 셀 수 없다(예: 요양병원만 로드된 상태에서 요양원을 고르면 데이터가 없다).
  // 그 경우에만 임시 범위로 가볍게 다시 받아와 세고, 같으면 이미 있는 목록으로 즉시 센다.
  const scopeDiffers =
    sheetOpen &&
    (draft.types.join(",") !== filters.types.join(",") ||
      draft.programTags.join(",") !== filters.programTags.join(","));

  const draftList = useFacilities({
    q: countCtx.query,
    limit: 300,
    types: draft.types,
    programTags: draft.programTags,
    enabled: scopeDiffers && !countCtx.useNearest,
    cardView: true,
  });
  const draftNearby = useNearbyFacilities(countCtx.origin.lat, countCtx.origin.lng, 300, {
    types: draft.types,
    enabled: scopeDiffers && countCtx.useNearest,
  });

  const draftBase = scopeDiffers
    ? countCtx.useNearest
      ? draftNearby.facilities
      : draftList.facilities
    : facilities;
  const countLoading =
    scopeDiffers && (countCtx.useNearest ? draftNearby.loading : draftList.loading);

  const draftCount = useMemo(
    () => filterFacilityList(draftBase, draft, { ...countCtx, sortKey: draftSort }).length,
    [draftBase, draft, draftSort, countCtx]
  );
  // 로딩 중엔 이전 숫자를 유지해 버튼 폭이 출렁이지 않게 한다
  const lastCountRef = useRef(draftCount);
  if (!countLoading) lastCountRef.current = draftCount;
  const shownCount = countLoading ? lastCountRef.current : draftCount;

  function applyDraft() {
    onChange(draft);
    if (draftSort !== sortKey) onSortKeyChange(draftSort);
    setSheetOpen(false);
  }

  async function saveSearch() {
    if (!session?.user) {
      setShowAuth(true);
      return;
    }
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveState("error");
        setSaveError(data?.error ?? "저장하지 못했어요.");
        return;
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setSaveError("저장하지 못했어요.");
    }
  }

  useEffect(() => {
    setSaveState("idle");
    setSaveError(null);
  }, [draft]);

  // ---- 임시 조건 조작 헬퍼 (전부 draft만 건드린다) ----
  function toggleDraftType(type: FacilityType) {
    setDraft((d) => ({
      ...d,
      types: d.types.includes(type) ? d.types.filter((t) => t !== type) : [...d.types, type],
    }));
  }
  const draftGradeThreshold = draft.grades.length > 0 ? Math.max(...draft.grades) : null;
  function setDraftGradeThreshold(n: number | null) {
    setDraft((d) => ({
      ...d,
      grades: n === null ? [] : Array.from({ length: n }, (_, i) => i + 1),
    }));
  }
  function toggleDraftProgramTag(tag: ProgramTag) {
    setDraft((d) => ({
      ...d,
      programTags: d.programTags.includes(tag)
        ? d.programTags.filter((t) => t !== tag)
        : [...d.programTags, tag],
    }));
  }
  function toggleDraftDepartment(name: string) {
    setDraft((d) => ({
      ...d,
      departments: d.departments.includes(name)
        ? d.departments.filter((x) => x !== name)
        : [...d.departments, name],
    }));
  }

  const allDepartments = useMemo(
    () =>
      Array.from(
        new Set(draftBase.filter(isHospital).flatMap((f) => f.departments.map((d) => d.name)))
      ).sort(),
    [draftBase]
  );

  // ---- 적용된 조건 칩 (시트 밖 — 즉시 적용/해제, 기존 동작 유지) ----
  const appliedGradeThreshold = filters.grades.length > 0 ? Math.max(...filters.grades) : null;
  const distanceLabel =
    DISTANCE_OPTIONS.find((d) => d.value === filters.maxDistanceKm)?.label ?? "전체";

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    filters.types.forEach((t) =>
      chips.push({
        key: `type-${t}`,
        label: FACILITY_TYPE_LABEL[t],
        onRemove: () => onChange({ ...filters, types: filters.types.filter((x) => x !== t) }),
      })
    );
    if (appliedGradeThreshold !== null) {
      chips.push({
        key: "grade",
        label: `${appliedGradeThreshold}등급 이상`,
        onRemove: () => onChange({ ...filters, grades: [] }),
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
      chips.push({
        key: `dept-${d}`,
        label: d,
        onRemove: () =>
          onChange({ ...filters, departments: filters.departments.filter((x) => x !== d) }),
      })
    );
    filters.programTags.forEach((t) =>
      chips.push({
        key: `prog-${t}`,
        label: PROGRAM_TAG_META[t].label,
        onRemove: () =>
          onChange({ ...filters, programTags: filters.programTags.filter((x) => x !== t) }),
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
    if (filters.hasPhotoOnly) {
      chips.push({
        key: "has-photo",
        label: "실사진 있는 곳만",
        onRemove: () => onChange({ ...filters, hasPhotoOnly: false }),
      });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const sheetFilterCount =
    filters.types.length +
    (appliedGradeThreshold !== null ? 1 : 0) +
    (filters.maxDistanceKm !== null ? 1 : 0) +
    filters.programTags.length +
    filters.departments.length +
    (filters.onlyVacancy ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.hasPhotoOnly ? 1 : 0);

  return (
    <div>
      <div className="flex items-center gap-2">
        {/* 안심지수 필터 — 돌보다만의 핵심 지표라 시트에 묻지 않고 항상 한 번의 탭으로 */}
        <button
          type="button"
          onClick={() => onChange({ ...filters, goodScoreOnly: !filters.goodScoreOnly })}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl pl-2 pr-3.5 text-sm font-extrabold transition-all duration-200 ease-snappy active:scale-95 ${
            filters.goodScoreOnly
              ? "animate-pop bg-gradient-to-r from-royal-500 to-primary-500 text-white shadow-royal"
              : "bg-gradient-to-r from-royal-50 to-primary-50 text-royal-700 shadow-soft ring-1 ring-inset ring-royal-200/70 hover:shadow-card-hover"
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              filters.goodScoreOnly ? "bg-white/25" : "bg-white"
            }`}
          >
            <ShieldCheck size={14} className={filters.goodScoreOnly ? "text-white" : "text-royal-500"} />
          </span>
          안심지수 우수만
        </button>

        <button
          type="button"
          onClick={openSheet}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl pl-2 pr-3.5 text-sm font-bold transition-all duration-200 ease-snappy active:scale-95 ${
            sheetFilterCount > 0
              ? "bg-primary-50 text-primary-700 shadow-soft ring-1 ring-inset ring-primary-200"
              : "bg-white text-ink-600 shadow-card hover:bg-ink-100/60"
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              sheetFilterCount > 0 ? "bg-primary-500 text-white" : "bg-ivory-100 text-ink-400"
            }`}
          >
            <SlidersHorizontal size={13} />
          </span>
          필터
          {sheetFilterCount > 0 && (
            <span className="animate-pop flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] font-extrabold text-white">
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

      <BottomSheet
        open={sheetOpen}
        onDismiss={() => setSheetOpen(false)}
        ariaLabel="시설 검색 필터"
        title={
          <div className="flex items-center justify-between px-5 pb-3 pt-1">
            <h2 className="text-base font-bold text-ink-900">필터</h2>
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setSheetOpen(false)}
              className="-mr-2.5 flex h-11 w-11 items-center justify-center rounded-full text-ink-300 transition-all duration-150 hover:bg-ink-100 hover:text-ink-700 active:scale-90 active:bg-ink-100"
            >
              <X size={18} />
            </button>
          </div>
        }
        footer={
          <>
            {hasAnyFilter(draft) && (
              <div className="border-b border-ink-100 px-5 py-3">
                <button
                  type="button"
                  onClick={saveSearch}
                  disabled={saveState === "saving" || saveState === "saved"}
                  className={`flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98] disabled:active:scale-100 ${
                    saveState === "saved"
                      ? "bg-mint-50 text-mint-700"
                      : "bg-royal-50 text-royal-700 hover:bg-royal-100"
                  }`}
                >
                  <BellPlus size={15} />
                  {saveState === "saving"
                    ? "저장하는 중..."
                    : saveState === "saved"
                      ? "저장했어요 — 새 시설이 뜨면 알려드려요"
                      : "이 조건 저장하고 새 시설 알림받기"}
                </button>
                {saveState === "error" && (
                  <p className="mt-1.5 text-center text-xs font-semibold text-primary-600">
                    {saveError}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => setDraft(EMPTY_FILTERS)}
                className="min-h-[48px] flex-1 rounded-xl border border-ink-100 text-sm font-bold text-ink-500 transition-all duration-150 hover:bg-ink-100/60 active:scale-[0.98]"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={applyDraft}
                disabled={!countLoading && shownCount === 0}
                className="flex min-h-[48px] flex-[2] items-center justify-center gap-1.5 rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400"
              >
                {countLoading && <Loader2 size={14} className="animate-spin" aria-hidden />}
                {shownCount === 0 && !countLoading
                  ? "조건에 맞는 시설이 없어요"
                  : `${shownCount.toLocaleString()}곳 보기`}
              </button>
            </div>
            {shownCount === 0 && !countLoading && (
              <p className="-mt-2 px-5 pb-3 text-center text-[11px] text-ink-400">
                조건을 일부 해제하면 결과가 나와요. 위에서 칩을 다시 눌러 풀어보세요.
              </p>
            )}
          </>
        }
      >
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
                selected={draft.types.includes(type)}
                onClick={() => toggleDraftType(type)}
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
                selected={draft.maxDistanceKm === opt.value}
                onClick={() => setDraft((d) => ({ ...d, maxDistanceKm: opt.value }))}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
            내 위치를 켜두면 실제 거리로 걸러져요.
          </p>
        </FilterSection>

        <FilterSection icon={<Award size={15} />} label="평가등급">
          <p className="mb-2 flex items-center text-[11px] text-ink-300">
            등급이 뭘 의미하나요?
            <InfoTooltip text={TOOLTIPS.gradeOneToFive} />
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              label="전체"
              selected={draftGradeThreshold === null}
              onClick={() => setDraftGradeThreshold(null)}
            />
            {[1, 2, 3, 4].map((n) => (
              <FilterPill
                key={n}
                label={`${n}등급 이상`}
                selected={draftGradeThreshold === n}
                onClick={() => setDraftGradeThreshold(n)}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection icon={<ShieldCheck size={15} />} label="돌보다 안심지수">
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              label="전체"
              selected={!draft.goodScoreOnly}
              onClick={() => setDraft((d) => ({ ...d, goodScoreOnly: false }))}
            />
            <FilterPill
              label="우수 이상만 (상위 25%)"
              selected={draft.goodScoreOnly}
              onClick={() => setDraft((d) => ({ ...d, goodScoreOnly: true }))}
            />
          </div>
        </FilterSection>

        <FilterSection icon={<ShieldCheck size={15} />} label="이용 가능 여부">
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              label="빈자리 있는 곳만"
              selected={draft.onlyVacancy}
              onClick={() => setDraft((d) => ({ ...d, onlyVacancy: !d.onlyVacancy }))}
            />
            <FilterPill
              label="공공데이터 확인 시설"
              selected={draft.verifiedOnly}
              onClick={() => setDraft((d) => ({ ...d, verifiedOnly: !d.verifiedOnly }))}
            />
            {/* 사진 없는 카드는 일러스트·로드뷰로 채워진다 — 보호자에게 "실제로 어떻게
                생겼는지 본 곳"과 "안 본 곳"은 판단의 무게가 다르다. 전국 사진을 채우는
                중이라(2026-08-06 기준 32%) 지금은 크게 좁히는 필터다. */}
            <FilterPill
              label="📷 실사진 있는 곳만"
              selected={draft.hasPhotoOnly}
              onClick={() => setDraft((d) => ({ ...d, hasPhotoOnly: !d.hasPhotoOnly }))}
            />
          </div>
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
                selected={draft.programTags.includes(tag)}
                onClick={() => toggleDraftProgramTag(tag)}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-300">요양원·주야간보호·방문요양에만 있는 정보예요.</p>
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
                    selected={draft.departments.includes(name)}
                    onClick={() => toggleDraftDepartment(name)}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-300">요양병원에만 해당하는 항목이에요.</p>
            </>
          ) : (
            <div className="rounded-xl bg-ink-100/40 p-3">
              <p className="mb-2 text-[11px] leading-relaxed text-ink-500">
                지금 목록에 요양병원이 없어 고를 진료과목이 없어요. 시설 유형에서 요양병원을
                선택하면 진료과목으로 좁힐 수 있어요.
              </p>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, types: ["NURSING_HOSPITAL"], departments: [] }))}
                className="w-full rounded-lg bg-primary-500 px-3 py-2 text-xs font-bold text-white transition-colors duration-150 hover:bg-primary-600 active:scale-95"
              >
                요양병원만 보기
              </button>
            </div>
          )}
        </FilterSection>

        <FilterSection icon={<ArrowDownUp size={15} />} label="정렬 기준">
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <FilterPill
                key={opt.key}
                label={opt.label}
                selected={draftSort === opt.key}
                onClick={() => setDraftSort(opt.key)}
              />
            ))}
          </div>
        </FilterSection>
      </BottomSheet>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
