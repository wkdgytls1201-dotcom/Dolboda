"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HeartHandshake, Pencil, Plus, ShieldCheck } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";
import { FieldLabel, ChipSelect, ChipMultiSelect, NoticeBox } from "@/components/CareFormFields";
import {
  RECIPIENT_RELATIONS,
  RECIPIENT_GENDERS,
  AGE_BANDS,
  WEIGHT_BANDS,
  MOBILITY_LEVELS,
  MEAL_ASSIST_LEVELS,
  TOILET_ASSIST_LEVELS,
  LTC_GRADE_OPTIONS,
  CONDITION_SUGGESTIONS,
} from "@/lib/careOptions";
import { GRADE_BANDS } from "@/lib/gradeTest";
import { ltcGuideFor } from "@/lib/ltcGuide";

interface CareProfileData {
  id: string;
  relation: string;
  gender: string | null;
  ageBand: string | null;
  weightBand: string | null;
  mobilityLevel: string | null;
  mealAssistLevel: string | null;
  toiletAssistLevel: string | null;
  conditions: string[];
  ltcGrade: string | null;
  estimatedBand: string | null;
  estimatedAt: string | null;
}

const EMPTY = {
  relation: "",
  gender: "",
  ageBand: "",
  weightBand: "",
  mobilityLevel: "",
  mealAssistLevel: "",
  toiletAssistLevel: "",
  conditions: [] as string[],
  ltcGrade: "",
};
type FormState = typeof EMPTY;

function formFrom(p: CareProfileData): FormState {
  return {
    relation: p.relation,
    gender: p.gender ?? "",
    ageBand: p.ageBand ?? "",
    weightBand: p.weightBand ?? "",
    mobilityLevel: p.mobilityLevel ?? "",
    mealAssistLevel: p.mealAssistLevel ?? "",
    toiletAssistLevel: p.toiletAssistLevel ?? "",
    conditions: p.conditions,
    ltcGrade: p.ltcGrade ?? "",
  };
}

function estimatedLabel(bandId: string | null): string | null {
  if (!bandId) return null;
  return GRADE_BANDS.find((b) => b.id === bandId)?.label ?? null;
}

function CareProfileContent() {
  // 등급테스트 결과 화면에서 "프로필에 저장"으로 넘어오면 ?estimate=<band id>가 붙는다
  const params = useSearchParams();
  const estimateFromTest = params.get("estimate");

  const [items, setItems] = useState<CareProfileData[] | null>(null);
  // null = 목록 보기, "new" = 새로 만들기, 그 외 = 해당 id 수정
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/care-profile")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        setItems(d.items ?? []);
        // 테스트에서 넘어왔는데 프로필이 하나도 없으면 바로 만들기 화면으로
        if (estimateFromTest && (d.items ?? []).length === 0) setEditing("new");
      })
      .catch(() => {
        if (!cancelled) setError("정보를 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function startNew() {
    setForm(EMPTY);
    setConsent(false);
    setError(null);
    setEditing("new");
  }

  function startEdit(p: CareProfileData) {
    setForm(formFrom(p));
    setError(null);
    setEditing(p.id);
  }

  async function save() {
    if (!form.relation) {
      setError("어르신과의 관계를 골라주세요.");
      return;
    }
    if (editing === "new" && !consent) {
      setError("건강 정보 저장 동의에 체크해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = editing === "new";
      const res = await fetch("/api/care-profile", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isNew ? { consent } : { id: editing }),
          ...form,
          // 테스트에서 넘어온 추정 구간은 새 프로필/수정 대상에 함께 반영
          ...(estimateFromTest ? { estimatedBand: estimateFromTest } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "");
      setItems((prev) => {
        const list = prev ?? [];
        return isNew ? [...list, data] : list.map((p) => (p.id === data.id ? data : p));
      });
      setEditing(null);
    } catch (e) {
      setError(
        (e instanceof Error && e.message) || "저장하지 못했어요. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/care-profile?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setItems((prev) => (prev ?? []).filter((p) => p.id !== id));
      setConfirmDelete(null);
      setEditing(null);
    }
  }

  /* ---------- 입력 화면 ---------- */
  if (editing !== null) {
    const isNew = editing === "new";
    return (
      <MyPageShell>
        <h2 className="mb-2 text-xl font-bold text-ink-900">
          {isNew ? "돌봄 프로필 만들기" : "돌봄 프로필 수정"}
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-ink-500">
          한 번 저장해두면 시설 찾기와 돌봄 요청에서 다시 입력할 필요가 없어요.
          <span className="block text-ink-400">모든 항목은 선택이고, 언제든 삭제할 수 있어요.</span>
        </p>

        {estimateFromTest && (
          <NoticeBox>
            등급테스트 결과(예상 구간)가 이 프로필에 함께 저장돼요. 실제 등급은 공단
            방문조사로 결정되며, 화면에는 항상 &quot;예상&quot;으로 표시돼요.
          </NoticeBox>
        )}

        <div className="mt-4 space-y-5 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
          <div>
            <FieldLabel hint="이름은 받지 않아요 — 호칭으로만 구분해요">
              어르신과의 관계
            </FieldLabel>
            <ChipSelect
              options={RECIPIENT_RELATIONS}
              value={form.relation}
              onChange={(v) => set("relation", v)}
            />
          </div>
          <div>
            <FieldLabel optional>성별</FieldLabel>
            <ChipSelect
              options={RECIPIENT_GENDERS}
              value={form.gender}
              onChange={(v) => set("gender", v)}
            />
          </div>
          <div>
            <FieldLabel optional>연령대</FieldLabel>
            <ChipSelect
              options={AGE_BANDS}
              value={form.ageBand}
              onChange={(v) => set("ageBand", v)}
            />
          </div>
          <div>
            <FieldLabel optional hint="부축·이동 도움의 난이도를 가늠하는 데 쓰여요">
              체중대
            </FieldLabel>
            <ChipSelect
              options={WEIGHT_BANDS}
              value={form.weightBand}
              onChange={(v) => set("weightBand", v)}
            />
          </div>
          <div>
            <FieldLabel optional>거동 수준</FieldLabel>
            <ChipSelect
              options={MOBILITY_LEVELS}
              value={form.mobilityLevel}
              onChange={(v) => set("mobilityLevel", v)}
              columns={2}
            />
          </div>
          <div>
            <FieldLabel optional>식사</FieldLabel>
            <ChipSelect
              options={MEAL_ASSIST_LEVELS}
              value={form.mealAssistLevel}
              onChange={(v) => set("mealAssistLevel", v)}
              columns={2}
            />
          </div>
          <div>
            <FieldLabel optional>배변</FieldLabel>
            <ChipSelect
              options={TOILET_ASSIST_LEVELS}
              value={form.toiletAssistLevel}
              onChange={(v) => set("toiletAssistLevel", v)}
              columns={2}
            />
          </div>
          <div>
            <FieldLabel optional>해당하는 질환·상태</FieldLabel>
            <ChipMultiSelect
              options={CONDITION_SUGGESTIONS}
              values={form.conditions}
              onToggle={(v) =>
                set(
                  "conditions",
                  form.conditions.includes(v)
                    ? form.conditions.filter((c) => c !== v)
                    : [...form.conditions, v]
                )
              }
              columns={2}
            />
          </div>
          <div>
            <FieldLabel optional hint="이미 받은 등급이 있다면 골라주세요">
              장기요양등급
            </FieldLabel>
            <ChipSelect
              options={LTC_GRADE_OPTIONS}
              value={form.ltcGrade}
              onChange={(v) => set("ltcGrade", v)}
            />
            {/* 고른 등급으로 무엇을 이용할 수 있는지 그 자리에서 알려준다 —
                제도 구조만 설명하고 금액은 말하지 않는다(매년 고시로 바뀜) */}
            {(() => {
              const guide = ltcGuideFor(form.ltcGrade || null);
              if (!guide) return null;
              return (
                <div className="mt-3 rounded-xl bg-ivory-100 p-3.5">
                  <p className="text-[13px] font-bold text-ink-900">{guide.summary}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{guide.detail}</p>
                </div>
              );
            })()}
          </div>
        </div>

        {isNew && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#FF6250]"
            />
            <span className="text-[13px] leading-relaxed text-ink-700">
              <strong className="font-bold">건강 정보 저장에 동의해요.</strong>{" "}
              <span className="text-ink-500">
                입력한 건강 상태 정보는 시설 추천과 돌봄 요청 작성에만 쓰이고, 프로필을
                삭제하면 즉시 지워져요. 자세한 내용은 개인정보처리방침을 확인하세요.
              </span>
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-primary-50 px-4 py-3 text-[13px] font-semibold text-primary-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="min-h-[52px] flex-1 rounded-xl border border-ink-100 bg-white text-sm font-bold text-ink-500"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="min-h-[52px] flex-[2] rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-colors hover:bg-primary-600 disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>

        {/* 삭제는 파괴적 액션 — 화면 맨 아래 작게, 확인 단계를 거친다 */}
        {!isNew && (
          <div className="mt-10 text-center">
            {confirmDelete === editing ? (
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="mb-3 text-sm font-bold text-ink-900">
                  이 프로필을 삭제할까요? 저장된 건강 정보가 모두 지워져요.
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => remove(editing)}
                    className="min-h-[48px] flex-1 rounded-xl border border-ink-100 text-[13px] font-semibold text-ink-500"
                  >
                    삭제할게요
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="min-h-[48px] flex-[2] rounded-xl bg-primary-500 text-sm font-bold text-white"
                  >
                    아니요, 유지할게요
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(editing)}
                className="text-[11px] text-ink-300 underline underline-offset-2"
              >
                프로필 삭제
              </button>
            )}
          </div>
        )}
      </MyPageShell>
    );
  }

  /* ---------- 목록 화면 ---------- */
  return (
    <MyPageShell>
      <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-ink-900">
        <HeartHandshake size={22} className="text-primary-500" />
        어르신 돌봄 프로필
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-ink-500">
        모시는 어르신의 상태를 저장해두면 돌봄 요청을 올릴 때 자동으로 채워져요.
      </p>

      {error && !items && (
        <p className="rounded-2xl bg-ink-100/40 p-4 text-sm text-ink-500">{error}</p>
      )}
      {!error && items === null && <PageLoader compact />}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 p-8 text-center">
          <p className="mb-1 text-[15px] font-bold text-ink-900">아직 저장된 프로필이 없어요</p>
          <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
            연령대·거동 수준 같은 구간 정보만 받아요. 이름과 생년월일은 받지 않아요.
          </p>
          <button
            type="button"
            onClick={startNew}
            className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-soft transition-colors hover:bg-primary-600"
          >
            <Plus size={16} />
            프로필 만들기
          </button>
        </div>
      )}

      {items && items.length > 0 && (
        <>
          <div className="space-y-3">
            {items.map((p) => {
              const summary = [p.ageBand, p.gender, p.mobilityLevel].filter(Boolean).join(" · ");
              const estimate = estimatedLabel(p.estimatedBand);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => startEdit(p)}
                  className="block w-full rounded-2xl bg-white p-5 text-left shadow-card transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-ink-900">{p.relation}</p>
                      {summary && (
                        <p className="mt-0.5 text-[13px] text-ink-500">{summary}</p>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ink-300">
                      <Pencil size={12} />
                      수정
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.ltcGrade && p.ltcGrade !== "아직 몰라요" && (
                      <span className="rounded-full bg-royal-50 px-2.5 py-1 text-[12px] font-bold text-royal-600">
                        {p.ltcGrade}
                      </span>
                    )}
                    {estimate && (
                      <span className="rounded-full bg-ivory-100 px-2.5 py-1 text-[12px] font-semibold text-ink-500">
                        테스트 {estimate}
                      </span>
                    )}
                    {p.conditions.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-ink-100/60 px-2.5 py-1 text-[12px] text-ink-500"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {items.length < 3 && (
            <button
              type="button"
              onClick={startNew}
              className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink-100 bg-white/60 text-sm font-bold text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-600"
            >
              <Plus size={16} />
              다른 어르신 추가
            </button>
          )}
        </>
      )}

      <div className="mt-6 flex gap-3 rounded-2xl bg-ink-100/40 p-4">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-ink-300" />
        <p className="text-[13px] leading-relaxed text-ink-500">
          이름·생년월일은 받지 않고, 건강 상태는 구간값으로만 저장돼요. 프로필을 삭제하면
          즉시 지워지고, 회원 탈퇴 시에도 함께 삭제돼요.
        </p>
      </div>
    </MyPageShell>
  );
}

export default function CareProfilePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CareProfileContent />
    </Suspense>
  );
}
