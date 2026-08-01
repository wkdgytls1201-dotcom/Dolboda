"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Star } from "lucide-react";
import type { CareRequestData } from "@/lib/careRequestTypes";

// 돌봄 완료 직후 화면 — 예전엔 "돌봄이 끝났어요"를 누르는 순간 새 요청 폼으로
// 화면이 확 바뀌어서, 후기를 남길 자리도 마무리 인사도 없었다.
// 여기서 세 가지가 한 번에 이뤄진다:
//   1) 함께한 매니저에게 별점·한줄평 (매니저의 "돌보다 인증 경력"이 되는 데이터)
//   2) 같은 조건으로 다시 요청 (병원 간병은 재입원으로 반복되는 수요)
//   3) 새로 요청 만들기
export function CareReviewPrompt({
  careRequest,
  onReviewed,
  onReuse,
  onNewRequest,
}: {
  careRequest: CareRequestData;
  /** 후기 저장이 끝났을 때 (careRequest에 review 반영해 돌려준다) */
  onReviewed: (r: CareRequestData) => void;
  /** 같은 조건으로 새 요청 작성 시작 */
  onReuse: () => void;
  /** 빈 폼으로 새 요청 작성 시작 */
  onNewRequest: () => void;
}) {
  const sitter = careRequest.applications.find((a) => a.status === "돌봄완료")?.sitterProfile;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating < 1) {
      setError("별점을 골라주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/care-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careRequestId: careRequest.id,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "");
      onReviewed({ ...careRequest, review: { id: data.id, rating } });
    } catch (e) {
      setError(
        (e instanceof Error && e.message) || "저장하지 못했어요. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 pb-24">
      <div className="mb-6 rounded-3xl border border-mint-200 bg-gradient-to-b from-mint-50 to-white p-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-mint-500 text-white shadow-soft">
          <CheckCircle2 size={28} />
        </span>
        <h1 className="mb-1.5 text-lg font-bold text-ink-900">돌봄이 잘 마무리됐어요</h1>
        <p className="text-sm leading-relaxed text-ink-500">
          고생 많으셨어요. 함께한 매니저에게 한마디 남겨주시면
          <br />
          다음 보호자가 매니저를 고르는 데 큰 도움이 돼요.
        </p>
      </div>

      {sitter && !careRequest.review && (
        <section className="mb-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <p className="mb-3 text-[15px] font-bold text-ink-900">
            {sitter.nickname} 매니저, 어떠셨어요?
          </p>
          <div className="mb-4 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`별점 ${n}점`}
                className="p-1.5 transition-transform active:scale-90"
              >
                <Star
                  size={32}
                  className={n <= rating ? "text-accent-400" : "text-ink-100"}
                  fill={n <= rating ? "currentColor" : "none"}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="(선택) 어떤 점이 좋았는지 적어주세요 — 매니저 프로필에 표시돼요"
            className="mb-1 w-full rounded-xl border border-ink-100 px-3.5 py-3 text-sm leading-relaxed focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
          />
          <p className="mb-3 text-right text-[12px] text-ink-300">{comment.length}/200</p>
          {error && (
            <p role="alert" className="mb-3 rounded-xl bg-primary-50 px-4 py-2.5 text-[13px] font-semibold text-primary-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="min-h-[50px] w-full rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-colors hover:bg-primary-600 disabled:opacity-60"
          >
            {saving ? "저장 중..." : "후기 남기기"}
          </button>
        </section>
      )}

      {careRequest.review && (
        <section className="mb-4 rounded-2xl border border-ink-100 bg-white p-5 text-center shadow-card">
          <p className="text-sm font-bold text-ink-900">후기가 저장됐어요. 감사해요! 🙏</p>
        </section>
      )}

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onReuse}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-royal-200 bg-royal-50 text-sm font-bold text-royal-700 transition-colors hover:bg-royal-100"
        >
          <RotateCcw size={16} />
          같은 조건으로 다시 요청하기
        </button>
        <button
          type="button"
          onClick={onNewRequest}
          className="min-h-[52px] w-full rounded-xl border border-ink-100 bg-white text-sm font-semibold text-ink-500 transition-colors hover:bg-ink-100/60"
        >
          새로운 조건으로 요청하기
        </button>
      </div>
    </main>
  );
}
