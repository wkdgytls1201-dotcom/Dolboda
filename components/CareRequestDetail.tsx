"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, CheckCircle2 } from "lucide-react";
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
  const meta = typeMeta(careRequest.locationType);
  const timeRange = formatTimeRange(
    careRequest.roundTheClock,
    careRequest.startTime,
    careRequest.endTime
  );
  const days = daysBetween(careRequest.startDate, careRequest.endDate);
  const isOpen = careRequest.status === "OPEN";
  const isMatched = careRequest.status === "MATCHED";

  async function refresh() {
    const res = await fetch("/api/care-requests");
    onChange(await res.json());
  }

  async function handleCancel() {
    setBusy("cancel");
    await fetch(`/api/care-requests/${careRequest.id}`, { method: "DELETE" });
    await refresh();
    setBusy(null);
  }

  async function handleConfirm(applicationId: string) {
    setBusy(applicationId);
    await fetch(`/api/care-request-applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    await refresh();
    setBusy(null);
  }

  async function handleComplete() {
    setBusy("complete");
    await fetch(`/api/care-requests/${careRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    await refresh();
    setBusy(null);
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
            {careRequest.region}에서 활동하는 모심시터에게 지금 바로 보이기 시작해요.
          </p>
          <ul className="mx-auto max-w-[300px] space-y-2 text-left">
            {[
              "시터가 지원하면 이 화면에 지원자 목록이 떠요",
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

      <div className="mb-5">
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
            돼요. 모심시터는 의료행위(석션, 경관영양 등)를 제공할 수 없어요.
          </p>
        </Section>

        <Section title={`지원한 모심시터 ${careRequest.applications.length}명`}>
          {careRequest.applications.length === 0 ? (
            <p className="py-2 text-sm text-ink-300">
              아직 지원한 시터가 없어요. 보통 하루 이내에 지원이 들어와요.
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
                      className="min-h-[42px] w-full rounded-xl bg-primary-500 px-3 text-sm font-bold text-white transition-all duration-150 hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
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
            onClick={handleCancel}
            className="min-h-[48px] flex-1 rounded-xl border border-primary-200 text-sm font-bold text-primary-600 transition-colors duration-150 hover:bg-primary-50 active:scale-[0.98] disabled:opacity-60"
          >
            {busy === "cancel" ? "취소 중..." : "요청 취소"}
          </button>
        </div>
      )}

      {isMatched && (
        <button
          type="button"
          disabled={busy === "complete"}
          onClick={handleComplete}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink-100 py-3 text-sm font-semibold text-ink-700 transition-colors duration-150 hover:bg-ink-100 disabled:opacity-60"
        >
          <CheckCircle2 size={16} />
          {busy === "complete" ? "처리 중..." : "돌봄이 끝났어요"}
        </button>
      )}
    </main>
  );
}
