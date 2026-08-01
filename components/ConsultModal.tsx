"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { useCareProfiles } from "@/lib/useCareProfiles";

export function ConsultModal({
  facilityId,
  facilityName,
  onClose,
}: {
  facilityId: string;
  facilityName: string;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // "어르신 정보 함께 전달" — 민감정보라 기본은 끔(옵트인). 체크해야만 서버로 간다.
  const { profiles } = useCareProfiles();
  const [shareProfileId, setShareProfileId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId,
          name,
          phone,
          ...(shareProfileId ? { careProfileId: shareProfileId } : {}),
        }),
      });
      if (!res.ok) {
        // 연락처 형식·신청 제한처럼 사용자가 고칠 수 있는 이유는 그대로 알려준다.
        // "실패했어요"만 띄우면 무엇을 바꿔야 할지 알 수 없어 그냥 이탈한다.
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "");
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        (err instanceof Error && err.message) || "접수에 실패했어요. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-900/40 px-4 py-8">
      <div className="my-auto max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-900">상담 신청</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1 text-ink-300 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-700 active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 size={40} className="text-mint-500" />
            <p className="font-semibold text-ink-900">신청이 접수되었습니다</p>
            <p className="text-sm text-ink-500">{facilityName} 상담 담당자가 곧 연락드릴게요.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-xl bg-primary-500 px-5 py-2 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-95"
            >
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="mb-2 text-sm text-ink-500">
              <span className="font-semibold text-ink-900">{facilityName}</span>에 대한
              상담을 신청합니다.
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">이름</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-ink-100 px-3 py-2 text-sm transition-colors duration-150 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
                placeholder="보호자 성함"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">
                연락처
              </label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-ink-100 px-3 py-2 text-sm transition-colors duration-150 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
                placeholder="010-0000-0000"
              />
            </div>
            {/* 어르신 정보 함께 전달 — 민감정보라 기본 꺼짐(옵트인). 프로필이 있을 때만 노출 */}
            {profiles.length > 0 && (
              <div className="rounded-xl bg-ivory-100 p-3">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={shareProfileId !== null}
                    onChange={(e) =>
                      setShareProfileId(e.target.checked ? profiles[0].id : null)
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6250]"
                  />
                  <span className="text-xs leading-relaxed text-ink-700">
                    <strong className="font-bold">어르신 정보 함께 전달</strong>
                    <span className="block text-ink-500">
                      돌봄 프로필 요약(연령대·거동 수준 등)을 상담에 포함해요. 시설이 미리
                      준비된 상담을 할 수 있어요.
                    </span>
                  </span>
                </label>
                {shareProfileId !== null && profiles.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                    {profiles.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setShareProfileId(p.id)}
                        className={`flex min-h-[40px] items-center rounded-full px-3 text-[11px] font-bold ${
                          shareProfileId === p.id
                            ? "bg-primary-500 text-white"
                            : "bg-white text-ink-500 shadow-card"
                        }`}
                      >
                        {p.relation}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {error && <p className="text-xs font-semibold text-primary-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {submitting ? "접수 중..." : "상담 신청하기"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
