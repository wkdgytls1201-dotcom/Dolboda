"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { X, Plus, Check, ChevronLeft, HeartHandshake, FileText } from "lucide-react";
import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { HOUSEHOLD_TASKS } from "@/lib/householdTasks";
import { LOCATION_TYPES, typeMeta, type LocationTypeValue } from "@/lib/careLocationTypes";

const STEP_TITLES = ["어떤 돌봄이 필요하세요", "언제, 어디서", "어떤 상황이신가요", "원하시는 조건"];
const MOBILITY_LEVELS = ["혼자 거동 가능", "보행기구 보조", "휠체어 보조", "완전 와상"];
const GENDER_PREFS = ["무관", "여성", "남성"];
const SUGGESTED_CONDITIONS = ["치매·인지장애", "욕창 관리", "재활치료 중", "신장 투석"];

interface Applicant {
  id: string;
  status: string;
  sitterProfile: {
    id: string;
    nickname: string;
    experienceYears: number;
    intro: string | null;
    certifications: { id: string; name: string }[];
  };
}

interface CareRequestData {
  id: string;
  status: "OPEN" | "MATCHED" | "CANCELLED" | "COMPLETED";
  locationType: LocationTypeValue;
  region: string;
  locationNote: string | null;
  startDate: string;
  endDate: string;
  situation: string | null;
  mobilityLevel: string | null;
  needsMealAssist: boolean;
  needsToiletAssist: boolean;
  conditions: string[];
  householdTasks: string[];
  visitsPerWeek: number | null;
  visitHours: number | null;
  sitterGenderPref: string;
  requestNote: string | null;
  applications: Applicant[];
}

export default function CareRequestPage() {
  const { data: session, status } = useSession();
  const [current, setCurrent] = useState<CareRequestData | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/care-requests")
      .then((r) => (r.ok ? r.json() : null))
      .then(setCurrent);
  }, [status]);

  if (status === "loading" || current === undefined) return null;

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm text-ink-500">돌봄 요청은 로그인 후 등록할 수 있어요.</p>
      </main>
    );
  }

  const isActive = current && (current.status === "OPEN" || current.status === "MATCHED");

  if (isActive && current && !editing) {
    return (
      <CareRequestDetail
        careRequest={current}
        onEdit={() => setEditing(true)}
        onChange={setCurrent}
      />
    );
  }

  return (
    <CareRequestForm
      initial={editing ? current : null}
      onSaved={(saved) => {
        setCurrent(saved);
        setEditing(false);
      }}
      onCancelEdit={editing ? () => setEditing(false) : undefined}
    />
  );
}

function CareRequestDetail({
  careRequest,
  onEdit,
  onChange,
}: {
  careRequest: CareRequestData;
  onEdit: () => void;
  onChange: (r: CareRequestData) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const meta = typeMeta(careRequest.locationType);

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch(`/api/care-requests/${careRequest.id}`, { method: "DELETE" });
    const updated = await res.json();
    onChange(updated);
    setCancelling(false);
  }

  async function handleConfirm(applicationId: string) {
    setConfirmingId(applicationId);
    await fetch(`/api/care-request-applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    const res = await fetch("/api/care-requests");
    onChange(await res.json());
    setConfirmingId(null);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink-900">내 돌봄 요청</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badgeClass}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-sm text-ink-500">
            {careRequest.status === "MATCHED" ? "매칭이 확정됐어요" : "지원자를 기다리고 있어요"}
          </p>
        </div>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
          지원자 {careRequest.applications.length}명
        </span>
      </div>

      {careRequest.status === "MATCHED" && (
        <Link
          href="/care-request/confirmation"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-mint-200 bg-mint-50 p-4 transition-colors duration-150 hover:bg-mint-100"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-700">
            <FileText size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-ink-900">돌봄 확인서 보기</span>
            <span className="block text-xs text-ink-500">
              확정된 내용을 한 장으로 정리했어요. 인쇄하거나 PDF로 저장할 수 있어요.
            </span>
          </span>
        </Link>
      )}

      <div className="space-y-4">
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="mb-3 font-bold text-ink-900">언제, 어디서</h2>
          <dl className="space-y-1.5 text-sm text-ink-700">
            <div className="flex justify-between">
              <dt className="text-ink-500">지역</dt>
              <dd>{careRequest.region}</dd>
            </div>
            {careRequest.locationNote && (
              <div className="flex justify-between">
                <dt className="text-ink-500">장소</dt>
                <dd>{careRequest.locationNote}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">기간</dt>
              <dd>
                {careRequest.startDate.slice(0, 10)} ~ {careRequest.endDate.slice(0, 10)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="mb-3 font-bold text-ink-900">어떤 상황이신가요</h2>
          {careRequest.situation && (
            <p className="mb-2 text-sm text-ink-700">{careRequest.situation}</p>
          )}
          {careRequest.householdTasks.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {careRequest.householdTasks.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-mint-100 px-2.5 py-1 text-xs font-medium text-mint-700"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <dl className="space-y-1.5 text-sm text-ink-700">
            {careRequest.mobilityLevel && (
              <div className="flex justify-between">
                <dt className="text-ink-500">거동</dt>
                <dd>{careRequest.mobilityLevel}</dd>
              </div>
            )}
            {careRequest.locationType === "HOSPITAL" && (
              <>
                <div className="flex justify-between">
                  <dt className="text-ink-500">식사 보조</dt>
                  <dd>{careRequest.needsMealAssist ? "필요" : "필요 없음"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">배변 보조</dt>
                  <dd>{careRequest.needsToiletAssist ? "필요" : "필요 없음"}</dd>
                </div>
              </>
            )}
            {careRequest.visitsPerWeek != null && (
              <div className="flex justify-between">
                <dt className="text-ink-500">방문 횟수</dt>
                <dd>주 {careRequest.visitsPerWeek}회</dd>
              </div>
            )}
            {careRequest.visitHours != null && (
              <div className="flex justify-between">
                <dt className="text-ink-500">1회 방문 시간</dt>
                <dd>{careRequest.visitHours}시간</dd>
              </div>
            )}
          </dl>
          {careRequest.conditions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {careRequest.conditions.map((c) => (
                <span key={c} className="rounded-full bg-ink-100/60 px-2.5 py-1 text-xs text-ink-700">
                  {c}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="mb-3 font-bold text-ink-900">원하시는 조건</h2>
          <dl className="space-y-1.5 text-sm text-ink-700">
            <div className="flex justify-between">
              <dt className="text-ink-500">선호 성별</dt>
              <dd>{careRequest.sitterGenderPref}</dd>
            </div>
          </dl>
          {careRequest.requestNote && (
            <p className="mt-2 text-sm text-ink-700">{careRequest.requestNote}</p>
          )}
          <p className="mt-3 rounded-xl bg-ink-100/40 p-3 text-xs text-ink-500">
            비용은 정해진 금액이 아니라 매칭이 확정된 뒤 시터와 협의해 안내해드려요. 모심시터는
            의료행위(석션, 튜브 관리 등)를 제공할 수 없어요.
          </p>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="mb-3 font-bold text-ink-900">지원한 모심시터</h2>
          {careRequest.applications.length === 0 ? (
            <p className="text-sm text-ink-300">아직 지원한 시터가 없어요.</p>
          ) : (
            <div className="space-y-3">
              {careRequest.applications.map((app) => (
                <div key={app.id} className="rounded-xl bg-ink-100/30 p-3.5">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-bold text-ink-900">{app.sitterProfile.nickname}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        app.status === "매칭확정"
                          ? "bg-mint-100 text-mint-700"
                          : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <p className="mb-1 text-xs text-ink-300">
                    경력 {app.sitterProfile.experienceYears}년
                    {app.sitterProfile.certifications.length > 0 &&
                      ` · ${app.sitterProfile.certifications.map((c) => c.name).join(", ")}`}
                  </p>
                  {app.sitterProfile.intro && (
                    <p className="mb-2 text-sm text-ink-700">{app.sitterProfile.intro}</p>
                  )}
                  {careRequest.status === "OPEN" && (
                    <button
                      type="button"
                      disabled={confirmingId === app.id}
                      onClick={() => handleConfirm(app.id)}
                      className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600 disabled:opacity-60"
                    >
                      {confirmingId === app.id ? "처리 중..." : "이 분으로 확정"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {careRequest.status === "OPEN" && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-xl border border-ink-100 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100"
          >
            수정
          </button>
          <button
            type="button"
            disabled={cancelling}
            onClick={handleCancel}
            className="flex-1 rounded-xl border border-primary-200 py-2.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-60"
          >
            {cancelling ? "취소 중..." : "요청 취소"}
          </button>
        </div>
      )}
    </main>
  );
}

function CareRequestForm({
  initial,
  onSaved,
  onCancelEdit,
}: {
  initial: CareRequestData | null;
  onSaved: (r: CareRequestData) => void;
  onCancelEdit?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const [locationType, setLocationType] = useState<LocationTypeValue | null>(
    initial?.locationType ?? null
  );

  const [region, setRegion] = useState(initial?.region ?? "");
  const [locationNote, setLocationNote] = useState(initial?.locationNote ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate.slice(0, 10) ?? "");

  const [situation, setSituation] = useState(initial?.situation ?? "");
  const [mobilityLevel, setMobilityLevel] = useState(initial?.mobilityLevel ?? MOBILITY_LEVELS[0]);
  const [needsMealAssist, setNeedsMealAssist] = useState(initial?.needsMealAssist ?? false);
  const [needsToiletAssist, setNeedsToiletAssist] = useState(initial?.needsToiletAssist ?? false);
  const [conditions, setConditions] = useState<string[]>(initial?.conditions ?? []);
  const [conditionInput, setConditionInput] = useState("");
  const [householdTasks, setHouseholdTasks] = useState<string[]>(initial?.householdTasks ?? []);
  const [visitsPerWeek, setVisitsPerWeek] = useState<number | null>(
    initial?.visitsPerWeek ?? null
  );
  const [visitHours, setVisitHours] = useState<number | null>(initial?.visitHours ?? null);

  const [sitterGenderPref, setSitterGenderPref] = useState(initial?.sitterGenderPref ?? "무관");
  const [requestNote, setRequestNote] = useState(initial?.requestNote ?? "");

  function canProceed() {
    if (step === 0) return locationType !== null;
    if (step === 1) return region && startDate && endDate;
    if (step === 2) {
      if (locationType === "HOSPITAL") return situation.trim().length > 0;
      if (locationType === "HOUSEKEEPING") return householdTasks.length > 0;
      return true;
    }
    return true;
  }

  function addCondition(c: string) {
    if (!c.trim() || conditions.includes(c.trim())) return;
    setConditions((prev) => [...prev, c.trim()]);
    setConditionInput("");
  }

  function toggleHouseholdTask(task: string) {
    setHouseholdTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  }

  async function handleSubmit() {
    if (!locationType) return;
    setSubmitting(true);
    setError(null);
    setDuplicateId(null);
    // 유형과 무관한 필드는 null로 보내 수정 시 이전 유형의 값이 남지 않게 한다.
    const payload = {
      locationType,
      region,
      locationNote: locationNote.trim() || null,
      startDate,
      endDate,
      situation: situation.trim() || null,
      mobilityLevel: locationType === "HOUSEKEEPING" ? null : mobilityLevel,
      needsMealAssist: locationType === "HOSPITAL" ? needsMealAssist : false,
      needsToiletAssist: locationType === "HOSPITAL" ? needsToiletAssist : false,
      conditions: locationType === "HOSPITAL" ? conditions : [],
      householdTasks: locationType === "HOUSEKEEPING" ? householdTasks : [],
      visitsPerWeek: locationType === "HOSPITAL" ? null : visitsPerWeek,
      visitHours: locationType === "HOSPITAL" ? null : visitHours,
      sitterGenderPref,
      requestNote: requestNote.trim() || null,
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
        const data = await res.json();
        setDuplicateId(data.careRequestId);
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error();
      const savedRequest = await res.json();
      onSaved(initial ? { ...initial, ...savedRequest } : savedRequest);
    } catch {
      setError("처리에 실패했어요. 잠시 후 다시 시도해주세요.");
      setSubmitting(false);
    }
  }

  const isLastStep = step === STEP_TITLES.length - 1;
  const isHospital = locationType === "HOSPITAL";
  const isHousekeeping = locationType === "HOUSEKEEPING";

  if (duplicateId) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <HeartHandshake size={32} className="mx-auto mb-3 text-primary-500" />
        <h1 className="mb-2 text-lg font-bold text-ink-900">이미 진행 중인 돌봄 요청이 있어요</h1>
        <p className="mb-6 text-sm text-ink-500">
          새 요청을 등록하려면 기존 요청을 먼저 수정하거나 취소해주세요.
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

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="mb-5 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            aria-label="이전 단계"
            className="rounded-full p-1.5 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary-600">
            {step + 1} / {STEP_TITLES.length}
          </p>
          <h1 className="text-lg font-bold text-ink-900">{STEP_TITLES[step]}</h1>
        </div>
        {onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs font-semibold text-ink-300 hover:text-ink-500"
          >
            취소
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-1.5">
        {STEP_TITLES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i <= step ? "bg-primary-500" : "bg-ink-100"
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          {LOCATION_TYPES.map((t) => {
            const selected = locationType === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setLocationType(t.value);
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
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                    {t.desc}
                  </span>
                </span>
                {selected && <Check size={18} className="shrink-0 text-primary-500" />}
              </button>
            );
          })}
          <p className="rounded-xl bg-ink-100/40 p-3.5 text-xs leading-relaxed text-ink-500">
            선택에 따라 다음 단계의 질문이 달라져요. 언제든 뒤로 돌아와 바꿀 수 있어요.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">지역</label>
            <div className="grid grid-cols-4 gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors duration-150 ${
                    region === r
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
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              장소 <span className="font-normal text-ink-300">(선택)</span>
            </label>
            <input
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder={
                isHospital ? "예: OO병원 3층 병실" : "예: 자택 아파트 (엘리베이터 있음)"
              }
              className="w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-ink-700">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-ink-700">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {isHousekeeping ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-700">
                  어떤 집안일을 도와드릴까요
                  {householdTasks.length > 0 && (
                    <span className="ml-1.5 font-bold text-primary-600">
                      {householdTasks.length}개 선택
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {HOUSEHOLD_TASKS.map((task) => {
                    const on = householdTasks.includes(task);
                    return (
                      <button
                        key={task}
                        type="button"
                        onClick={() => toggleHouseholdTask(task)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                          on
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-ink-100 text-ink-500 hover:bg-ink-100/60"
                        }`}
                      >
                        {task}
                        {on && <Check size={14} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <VisitFrequencyFields
                visitsPerWeek={visitsPerWeek}
                visitHours={visitHours}
                onVisitsChange={setVisitsPerWeek}
                onHoursChange={setVisitHours}
              />
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">
                  참고할 상황 <span className="font-normal text-ink-300">(선택)</span>
                </label>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  rows={3}
                  placeholder="예: 혼자 지내시는 어머니 식사와 청소를 챙겨주실 분이 필요해요"
                  className="w-full resize-none rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">
                  어떤 상황이신가요
                  {!isHospital && <span className="font-normal text-ink-300"> (선택)</span>}
                </label>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  rows={3}
                  placeholder={
                    isHospital
                      ? "예: 수술 후 회복 중이라 거동을 도와줄 분이 필요해요"
                      : "예: 낮 시간 동안 집에서 어르신 일상을 도와주실 분이 필요해요"
                  }
                  className="w-full resize-none rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-700">거동 수준</label>
                <div className="grid grid-cols-2 gap-2">
                  {MOBILITY_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setMobilityLevel(level)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                        mobilityLevel === level
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-ink-100 text-ink-500 hover:bg-ink-100/60"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              {isHospital ? (
                <>
                  <div className="flex gap-4">
                    <label className="flex flex-1 cursor-pointer items-center justify-between rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm">
                      식사 보조
                      <input
                        type="checkbox"
                        checked={needsMealAssist}
                        onChange={(e) => setNeedsMealAssist(e.target.checked)}
                        className="h-4 w-4 rounded accent-primary-500"
                      />
                    </label>
                    <label className="flex flex-1 cursor-pointer items-center justify-between rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm">
                      배변 보조
                      <input
                        type="checkbox"
                        checked={needsToiletAssist}
                        onChange={(e) => setNeedsToiletAssist(e.target.checked)}
                        className="h-4 w-4 rounded accent-primary-500"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-700">
                      관리가 필요한 사항 <span className="font-normal text-ink-300">(선택)</span>
                    </label>
                    {conditions.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {conditions.map((c) => (
                          <span
                            key={c}
                            className="flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary-700"
                          >
                            {c}
                            <button
                              type="button"
                              onClick={() => setConditions((prev) => prev.filter((x) => x !== c))}
                              className="rounded-full p-0.5 hover:bg-primary-100"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {SUGGESTED_CONDITIONS.filter((c) => !conditions.includes(c)).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => addCondition(c)}
                          className="rounded-full border border-ink-100 px-2.5 py-1 text-xs text-ink-500 hover:bg-ink-100/60"
                        >
                          + {c}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={conditionInput}
                        onChange={(e) => setConditionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCondition(conditionInput);
                          }
                        }}
                        placeholder="직접 입력"
                        className="flex-1 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
                      />
                      <button
                        type="button"
                        onClick={() => addCondition(conditionInput)}
                        aria-label="추가"
                        className="flex shrink-0 items-center justify-center rounded-xl bg-primary-500 px-3 text-white hover:bg-primary-600"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <VisitFrequencyFields
                  visitsPerWeek={visitsPerWeek}
                  visitHours={visitHours}
                  onVisitsChange={setVisitsPerWeek}
                  onHoursChange={setVisitHours}
                />
              )}
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">선호하는 성별</label>
            <div className="flex gap-2">
              {GENDER_PREFS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSitterGenderPref(g)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                    sitterGenderPref === g
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-ink-100 text-ink-500 hover:bg-ink-100/60"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              추가로 전달하고 싶은 말 <span className="font-normal text-ink-300">(선택)</span>
            </label>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              rows={3}
              placeholder="예: 식사할 때 천천히 도와주세요"
              className="w-full resize-none rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
          </div>
          <p className="rounded-xl bg-ink-100/40 p-3.5 text-xs leading-relaxed text-ink-500">
            비용은 정해진 금액이 아니라 매칭이 확정된 뒤 시터와 협의해 안내해드려요. 결제 기능은
            준비 중이에요.
          </p>
        </div>
      )}

      {error && <p className="mt-4 text-center text-xs font-semibold text-primary-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {isLastStep ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "처리 중..." : initial ? "수정 완료하기" : "돌봄 요청하기"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
              className="w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-300"
            >
              다음
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// 방문 단위(가사돌봄/자택) 요청에서 쓰는 주당 횟수·시간 선택 — 둘 다 선택 사항이고
// 같은 값을 다시 누르면 해제된다.
function VisitFrequencyFields({
  visitsPerWeek,
  visitHours,
  onVisitsChange,
  onHoursChange,
}: {
  visitsPerWeek: number | null;
  visitHours: number | null;
  onVisitsChange: (v: number | null) => void;
  onHoursChange: (v: number | null) => void;
}) {
  return (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-700">
          주에 몇 번 방문할까요 <span className="font-normal text-ink-300">(선택)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onVisitsChange(visitsPerWeek === n ? null : n)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                visitsPerWeek === n
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
        <label className="mb-1.5 block text-xs font-semibold text-ink-700">
          한 번에 몇 시간 정도 필요하세요 <span className="font-normal text-ink-300">(선택)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[2, 3, 4, 6, 8].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onHoursChange(visitHours === n ? null : n)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                visitHours === n
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
  );
}
