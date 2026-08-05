"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, NotebookPen, RotateCcw, Star } from "lucide-react";
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

  // 일지 요약(care-log-spec §273의 계획 실행) — "기록 18일 · 식사 잘하신 날 15일"이
  // 별점 위에 보이면 쓸 말이 생기고 평가가 후해진다. 읽음 처리 없는 stats 모드라
  // 매니저의 "읽혔어요" 표시를 건드리지 않는다. 실패하면 조용히 생략.
  const [logStats, setLogStats] = useState<{
    dayCount: number;
    mealGoodCount: number;
    photoCount: number;
  } | null>(null);
  useEffect(() => {
    fetch("/api/care-log?stats=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.stats?.dayCount > 0) setLogStats(d.stats);
      })
      .catch(() => {});
  }, []);

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
      <div className="animate-fade-up mb-6 rounded-3xl border border-mint-200 bg-gradient-to-b from-mint-50 to-white p-6 text-center">
        {/* 이 화면에 딱 한 번만 뜨는 순간이라 통통 튀는 pop을 여기 쓴다 —
            체크마크가 "완료됐다"는 걸 시각적으로도 확인해준다 */}
        <span className="animate-pop mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-mint-500 text-white shadow-soft">
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
        <section
          className="animate-fade-up mb-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card"
          style={{ animationDelay: "80ms" }}
        >
          <p className="mb-3 text-[15px] font-bold text-ink-900">
            {sitter.nickname} 매니저, 어떠셨어요?
          </p>
          {logStats && (
            <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-royal-50/70 px-3.5 py-2.5 text-[13px] text-ink-700">
              <NotebookPen size={14} className="shrink-0 text-royal-500" aria-hidden />
              <span>
                이번 돌봄 기록 {logStats.dayCount}일
                {logStats.mealGoodCount > 0 && ` · 식사 잘하신 날 ${logStats.mealGoodCount}일`}
                {logStats.photoCount > 0 && ` · 사진 ${logStats.photoCount}장`}
              </span>
            </p>
          )}
          <div className="mb-4 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`별점 ${n}점`}
                className="p-1.5 transition-transform duration-150 ease-snappy hover:scale-110 active:scale-90"
              >
                <Star
                  size={32}
                  // 방금 선택한 별까지만 pop — 이전에 이미 켜져 있던 별은 다시 튀지 않게
                  // key를 rating에 걸어 그 순간의 별들만 다시 그려지게 한다
                  key={`${n}-${n <= rating}`}
                  className={`transition-colors duration-200 ${
                    n <= rating ? "animate-pop text-accent-400" : "text-ink-100"
                  }`}
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
            className="mb-1 w-full rounded-xl border border-ink-100 px-3.5 py-3 text-sm leading-relaxed transition-shadow duration-150 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
          />
          <p className="mb-3 text-right text-[12px] text-ink-300">{comment.length}/200</p>
          {error && (
            <p
              role="alert"
              className="animate-fade-up mb-3 rounded-xl bg-primary-50 px-4 py-2.5 text-[13px] font-semibold text-primary-700"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="min-h-[50px] w-full rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
          >
            {saving ? "저장 중..." : "후기 남기기"}
          </button>
        </section>
      )}

      {careRequest.review && (
        <section className="animate-pop mb-4 rounded-2xl border border-mint-200 bg-mint-50/60 p-5 text-center shadow-card">
          <p className="text-sm font-bold text-mint-700">후기가 저장됐어요. 감사해요! 🙏</p>
        </section>
      )}

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onReuse}
          className="animate-fade-up group flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-royal-200 bg-royal-50 text-sm font-bold text-royal-700 transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-royal-100 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
          style={{ animationDelay: "160ms" }}
        >
          <RotateCcw size={16} className="transition-transform duration-300 group-hover:-rotate-180" />
          같은 조건으로 다시 요청하기
        </button>
        <button
          type="button"
          onClick={onNewRequest}
          className="animate-fade-up min-h-[52px] w-full rounded-xl border border-ink-100 bg-white text-sm font-semibold text-ink-500 transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-ink-100/60 active:translate-y-0 active:scale-[0.98]"
          style={{ animationDelay: "220ms" }}
        >
          새로운 조건으로 요청하기
        </button>
      </div>
    </main>
  );
}
