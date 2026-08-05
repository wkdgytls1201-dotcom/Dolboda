"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, FileSignature, CheckCircle2, NotebookPen } from "lucide-react";
import { typeMeta } from "@/lib/careLocationTypes";
import { formatTimeRange, daysBetween } from "@/lib/careOptions";
import type { CareRequestData } from "@/lib/careRequestTypes";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <h2 className="mb-2 font-bold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

function Chips({ items, tone = "ink" }: { items: string[]; tone?: "ink" | "mint" }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((c) => (
        <span
          key={c}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            tone === "mint" ? "bg-mint-100 text-mint-700" : "bg-ink-100/60 text-ink-700"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function CareRequestDetail({
  careRequest,
  onEdit,
  onChange,
  justCreated = false,
}: {
  careRequest: CareRequestData;
  onEdit: () => void;
  onChange: (r: CareRequestData) => void;
  /** 방금 등록을 마친 직후인지 — 축하 배너와 다음 단계 안내를 보여준다 */
  justCreated?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  // "돌봄이 끝났어요"는 되돌릴 수 없는 액션 — 바로 실행하지 않고 확인을 한 번 거친다
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  // 취소도 마찬가지 — 특히 지원자가 있거나 매칭이 확정된 뒤에는 상대방에게 영향이 간다
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const meta = typeMeta(careRequest.locationType);
  const timeRange = formatTimeRange(
    careRequest.roundTheClock,
    careRequest.startTime,
    careRequest.endTime
  );
  const days = daysBetween(careRequest.startDate, careRequest.endDate);
  const isOpen = careRequest.status === "OPEN";
  const isMatched = careRequest.status === "MATCHED";
  // 취소 경고에 "몇 분에게 안내가 가는지"를 정확히 적기 위해 대기 중인 지원만 센다
  const pendingCount = careRequest.applications.filter((a) => a.status === "지원완료").length;

  async function refresh() {
    const res = await fetch("/api/care-requests");
    // res.ok를 안 보면 401·404 응답({error:"..."})이 돌봄 요청 자리에 들어가서
    // 아래 careRequest.locationType 같은 접근이 전부 undefined가 되고 화면이 죽는다.
    if (!res.ok) return;
    onChange(await res.json());
  }

  // 세 핸들러 모두 try/finally — 네트워크가 끊기면 fetch가 throw해서 setBusy(null)에
  // 못 미치고, 버튼이 영영 잠긴 채 남았다. 실패해도 refresh를 안 했으니 화면 상태는
  // 그대로라 다시 누르면 된다(서버 가드가 중복 처리를 막아준다).
  async function handleCancel() {
    setShowCancelConfirm(false);
    setBusy("cancel");
    try {
      await fetch(`/api/care-requests/${careRequest.id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirm(applicationId: string) {
    setBusy(applicationId);
    try {
      await fetch(`/api/care-request-applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleComplete() {
    setShowCompleteConfirm(false);
    setBusy("complete");
    try {
      await fetch(`/api/care-requests/${careRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const recipientLine = [
    careRequest.recipientGender,
    careRequest.recipientAgeBand,
    careRequest.recipientWeightBand,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto max-w-xl px-4 py-8 pb-24">
      {justCreated && isOpen && (
        <div className="mb-6 overflow-hidden rounded-3xl border border-primary-100 bg-gradient-to-b from-primary-50 to-white p-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-soft">
            <CheckCircle2 size={28} />
          </span>
          <h2 className="mb-1.5 text-lg font-bold text-ink-900">돌봄 요청이 올라갔어요</h2>
          <p className="mb-4 text-sm leading-relaxed text-ink-500">
            {careRequest.region}에서 활동하는 돌보다 매니저에게 지금 바로 보이기 시작해요.
          </p>
          <ul className="mx-auto max-w-[300px] space-y-2 text-left">
            {[
              "매니저가 지원하면 이 화면에 지원자 목록이 떠요",
              "프로필을 보고 마음에 드는 분을 확정하세요",
              "확정 전까지 내용은 언제든 수정할 수 있어요",
            ].map((t, i) => (
              <li key={t} className="flex gap-2.5 text-xs leading-relaxed text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 은은한 보라 그라데이션 — 값 끝은 흰색이라 아래 카드들과 이어 붙는다 */}
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-royal-50 to-white p-5">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-ink-900">내 돌봄 요청</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badgeClass}`}>
            {meta.label}
          </span>
        </div>
        <p className="text-sm text-ink-500">
          {isMatched
            ? "매칭이 확정됐어요"
            : isOpen
            ? `지원자를 기다리고 있어요 · 현재 ${careRequest.applications.length}명 지원`
            : "종료된 요청이에요"}
        </p>
      </div>

      {isMatched && (
        <div className="mb-4 space-y-2.5">
          {/* 합의서를 확인서보다 앞에 둔다 — 확정 직후 해야 할 일이 서명이기 때문 */}
          <Link
            href="/care-request/agreement"
            className="flex items-center gap-3 rounded-2xl border-2 border-royal-200 bg-royal-50 p-4 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:bg-royal-100"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-royal-600">
              <FileSignature size={19} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-ink-900">돌봄 합의서 작성·서명</span>
              <span className="block text-xs leading-snug text-ink-500">
                기간·업무 범위·사례비를 문서로 남기고 두 분이 서명해요
              </span>
            </span>
          </Link>
          <Link
            href="/care-request/confirmation"
            className="flex items-center gap-3 rounded-2xl border border-mint-200 bg-mint-50 p-4 transition-colors duration-150 hover:bg-mint-100"
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
          {/* 돌봄일지 — 서명이 끝나면 그 다음부터 실제 돌봄이 몇 달 이어지는데, 그동안 앱을
              열 이유가 없었다(docs/care-log-spec.md §1-1). 매칭 직후부터 눈에 띄게 둔다. */}
          <Link
            href="/care-request/care-log"
            className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4 transition-colors duration-150 hover:bg-primary-100"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <NotebookPen size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-ink-900">돌봄일지 보기</span>
              <span className="block text-xs text-ink-500">
                오늘 어머니는 어떠셨는지, 매니저님이 남긴 기록을 확인해요.
              </span>
            </span>
          </Link>
        </div>
      )}

      <div className="space-y-4">
        <Section title="일정과 장소">
          <dl className="text-sm">
            <Row label="지역" value={careRequest.region} />
            <Row label="장소" value={careRequest.locationNote} />
            <Row
              label="기간"
              value={`${careRequest.startDate.slice(0, 10)} ~ ${careRequest.endDate.slice(
                0,
                10
              )} (${days}일)`}
            />
            <Row label="시간" value={timeRange} />
            <Row
              label="방문"
              value={
                careRequest.visitsPerWeek
                  ? `주 ${careRequest.visitsPerWeek}회${
                      careRequest.visitHours ? ` · 1회 ${careRequest.visitHours}시간` : ""
                    }`
                  : null
              }
            />
            <Row label="병원 출입" value={careRequest.hospitalEntry} />
            <Row label="병실" value={careRequest.roomType} />
            <Row label="입원 사유" value={careRequest.admissionReason} />
            <Row label="수술 예정" value={careRequest.surgeryPlan} />
          </dl>
        </Section>

        <Section title="돌봄 받으실 분">
          <dl className="text-sm">
            <Row label="성함" value={careRequest.recipientName} />
            <Row label="관계" value={careRequest.recipientRelation} />
            <Row label="정보" value={recipientLine || null} />
          </dl>
        </Section>

        <Section title="필요한 도움">
          {careRequest.situation && (
            <p className="mb-2 text-sm leading-relaxed text-ink-700">{careRequest.situation}</p>
          )}
          <Chips items={careRequest.householdTasks} tone="mint" />
          <dl className="text-sm">
            <Row label="거동" value={careRequest.mobilityLevel} />
            <Row label="식사" value={careRequest.mealAssistLevel} />
            <Row label="배변" value={careRequest.toiletAssistLevel} />
          </dl>
          <Chips items={careRequest.conditions} />
        </Section>

        <Section title="원하시는 조건">
          <dl className="text-sm">
            <Row label="선호 성별" value={careRequest.sitterGenderPref} />
            <Row
              label="희망 사례비"
              value={
                careRequest.budgetAmount
                  ? `${careRequest.budgetUnit === "시간" ? "시간당" : "하루"} ${careRequest.budgetAmount.toLocaleString()}원`
                  : null
              }
            />
          </dl>
          <Chips items={careRequest.specialRequests} />
          {careRequest.requestNote && (
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{careRequest.requestNote}</p>
          )}
          <p className="mt-3 rounded-xl bg-ink-100/40 p-3 text-xs leading-relaxed text-ink-500">
            사례비는 돌보다가 정하거나 중개하지 않아요. 매칭이 확정된 뒤 두 분이 직접 정하시면
            돼요. 돌보다 매니저는 의료행위(석션, 경관영양 등)를 제공할 수 없어요.
          </p>
        </Section>

        <Section title={`지원한 돌보다 매니저 ${careRequest.applications.length}명`}>
          {careRequest.applications.length === 0 ? (
            <p className="py-2 text-sm text-ink-300">
              아직 지원한 매니저가 없어요. 보통 하루 이내에 지원이 들어와요.
            </p>
          ) : (
            <div className="space-y-3">
              {careRequest.applications.map((app) => (
                <div key={app.id} className="rounded-xl bg-ink-100/30 p-3.5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-bold text-ink-900">{app.sitterProfile.nickname}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        app.status === "매칭확정"
                          ? "bg-mint-100 text-mint-700"
                          : app.status === "돌봄완료"
                          ? "bg-royal-50 text-royal-700"
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
                  {/* 돌보다 안에서 검증된 실적 — 자기 신고 경력과 구분되는 신뢰 신호.
                      실적이 없으면 아무것도 안 붙인다(0건을 굳이 광고하지 않는다) */}
                  {app.stats && app.stats.completedCount > 0 && (
                    <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-royal-600">
                      <CheckCircle2 size={12} className="shrink-0" />
                      돌보다에서 돌봄 완료 {app.stats.completedCount}건
                      {app.stats.avgRating != null &&
                        ` · ★${app.stats.avgRating} (후기 ${app.stats.reviewCount})`}
                    </p>
                  )}
                  {app.sitterProfile.intro && (
                    <p className="mb-2 text-sm leading-relaxed text-ink-700">
                      {app.sitterProfile.intro}
                    </p>
                  )}
                  {isOpen && (
                    <button
                      type="button"
                      disabled={busy === app.id}
                      onClick={() => handleConfirm(app.id)}
                      className="min-h-[44px] w-full rounded-xl bg-primary-500 px-3 text-sm font-bold text-white transition-all duration-150 hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
                    >
                      {busy === app.id ? "처리 중..." : "이 분과 함께할래요"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {isOpen && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-[48px] flex-1 rounded-xl border border-ink-100 text-sm font-bold text-ink-700 transition-colors duration-150 hover:bg-ink-100 active:scale-[0.98]"
          >
            요청 수정
          </button>
          <button
            type="button"
            disabled={busy === "cancel"}
            onClick={() => setShowCancelConfirm(true)}
            className="min-h-[48px] flex-1 rounded-xl border border-primary-200 text-sm font-bold text-primary-600 transition-colors duration-150 hover:bg-primary-50 active:scale-[0.98] disabled:opacity-60"
          >
            {busy === "cancel" ? "취소 중..." : "요청 취소"}
          </button>
        </div>
      )}

      {isMatched && (
        <>
          <button
            type="button"
            disabled={busy === "complete"}
            onClick={() => setShowCompleteConfirm(true)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink-100 py-3 text-sm font-semibold text-ink-700 transition-colors duration-150 hover:bg-ink-100 disabled:opacity-60"
          >
            <CheckCircle2 size={16} />
            {busy === "complete" ? "처리 중..." : "돌봄이 끝났어요"}
          </button>

          {/* 확정 뒤에도 사정이 생길 수 있다(어르신 입원·상황 변화). 예전에는 이 자리에
              취소 경로가 아예 없어서, 매니저에게 알리지도 못한 채 방치될 수밖에 없었다.
              정상 흐름이 아니므로 눈에 덜 띄게 두되, 누르면 영향을 분명히 알린다. */}
          <button
            type="button"
            disabled={busy === "cancel"}
            onClick={() => setShowCancelConfirm(true)}
            className="mt-6 w-full text-center text-[13px] text-ink-300 underline underline-offset-2 transition-colors hover:text-primary-600 disabled:opacity-60"
          >
            {busy === "cancel" ? "취소 중..." : "사정이 생겨 돌봄을 취소해야 해요"}
          </button>
        </>
      )}

      {/* 완료 확인 — 누르는 순간 요청이 종료되고 되돌릴 수 없으므로,
          무엇이 바뀌는지 먼저 알려주고 한 번 더 묻는다 */}
      {showCompleteConfirm && (
        <div
          className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4"
          onClick={() => setShowCompleteConfirm(false)}
        >
          <div
            className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1.5 text-base font-bold text-ink-900">돌봄을 완료 처리할까요?</h2>
            <ul className="mb-5 space-y-1.5 text-sm leading-relaxed text-ink-500">
              <li>· 이 요청은 종료되고 다시 열 수 없어요</li>
              <li>· 함께한 매니저에게 &quot;돌봄 완료&quot;로 기록돼요</li>
              <li>· 완료 후에 별점·후기를 남길 수 있어요</li>
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(false)}
                className="min-h-[48px] flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:bg-ink-100/60"
              >
                아직이에요
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="min-h-[48px] flex-[1.4] rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
              >
                네, 돌봄이 끝났어요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 취소 확인 — 상대방에게 미치는 영향이 상황마다 달라서 문구도 다르게 보여준다.
          지원자가 이미 있거나 매칭이 확정된 뒤라면 그 사실을 먼저 알려준다. */}
      {showCancelConfirm && (
        <div
          className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1.5 text-base font-bold text-ink-900">
              {isMatched ? "확정된 돌봄을 취소할까요?" : "돌봄 요청을 취소할까요?"}
            </h2>
            <ul className="mb-5 space-y-1.5 text-sm leading-relaxed text-ink-500">
              {isMatched ? (
                <>
                  <li>· 함께하기로 한 매니저에게 취소 안내가 전달돼요</li>
                  <li>· 매니저는 이미 그 날짜를 비워두었을 수 있어요</li>
                  <li>
                    · 합의서에 서명하셨다면 미리 알리기로 한 약속(제7조)이 있어요.
                    가능하면 먼저 연락해 사정을 알려주세요
                  </li>
                  <li>· 취소한 요청은 되돌릴 수 없어요</li>
                </>
              ) : (
                <>
                  {pendingCount > 0 && (
                    <li>· 지원해주신 매니저 {pendingCount}명에게 취소 안내가 전달돼요</li>
                  )}
                  <li>· 이 요청은 매니저 목록에서 사라져요</li>
                  <li>· 취소한 요청은 되돌릴 수 없어요</li>
                </>
              )}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="min-h-[48px] flex-[1.4] rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
              >
                아니요, 유지할게요
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-[48px] flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:bg-ink-100/60"
              >
                취소할게요
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
