"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Check, HeartHandshake, Building2 } from "lucide-react";
import { REGIONS } from "@/lib/regions";
import { HOUSEHOLD_TASKS } from "@/lib/householdTasks";
import { LOCATION_TYPES, type LocationTypeValue } from "@/lib/careLocationTypes";
import {
  RECIPIENT_RELATIONS,
  RECIPIENT_GENDERS,
  AGE_BANDS,
  WEIGHT_BANDS,
  MOBILITY_LEVELS,
  MEAL_ASSIST_LEVELS,
  TOILET_ASSIST_LEVELS,
  MEDICAL_ONLY_OPTIONS,
  HOSPITAL_ENTRY_OPTIONS,
  ROOM_TYPES,
  ADMISSION_REASONS,
  SURGERY_PLANS,
  CONDITION_SUGGESTIONS,
  SPECIAL_REQUESTS,
  GENDER_PREFS,
  BUDGET_UNITS,
  TIME_OPTIONS,
} from "@/lib/careOptions";
import {
  EMPTY_FORM,
  formFromRequest,
  formFromTemplate,
  type CareRequestData,
  type CareRequestForm,
} from "@/lib/careRequestTypes";
import {
  FieldLabel,
  ChipSelect,
  ChipMultiSelect,
  TextInput,
  SelectInput,
  NoticeBox,
} from "./CareFormFields";
import { DateRangeCalendar } from "./DateRangeCalendar";
import { useCareProfiles, type CareProfileSummary } from "@/lib/careProfileContext";

const STEPS = [
  "어떤 돌봄이 필요하세요",
  "언제, 어디서 필요하세요",
  "누구를 돌봐드릴까요",
  "어떤 도움이 필요하세요",
  "마지막으로 확인해주세요",
];

interface HospitalSuggestion {
  id: string;
  name: string;
  address: string;
}

// 병원 간병일 때만 쓰는 자세한 장소 입력 — 타이핑하는 대로 등록된 요양병원을 찾아
// 아래에 후보로 보여주고, 고르면 그 병원 이름으로 채워준다. 직접 입력도 그대로 가능.
function HospitalLocationInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<HospitalSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(
        `/api/facilities?q=${encodeURIComponent(q)}&type=NURSING_HOSPITAL&limit=5&view=card`
      )
        .then((r) => r.json())
        .then((data: { items: HospitalSuggestion[] }) => {
          if (!cancelled) setSuggestions(data.items ?? []);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <TextInput
        value={value}
        onChange={(v) => {
          onChange(v);
          setOpen(true);
        }}
        placeholder={placeholder}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft">
          {suggestions.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                onChange(f.name);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-ink-100/60"
            >
              <Building2 size={14} className="mt-0.5 shrink-0 text-ink-300" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-900">{f.name}</span>
                <span className="block truncate text-xs text-ink-300">{f.address}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CareRequestWizard({
  initial,
  template = null,
  presetType = null,
  onSaved,
  onCancelEdit,
}: {
  initial: CareRequestData | null;
  /** "같은 조건으로 다시 요청" — 지난 요청을 초안으로 새 요청(POST)을 만든다. 날짜만 다시 고른다 */
  template?: CareRequestData | null;
  /** /services에서 유형을 정해 들어온 경우 그 단계를 건너뛴다 */
  presetType?: LocationTypeValue | null;
  onSaved: (r: CareRequestData) => void;
  onCancelEdit?: () => void;
}) {
  // 유형을 정해서 들어왔으면 1단계(유형 선택)를 건너뛰고 바로 2단계에서 시작한다.
  // 재요청(template)도 내용은 이미 차 있으니 유형 단계는 건너뛰고 일정부터 고르게 한다.
  const [step, setStep] = useState(!initial && (presetType || template) ? 1 : 0);
  const [form, setForm] = useState<CareRequestForm>(
    initial
      ? formFromRequest(initial)
      : template
      ? formFromTemplate(template)
      : presetType
      ? { ...EMPTY_FORM, locationType: presetType }
      : EMPTY_FORM
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);

  // 단계가 바뀌면 항상 맨 위에서 시작한다 (등급 테스트와 같은 패턴).
  // - 화면이 다시 그려진 뒤(useEffect)에 옮겨야 이전 화면 기준으로 스크롤되지 않는다.
  // - 전역 CSS의 scroll-behavior:smooth 때문에 behavior를 "instant"로 강제해야 한다.
  // - 브라우저 스크롤 앵커링이 화면 높이 변경 후 위치를 되돌리므로 다음 프레임에 한 번 더 맞춘다.
  useEffect(() => {
    const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    toTop();
    const raf = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const set = <K extends keyof CareRequestForm>(key: K, value: CareRequestForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // 저장된 돌봄 프로필 — "돌봄 받으실 분" 단계에서 한 번에 채우는 용도.
  // (수정 모드에서는 이미 값이 있어 렌더 조건에서 걸러진다)
  const { profiles: careProfiles } = useCareProfiles();

  function applyCareProfile(p: CareProfileSummary) {
    setForm((f) => ({
      ...f,
      recipientRelation: p.relation,
      recipientGender: p.gender ?? f.recipientGender,
      recipientAgeBand: p.ageBand ?? f.recipientAgeBand,
      recipientWeightBand: p.weightBand ?? f.recipientWeightBand,
      mobilityLevel: p.mobilityLevel ?? f.mobilityLevel,
      mealAssistLevel: p.mealAssistLevel ?? f.mealAssistLevel,
      toiletAssistLevel: p.toiletAssistLevel ?? f.toiletAssistLevel,
      conditions: p.conditions.length > 0 ? p.conditions : f.conditions,
    }));
  }

  const toggleIn = (key: "conditions" | "householdTasks" | "specialRequests", v: string) =>
    setForm((f) => {
      const list = f[key];
      return { ...f, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] };
    });

  const isHospital = form.locationType === "HOSPITAL";
  const isHousekeeping = form.locationType === "HOUSEKEEPING";

  function canProceed() {
    if (step === 0) return form.locationType !== null;
    if (step === 1) return Boolean(form.region && form.startDate && form.endDate);
    if (step === 2) return Boolean(form.recipientRelation);
    if (step === 3) {
      if (isHousekeeping) return form.householdTasks.length > 0;
      return Boolean(form.mobilityLevel);
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const payload = {
      locationType: form.locationType,
      region: form.region,
      locationNote: form.locationNote,
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.roundTheClock ? null : form.startTime,
      endTime: form.roundTheClock ? null : form.endTime,
      roundTheClock: form.roundTheClock,
      recipientName: form.recipientName,
      recipientRelation: form.recipientRelation,
      recipientGender: form.recipientGender,
      recipientAgeBand: form.recipientAgeBand,
      recipientWeightBand: form.recipientWeightBand,
      situation: form.situation,
      // 유형이 바뀌면 이전 유형의 값이 남지 않게 비워 보낸다.
      mobilityLevel: isHousekeeping ? null : form.mobilityLevel,
      mealAssistLevel: isHousekeeping ? null : form.mealAssistLevel,
      toiletAssistLevel: isHousekeeping ? null : form.toiletAssistLevel,
      conditions: isHousekeeping ? [] : form.conditions,
      householdTasks: isHousekeeping ? form.householdTasks : [],
      visitsPerWeek: isHospital ? null : form.visitsPerWeek,
      visitHours: isHospital ? null : form.visitHours,
      hospitalEntry: isHospital ? form.hospitalEntry : null,
      roomType: isHospital ? form.roomType : null,
      admissionReason: isHospital ? form.admissionReason : null,
      surgeryPlan: isHospital ? form.surgeryPlan : null,
      sitterGenderPref: form.sitterGenderPref,
      specialRequests: form.specialRequests,
      requestNote: form.requestNote,
      budgetAmount: form.budgetAmount ? Number(form.budgetAmount.replace(/[^\d]/g, "")) : null,
      budgetUnit: form.budgetUnit,
    };

    try {
      const res = await fetch(
        initial ? `/api/care-requests/${initial.id}` : "/api/care-requests",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (res.status === 409) {
        setDuplicate(true);
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "");
      }
      const saved = await res.json();
      onSaved(initial ? { ...initial, ...saved } : saved);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "처리에 실패했어요. 다시 시도해주세요.");
      setSubmitting(false);
    }
  }

  if (duplicate) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <HeartHandshake size={32} className="mx-auto mb-3 text-primary-500" />
        <h1 className="mb-2 text-lg font-bold text-ink-900">이미 진행 중인 돌봄 요청이 있어요</h1>
        <p className="mb-6 text-sm leading-relaxed text-ink-500">
          한 번에 한 건씩만 올릴 수 있어요. 기존 요청을 수정하거나 취소한 뒤 다시 등록해주세요.
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
        >
          기존 요청 보러 가기
        </button>
      </main>
    );
  }

  const isLast = step === STEPS.length - 1;

  return (
    <main className="mx-auto max-w-lg px-4 pb-32 pt-3">
      {/* 스크롤해도 현재 단계가 보이도록 상단 고정 (모바일에서 길어지는 폼 대비) */}
      <div className="sticky top-12 z-20 -mx-4 mb-5 border-b border-ink-100 bg-ivory/95 px-4 pb-3 pt-3 backdrop-blur sm:top-16">
        <div className="mb-3 flex items-center gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              aria-label="이전 단계"
              className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors duration-150 hover:bg-ink-100 active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <span className="w-1" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-primary-600">
              {step + 1}단계 · 전체 {STEPS.length}단계
            </p>
            <h1 className="truncate text-lg font-bold text-ink-900">{STEPS[step]}</h1>
          </div>
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-ink-300 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-500"
            >
              취소
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i < step ? "bg-primary-300" : i === step ? "bg-primary-500" : "bg-ink-100"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 1. 돌봄 유형 */}
      {step === 0 && (
        <div className="space-y-3">
          {LOCATION_TYPES.map((t) => {
            const selected = form.locationType === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  set("locationType", t.value as LocationTypeValue);
                  setStep(1);
                }}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.99] ${
                  selected
                    ? "border-primary-500 bg-primary-50 shadow-soft"
                    : "border-ink-100 bg-white hover:border-primary-200 hover:shadow-card"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${t.iconClass}`}
                >
                  <Icon size={20} />
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-ink-900">{t.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{t.desc}</span>
                </span>
                {selected && <Check size={18} className="shrink-0 text-primary-500" />}
              </button>
            );
          })}
          <p className="rounded-xl bg-ink-100/40 p-3.5 text-xs leading-relaxed text-ink-500">
            선택에 따라 다음 질문이 달라져요. 언제든 뒤로 돌아와 바꿀 수 있어요.
          </p>
        </div>
      )}

      {/* 2. 언제, 어디서 */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <FieldLabel>지역</FieldLabel>
            <div className="grid grid-cols-4 gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set("region", r)}
                  className={`min-h-[44px] rounded-xl border px-2 text-xs font-bold transition-all duration-150 active:scale-95 ${
                    form.region === r
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-ink-100 text-ink-700 hover:bg-ink-100/60"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel optional hint={isHospital ? "병원 이름을 적으면 등록된 병원을 찾아드려요" : undefined}>
              자세한 장소
            </FieldLabel>
            {isHospital ? (
              <HospitalLocationInput
                value={form.locationNote}
                onChange={(v) => set("locationNote", v)}
                placeholder="예: OO요양병원 5층 502호"
              />
            ) : (
              <TextInput
                value={form.locationNote}
                onChange={(v) => set("locationNote", v)}
                placeholder="예: 자택 (엘리베이터 있음)"
              />
            )}
          </div>

          <div>
            <FieldLabel hint="시작일을 먼저 고르고, 종료일을 골라주세요.">돌봄 기간</FieldLabel>
            <DateRangeCalendar
              start={form.startDate}
              end={form.endDate}
              onChange={(s, e) => setForm((f) => ({ ...f, startDate: s, endDate: e }))}
            />
          </div>

          <div>
            <FieldLabel>돌봄 시간</FieldLabel>
            <button
              type="button"
              onClick={() => set("roundTheClock", !form.roundTheClock)}
              className={`mb-2 flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                form.roundTheClock
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-ink-100 bg-white text-ink-500"
              }`}
            >
              24시간 상주 돌봄이 필요해요
              {form.roundTheClock && <Check size={16} />}
            </button>
            {!form.roundTheClock && (
              <div className="flex items-center gap-2">
                <SelectInput
                  value={form.startTime}
                  onChange={(v) => set("startTime", v)}
                  options={TIME_OPTIONS}
                />
                <span className="shrink-0 text-sm text-ink-300">~</span>
                <SelectInput
                  value={form.endTime}
                  onChange={(v) => set("endTime", v)}
                  options={TIME_OPTIONS}
                />
              </div>
            )}
          </div>

          {!isHospital && (
            <>
              <div>
                <FieldLabel optional>주 몇 회 방문할까요</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("visitsPerWeek", form.visitsPerWeek === n ? null : n)}
                      className={`min-h-[44px] rounded-full border px-4 text-xs font-bold transition-all duration-150 active:scale-95 ${
                        form.visitsPerWeek === n
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-ink-100 text-ink-500 hover:bg-ink-100/60"
                      }`}
                    >
                      주 {n}회
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel optional>한 번에 몇 시간</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {[2, 3, 4, 6, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("visitHours", form.visitHours === n ? null : n)}
                      className={`min-h-[44px] rounded-full border px-4 text-xs font-bold transition-all duration-150 active:scale-95 ${
                        form.visitHours === n
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-ink-100 text-ink-500 hover:bg-ink-100/60"
                      }`}
                    >
                      {n}시간
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {isHospital && (
            <div className="space-y-4 rounded-2xl border border-ink-100 bg-white p-4">
              <p className="text-xs font-bold text-ink-900">입원 정보</p>
              <div>
                <FieldLabel optional>병원 출입 절차</FieldLabel>
                <ChipSelect
                  options={HOSPITAL_ENTRY_OPTIONS}
                  value={form.hospitalEntry}
                  onChange={(v) => set("hospitalEntry", v)}
                />
              </div>
              <div>
                <FieldLabel optional>병실 종류</FieldLabel>
                <ChipSelect
                  options={ROOM_TYPES}
                  value={form.roomType}
                  onChange={(v) => set("roomType", v)}
                />
              </div>
              <div>
                <FieldLabel optional>입원 사유</FieldLabel>
                <ChipSelect
                  options={ADMISSION_REASONS}
                  value={form.admissionReason}
                  onChange={(v) => set("admissionReason", v)}
                />
              </div>
              <div>
                <FieldLabel optional>입원 중 수술 예정</FieldLabel>
                <ChipSelect
                  options={SURGERY_PLANS}
                  value={form.surgeryPlan}
                  onChange={(v) => set("surgeryPlan", v)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. 돌봄 받으실 분 */}
      {step === 2 && (
        <div className="space-y-6">
          {/* 저장된 돌봄 프로필이 있으면 한 번에 채운다 — 매번 같은 정보를 다시 고르지 않게.
              수정 모드(initial)에서는 이미 값이 있으니 띄우지 않는다. */}
          {!initial && careProfiles.length > 0 && (
            <div className="rounded-2xl border border-primary-200 bg-primary-50/60 p-4">
              <p className="mb-2.5 text-[13px] font-bold text-ink-900">
                저장된 돌봄 프로필로 채우기
              </p>
              <div className="flex flex-wrap gap-2">
                {careProfiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyCareProfile(p)}
                    className="min-h-[44px] rounded-xl border border-primary-300 bg-white px-4 text-sm font-bold text-primary-700 transition-all duration-150 active:scale-[0.97]"
                  >
                    {p.relation}
                    {p.ageBand ? ` · ${p.ageBand}` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <FieldLabel optional hint="성만 적어주셔도 괜찮아요. 시터에게는 이 이름으로 안내돼요.">
              돌봄 받으실 분 성함
            </FieldLabel>
            <TextInput
              value={form.recipientName}
              onChange={(v) => set("recipientName", v)}
              placeholder="예: 김OO 어르신"
            />
          </div>
          <div>
            <FieldLabel>신청하시는 분과의 관계</FieldLabel>
            <ChipSelect
              options={RECIPIENT_RELATIONS}
              value={form.recipientRelation}
              onChange={(v) => set("recipientRelation", v)}
            />
          </div>
          <div>
            <FieldLabel optional>성별</FieldLabel>
            <ChipSelect
              options={RECIPIENT_GENDERS}
              value={form.recipientGender}
              onChange={(v) => set("recipientGender", v)}
            />
          </div>
          <div>
            <FieldLabel optional>연령대</FieldLabel>
            <ChipSelect
              options={AGE_BANDS}
              value={form.recipientAgeBand}
              onChange={(v) => set("recipientAgeBand", v)}
            />
          </div>
          <div>
            <FieldLabel optional hint="부축이나 체위 변경이 필요할 때 시터가 미리 준비할 수 있어요.">
              체중
            </FieldLabel>
            <ChipSelect
              options={WEIGHT_BANDS}
              value={form.recipientWeightBand}
              onChange={(v) => set("recipientWeightBand", v)}
            />
          </div>
        </div>
      )}

      {/* 4. 필요한 도움 */}
      {step === 3 && (
        <div className="space-y-6">
          {isHousekeeping ? (
            <div>
              <FieldLabel>
                필요한 집안일
                {form.householdTasks.length > 0 && (
                  <span className="ml-1.5 font-bold text-primary-600">
                    {form.householdTasks.length}개 선택
                  </span>
                )}
              </FieldLabel>
              <ChipMultiSelect
                options={HOUSEHOLD_TASKS}
                values={form.householdTasks}
                onToggle={(v) => toggleIn("householdTasks", v)}
                columns={2}
              />
            </div>
          ) : (
            <>
              <div>
                <FieldLabel>거동은 어떠신가요</FieldLabel>
                <ChipSelect
                  options={MOBILITY_LEVELS}
                  value={form.mobilityLevel}
                  onChange={(v) => set("mobilityLevel", v)}
                  columns={2}
                />
              </div>
              <div>
                <FieldLabel optional>식사는 어떻게 하시나요</FieldLabel>
                <ChipSelect
                  options={MEAL_ASSIST_LEVELS}
                  value={form.mealAssistLevel}
                  onChange={(v) => set("mealAssistLevel", v)}
                />
              </div>
              <div>
                <FieldLabel optional>배변·화장실은 어떻게 하시나요</FieldLabel>
                <ChipSelect
                  options={TOILET_ASSIST_LEVELS}
                  value={form.toiletAssistLevel}
                  onChange={(v) => set("toiletAssistLevel", v)}
                />
              </div>
              {(MEDICAL_ONLY_OPTIONS.includes(form.mealAssistLevel) ||
                MEDICAL_ONLY_OPTIONS.includes(form.toiletAssistLevel)) && (
                <NoticeBox>
                  콧줄·위루관 주입, 소변줄 교체, 석션 같은 의료행위는 의료법에 따라 돌보다 매니저가
                  해드릴 수 없어요. 관리가 필요한 상태라는 정보로만 전달되고, 실제 처치는 의료진이
                  맡아야 해요.
                </NoticeBox>
              )}
              <div>
                <FieldLabel optional>특별히 관리가 필요한 질환</FieldLabel>
                <ChipMultiSelect
                  options={CONDITION_SUGGESTIONS}
                  values={form.conditions}
                  onToggle={(v) => toggleIn("conditions", v)}
                  columns={2}
                />
              </div>
            </>
          )}

          <div>
            <FieldLabel optional hint="지금 상황을 편하게 적어주시면 시터가 이해하는 데 큰 도움이 돼요.">
              상황 설명
            </FieldLabel>
            <textarea
              value={form.situation}
              onChange={(e) => set("situation", e.target.value)}
              rows={3}
              placeholder={
                isHousekeeping
                  ? "예: 혼자 지내시는 어머니 식사와 청소를 챙겨주실 분이 필요해요"
                  : "예: 고관절 수술 후 회복 중이라 화장실 이동을 도와주실 분이 필요해요"
              }
              className="w-full resize-none rounded-xl border border-ink-100 px-3.5 py-3 text-base leading-relaxed focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 sm:text-sm"
            />
          </div>
        </div>
      )}

      {/* 5. 조건 확인 */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <FieldLabel>선호하는 시터 성별</FieldLabel>
            <ChipSelect
              options={GENDER_PREFS}
              value={form.sitterGenderPref}
              onChange={(v) => set("sitterGenderPref", v || "무관")}
            />
          </div>

          <div>
            <FieldLabel optional>시터에게 특별히 부탁하고 싶은 것</FieldLabel>
            <ChipMultiSelect
              options={SPECIAL_REQUESTS}
              values={form.specialRequests}
              onToggle={(v) => toggleIn("specialRequests", v)}
            />
          </div>

          <div>
            <FieldLabel
              optional
              hint="정하신 금액이 있다면 적어주세요. 없으면 비워두고 시터와 상의해도 괜찮아요."
            >
              생각하시는 사례비
            </FieldLabel>
            <div className="flex gap-2">
              <div className="w-24 shrink-0">
                <SelectInput
                  value={form.budgetUnit}
                  onChange={(v) => set("budgetUnit", v)}
                  options={BUDGET_UNITS}
                />
              </div>
              <div className="flex-1">
                <TextInput
                  value={form.budgetAmount}
                  onChange={(v) => set("budgetAmount", v.replace(/[^\d]/g, ""))}
                  placeholder="예: 130000"
                  inputMode="numeric"
                  suffix="원"
                />
              </div>
            </div>
          </div>

          <div>
            <FieldLabel optional>더 하고 싶은 말</FieldLabel>
            <textarea
              value={form.requestNote}
              onChange={(e) => set("requestNote", e.target.value)}
              rows={3}
              placeholder="예: 어머니가 낯을 조금 가리세요. 천천히 다가와 주시면 좋겠어요."
              className="w-full resize-none rounded-xl border border-ink-100 px-3.5 py-3 text-base leading-relaxed focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 sm:text-sm"
            />
          </div>

          <div className="rounded-2xl bg-ink-100/40 p-4">
            <p className="mb-2 text-xs font-bold text-ink-900">등록 전에 알아두세요</p>
            <ul className="space-y-1.5 text-xs leading-relaxed text-ink-500">
              <li>· 돌보다는 보호자와 돌보다 매니저를 연결해드리는 역할만 해요.</li>
              <li>· 사례비 결제와 정산은 두 분이 직접 진행하셔야 해요.</li>
              <li>· 석션·경관영양 같은 의료행위는 요청하실 수 없어요.</li>
              <li>· 요청은 한 번에 한 건만 등록할 수 있어요.</li>
            </ul>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-primary-50 p-3 text-center text-xs font-semibold text-primary-700">
          {error}
        </p>
      )}

      {/* 홈 인디케이터가 있는 기기에서도 버튼이 가리지 않도록 safe-area 여백 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 px-4 pt-3 backdrop-blur [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg">
          {isLast ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="min-h-[52px] w-full rounded-xl bg-primary-500 text-base font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "올리는 중..." : initial ? "수정한 내용 저장하기" : "돌봄 요청 올리기"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
              className="min-h-[52px] w-full rounded-xl bg-primary-500 text-base font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-300 disabled:shadow-none"
            >
              {canProceed() ? "다음" : "위 항목을 선택해주세요"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
