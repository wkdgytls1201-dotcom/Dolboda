import type { FeeBenchmark } from "@/lib/feeBenchmarks.generated";

// 비급여 비용 한 항목을 그 지역 같은 유형 시설의 중앙값과 나란히 보여주는 막대.
//
// 왜 필요한가: 상세페이지는 "식재료비 월 353,400원"만 보여줬다. 보호자는 그 숫자가
// 비싼 건지 싼 건지 알 방법이 없어서, 결국 시설 여러 곳을 열어 손으로 비교한다.
// 비용은 보호자 1위 관심사인데 판단 근거가 화면에 없었다.
//
// 기준값은 lib/feeBenchmarks.generated.ts(미리 구운 상수) — 런타임 조회 0.
// 중앙값을 쓴다: 상급침실료처럼 한두 곳의 극단값이 평균을 끌어올린다.

export function FeeCompareBar({
  monthly,
  benchmark,
  regionLabel,
}: {
  monthly: number;
  benchmark: FeeBenchmark;
  regionLabel: string;
}) {
  const diff = monthly - benchmark.median;
  const pct = benchmark.median > 0 ? Math.round((diff / benchmark.median) * 100) : 0;
  // 두 막대를 같은 축에 놓는다 — 큰 쪽이 100%가 되게 해서 길이 차이가 그대로 금액 차이
  const scale = Math.max(monthly, benchmark.median, 1);

  // ±5%는 "비슷하다"로 본다. 공공데이터 반올림·산정 기준 차이가 그 정도는 만든다.
  const verdict =
    Math.abs(pct) <= 5 ? "비슷" : pct < 0 ? "낮음" : "높음";
  const verdictClass =
    verdict === "낮음"
      ? "bg-mint-100 text-mint-700"
      : verdict === "높음"
        ? "bg-accent-100 text-accent-600"
        : "bg-ink-100 text-ink-500";

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <span className="w-[52px] shrink-0 text-[11px] font-bold text-ink-700">이 시설</span>
        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100/70">
          <span
            aria-hidden
            className="block h-full rounded-full bg-primary-500"
            style={{ width: `${(monthly / scale) * 100}%` }}
          />
        </span>
        <span className="w-[78px] shrink-0 text-right text-[11px] font-bold tabular-nums text-ink-900">
          {monthly.toLocaleString()}원
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="w-[52px] shrink-0 truncate text-[11px] text-ink-400">{regionLabel} 보통</span>
        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100/70">
          <span
            aria-hidden
            className="block h-full rounded-full bg-ink-300"
            style={{ width: `${(benchmark.median / scale) * 100}%` }}
          />
        </span>
        <span className="w-[78px] shrink-0 text-right text-[11px] tabular-nums text-ink-400">
          {benchmark.median.toLocaleString()}원
        </span>
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-300">
        <span className={`rounded-full px-2 py-0.5 font-bold ${verdictClass}`}>
          {verdict === "비슷"
            ? "지역 평균과 비슷해요"
            : `평균보다 ${Math.abs(pct)}% ${verdict === "낮음" ? "낮아요" : "높아요"}`}
        </span>
        <span>
          {regionLabel} 같은 유형 {benchmark.n.toLocaleString()}곳의 중앙값 기준
        </span>
      </p>
    </div>
  );
}
