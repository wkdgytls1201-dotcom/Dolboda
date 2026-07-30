"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId, facilityName, name, phone }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("접수에 실패했어요. 잠시 후 다시 시도해주세요.");
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
