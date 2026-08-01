"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useCareProfiles, type CareProfileSummary } from "@/lib/careProfileContext";

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

function formFrom(p: CareProfileSummary): FormState {
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
  const router = useRouter();
  const estimateFromTest = params.get("estimate");
  // URL 쿼리를 그대로 두고 계속 읽으면, 이 추정치를 프로필 A에 저장한 뒤 같은 방문에서
  // "다른 어르신 추가"로 프로필 B를 만들어도 B에 같은 추정치가 또 붙는다.
  // 세션당 한 번만 쓰고 나면 지워지는 로컬 상태로 옮겨서, 첫 저장에만 반영되게 한다.
  const [pendingEstimate, setPendingEstimate] = useState(estimateFromTest);
  useEffect(() => {
    if (estimateFromTest) router.replace("/mypage/care-profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 목록은 루트에 마운트된 CareProfileProvider가 세션당 한 번만 받아온 것을 공유한다
  // (app/layout.tsx 참고) — 이 페이지가 따로 fetch하지 않는다.
  const { profiles: items, loaded, add, replace: replaceProfile, remove: removeFromContext } =
    useCareProfiles();
  // null = 목록 보기, "new" = 새로 만들기, 그 외 = 해당 id 수정
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    // 테스트에서 넘어왔는데(pendingEstimate) 프로필이 하나도 없으면 바로 만들기 화면으로.
    // loaded가 이미 true인 채로 이 페이지에 들어왔어도(다른 화면에서 먼저 받아둔 경우)
    // 마운트 시 한 번은 실행되니 그 경우도 그대로 커버된다.
    if (loaded && pendingEstimate && items.length === 0) setEditing("new");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function startNew() {
    setForm(EMPTY);
    setConsent(false);
    setError(null);
    setEditing("new");
  }

  function startEdit(p: CareProfileSummary) {
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
          // 테스트에서 넘어온 추정 구간 — 이번 저장 한 번에만 반영하고 바로 비운다
          ...(pendingEstimate ? { estimatedBand: pendingEstimate } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "");
      if (isNew) add(data);
      else replaceProfile(data);
      if (pendingEstimate) setPendingEstimate(null);
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
      removeFromContext(id);
      setConfirmDelete(null);
      setEditing(null);
    }
  }

  /* ---------- 입력 화면 ---------- */
  if (editing !== null) {
    const isNew = editing === "new";
    return (
      <MyPageShell>
        {/* editing 값이 바뀔 때마다(목록↔새로 만들기↔다른 프로필 수정) key로 리마운트해
            매번 살짝 떠오르며 들어오게 한다 — 화면이 툭 끊겨 바뀌지 않게 */}
        <h2 key={editing} className="animate-fade-up mb-2 text-xl font-bold text-ink-900">
          {isNew ? "보호자 프로필 만들기" : "보호자 프로필 수정"}
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-ink-500">
          한 번 저장해두면 시설 찾기와 돌봄 요청에서 다시 입력할 필요가 없어요.
          <span className="block text-ink-400">모든 항목은 선택이고, 언제든 삭제할 수 있어요.</span>
        </p>

        {pendingEstimate && (
          <NoticeBox>
            등급테스트 결과(예상 구간)가 이 프로필에 함께 저장돼요. 실제 등급은 공단
            방문조사로 결정되며, 화면에는 항상 &quot;예상&quot;으로 표시돼요.
          </NoticeBox>
        )}

        <div
          className="animate-fade-up mt-4 space-y-5 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
          style={{ animationDelay: "60ms" }}
        >
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
          <label
            className={`mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors duration-200 ${
              consent ? "border-primary-200 bg-primary-50/50" : "border-ink-100 bg-white"
            }`}
          >
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
          <p
            role="alert"
            className="animate-fade-up mt-3 rounded-xl bg-primary-50 px-4 py-3 text-[13px] font-semibold text-primary-700"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="min-h-[52px] flex-1 rounded-xl border border-ink-100 bg-white text-sm font-bold text-ink-500 transition-all duration-200 ease-snappy hover:bg-ink-100/60 active:scale-[0.98]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="min-h-[52px] flex-[2] rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
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
        보호자 프로필
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-ink-500">
        모시는 어르신의 상태를 저장해두면 돌봄 요청을 올릴 때 자동으로 채워져요.
      </p>

      {!loaded && <PageLoader compact />}

      {loaded && items.length === 0 && (
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

      {items.length > 0 && (
        <>
          <div className="space-y-3">
            {items.map((p, i) => {
              const summary = [p.ageBand, p.gender, p.mobilityLevel].filter(Boolean).join(" · ");
              const estimate = estimatedLabel(p.estimatedBand);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => startEdit(p)}
                  className="animate-fade-up block w-full rounded-2xl bg-white p-5 text-left shadow-card transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99]"
                  style={{ animationDelay: `${i * 70}ms` }}
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
