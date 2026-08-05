"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, BadgeCheck, MapPin, Pencil } from "lucide-react";
import { typeMeta, type LocationTypeValue } from "@/lib/careLocationTypes";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

interface SitterSummary {
  nickname: string;
  experienceYears: number;
  intro: string | null;
  regions: string[];
  gender: string | null;
  ageBand: string | null;
  certifications: { id: string; name: string }[];
}

/** 지원 시 함께 보내는 역경매 제안 — 둘 다 선택 사항 */
export interface ApplyPayload {
  proposedAmount: number | null;
  message: string | null;
}

// 지원 전 확인 단계. 바로 POST하지 않고 "보호자에게 내 프로필이 이렇게 보여요"를
// 한 번 보여준다 — 소개가 비어 있으면 채우고 오라고 권한다(선택률이 크게 갈리는 부분).
// 역경매(2026-08-05): 제안 사례비와 한마디를 여기서 함께 받는다 — 보호자는 지원자들의
// 경력·실적·제안 금액을 나란히 보고 고른다.
export function ApplyConfirmSheet({
  job,
  onConfirm,
  onClose,
  applying,
}: {
  job: {
    locationType: LocationTypeValue;
    region: string;
    locationNote: string | null;
    budgetAmount: number | null;
    budgetUnit: string | null;
  };
  onConfirm: (payload: ApplyPayload) => void;
  onClose: () => void;
  applying: boolean;
}) {
  const [sitter, setSitter] = useState<SitterSummary | null>(null);
  const [amountText, setAmountText] = useState("");
  const [message, setMessage] = useState("");
  const meta = typeMeta(job.locationType);
  const unitLabel = (job.budgetUnit ?? "일") === "시간" ? "시간당" : "하루";

  useEffect(() => {
    fetch("/api/sitter-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSitter)
      .catch(() => setSitter(null));
  }, []);

  // 시트가 떠 있는 동안 배경 스크롤 잠금.
  // 예전엔 여기서 overflow만 hidden으로 바꿨는데, iOS에서는 그것만으로 배경이 완전히
  // 멈추지 않고 닫을 때 페이지가 맨 위로 튀었다 — 공용 훅이 스크롤 위치까지 복원한다.
  useBodyScrollLock();

  const amount = Number(amountText.replace(/[^0-9]/g, "")) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="animate-overlay-in absolute inset-0 bg-ink-900/50 backdrop-blur-[2px]"
      />
      {/* 모바일에서는 진짜 바텀시트라 아래에서 올라오는 slide-up이 자연스럽고,
          데스크톱(sm:)에서는 중앙에 뜨는 카드라 같은 애니메이션이어도 위화감이 없다 */}
      <div className="animate-slide-up relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-card-hover sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
          <div>
            <h2 className="text-lg font-bold text-ink-900">이 돌봄에 지원할까요?</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              <span className={`mr-1 rounded-full px-2 py-0.5 font-bold ${meta.badgeClass}`}>
                {meta.label}
              </span>
              {job.region}
              {job.locationNote ? ` · ${job.locationNote}` : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-300 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6">
          <p className="mb-2 text-xs font-bold text-ink-300">보호자에게 이렇게 보여요</p>
          {sitter ? (
            <div className="mb-4 rounded-2xl border border-ink-100 bg-ivory-100/60 p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-ink-900">{sitter.nickname}</span>
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700">
                  경력 {sitter.experienceYears}년
                </span>
                {(sitter.gender || sitter.ageBand) && (
                  <span className="rounded-full bg-ink-100/70 px-2 py-0.5 text-[11px] font-bold text-ink-500">
                    {[sitter.gender, sitter.ageBand].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              {sitter.certifications.length > 0 && (
                <p className="mb-1 flex flex-wrap items-center gap-1 text-xs text-ink-500">
                  <BadgeCheck size={13} className="text-mint-600" />
                  {sitter.certifications.map((c) => c.name).join(", ")}
                </p>
              )}
              <p className="mb-2 flex items-center gap-1 text-xs text-ink-500">
                <MapPin size={12} />
                활동 지역: {sitter.regions.join(", ")}
              </p>
              {sitter.intro ? (
                <p className="text-sm leading-relaxed text-ink-700">{sitter.intro}</p>
              ) : (
                // 소개가 없으면 지원을 막지는 않되, 채우고 오도록 권한다
                <div className="rounded-xl bg-accent-50 p-3">
                  <p className="text-xs leading-relaxed text-ink-700">
                    아직 소개글이 없어요. 어떤 마음으로 돌보는지 한두 줄만 적어도 보호자의
                    선택이 크게 달라져요.
                  </p>
                  <Link
                    href="/mypage/sitter/profile"
                    className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700"
                  >
                    <Pencil size={12} />
                    소개글 쓰러 가기
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 h-28 animate-pulse rounded-2xl bg-ink-100/60" />
          )}

          {/* 역경매 제안 — 금액도 한마디도 선택. 보호자 희망가를 참고로 보여준다 */}
          <div className="mb-4 space-y-3">
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-ink-500">
                제안 사례비 <span className="font-normal text-ink-300">(선택)</span>
              </p>
              <label className="flex items-center gap-2 rounded-xl border border-ink-100 px-3.5 py-2.5 focus-within:border-primary-400">
                <span className="shrink-0 text-[13px] font-semibold text-ink-500">{unitLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount ? amount.toLocaleString() : ""}
                  onChange={(e) => setAmountText(e.target.value)}
                  placeholder={
                    job.budgetAmount ? job.budgetAmount.toLocaleString() : "금액 입력"
                  }
                  className="min-w-0 flex-1 bg-transparent text-right text-[15px] font-bold text-ink-900 outline-none"
                />
                <span className="shrink-0 text-[13px] text-ink-400">원</span>
              </label>
              <p className="mt-1 text-[11px] text-ink-300">
                {job.budgetAmount
                  ? `보호자 희망: ${unitLabel} ${job.budgetAmount.toLocaleString()}원 — 비워두면 "협의"로 전달돼요`
                  : "보호자가 금액을 정하지 않은 요청이에요 — 제안하시면 선택에 도움이 돼요"}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-ink-500">
                보호자께 한마디 <span className="font-normal text-ink-300">(선택)</span>
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="이 요청에 맞춰 어떻게 돌볼 수 있는지 짧게 적어보세요"
                className="w-full resize-none rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400"
              />
            </div>
          </div>

          <p className="mb-4 rounded-xl bg-ink-100/40 p-3 text-xs leading-relaxed text-ink-500">
            지원하면 보호자가 프로필과 제안을 보고 연락 여부를 정해요. 확정 전에는 연락처가
            공개되지 않고, 지원은 언제든 취소할 수 있어요.
          </p>
        </div>

        <div className="flex gap-2 border-t border-ink-100 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 sm:p-6 sm:pt-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[50px] flex-1 rounded-xl border border-ink-100 text-sm font-bold text-ink-500 transition-colors duration-150 hover:bg-ink-100"
          >
            다시 볼게요
          </button>
          <button
            type="button"
            disabled={applying || !sitter}
            onClick={() =>
              onConfirm({
                proposedAmount: amount > 0 ? amount : null,
                message: message.trim() || null,
              })
            }
            className="min-h-[50px] flex-[2] rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
          >
            {applying ? "지원하는 중..." : "이 제안으로 지원하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
