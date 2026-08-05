import { prisma } from "@/lib/prisma";
import { buildVacancySeries, trendHeadline, ymdKst } from "@/lib/vacancyTrend";
import { computeVacancyInsight, insightSentences } from "@/lib/vacancyInsight";

// 자리 추이 — 매일 쌓이는 FacilitySnapshot(정원·현원·대기)을 처음으로 화면에 쓴다.
//
// 왜 만들었나: 상세페이지는 "오늘 몇 자리 비었나" 한 점만 보여준다. 그런데 보호자가
// 실제로 궁금한 건 "자리가 나고 있는 곳인가, 계속 꽉 차 있나"다 — 대기를 걸지 말지가
// 여기서 갈린다. 공단은 오늘 값만 공개하므로 이 추이는 우리가 매일 모아야만 생기는
// 데이터이고, 다른 곳에 없다(6차 인수인계의 "대기 소진 속도" 자산).
//
// 스냅샷은 **바뀐 시설만** 그날 값으로 적재한다(scripts/daily-nhis-sync.mjs). 그래서
// 날짜가 듬성듬성하다 — 마지막으로 관측된 값을 다음 관측일까지 이어 붙여야(forward-fill)
// 실제 하루하루의 상태가 된다. 이걸 안 하면 "기록이 없는 날 = 자리 0"으로 잘못 읽힌다.
//
// 서버 컴포넌트라 HTML에 그대로 실린다(SEO·AI 검색이 읽을 수 있는 고유 정보).
// 차트 라이브러리를 쓰지 않는다 — 막대는 CSS 높이(%)뿐이라 클라이언트 JS 0바이트.
//
// 지표(회전 횟수·만실 비율·대기 소진 속도·예상 대기)는 lib/vacancyInsight.ts가 계산하고,
// 관측 7일 미만이면 아예 만들지 않는다. 설계·한계는 docs/vacancy-insight-spec.md 참고 —
// 특히 §4(하면 안 되는 것)는 문구를 손대기 전에 반드시 읽을 것.

export async function VacancyTrend({
  facilityId,
  capacity,
}: {
  facilityId: string;
  capacity: number;
}) {
  // 입소 정원이 없는 유형(방문요양 등)은 "자리" 개념 자체가 없다
  if (capacity <= 0) return null;

  const rows = await prisma.facilitySnapshot
    .findMany({
      where: { facilityId },
      orderBy: { date: "asc" },
      select: { date: true, capacity: true, currentOccupancy: true, waitlistCount: true },
    })
    .catch(() => []);

  // 계산은 lib/vacancyTrend.ts(순수 함수) — 시나리오를 바꿔가며 검증하려고 떼어냈다
  const series = buildVacancySeries(rows, ymdKst(new Date()));
  if (series.length === 0) return null;

  const first = series[0];
  const latest = series[series.length - 1];
  const maxVacancy = Math.max(...series.map((s) => s.vacancy), 1);
  const waitDelta = latest.waitlist - first.waitlist;
  const days = series.length;
  const headline = trendHeadline(series);
  // 관측 7일 미만이면 null — 짧은 기간으로 "회전율"을 말하면 갱신 지연을 추세로 오해한다
  const insight = computeVacancyInsight(series);
  const sentences = insight ? insightSentences(insight) : null;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-card">
      <h3 className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm font-bold text-ink-900">
        자리 추이
        <span className="text-[11px] font-semibold text-ink-300">
          돌보다가 매일 모은 기록 · 공단 공개값 기준
        </span>
      </h3>
      <p className="mb-3 break-keep text-[13px] leading-relaxed text-ink-700">{headline}</p>

      {/* 막대 하나가 하루. 높이는 그 날의 빈자리 수(최대값 기준 비율) */}
      <div
        className="flex h-16 items-end gap-[2px]"
        role="img"
        aria-label={`최근 ${days}일 빈자리 추이. ${first.date} ${first.vacancy}자리에서 ${latest.date} ${latest.vacancy}자리로 변했어요.`}
      >
        {series.map((s) => (
          <span
            key={s.date}
            title={`${s.date} — 빈자리 ${s.vacancy}개${s.waitlist > 0 ? ` · 대기 ${s.waitlist}명` : ""}`}
            className={`min-w-0 flex-1 rounded-t-[3px] ${
              s.vacancy > 0 ? "bg-mint-500" : "bg-ink-100"
            }`}
            // 빈자리 0인 날도 바닥에 얇게 남긴다 — 막대가 아예 없으면 "자료 없음"으로 보인다
            style={{ height: `${Math.max(6, (s.vacancy / maxVacancy) * 100)}%` }}
          />
        ))}
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-ink-300">
        <span>{first.date.slice(5).replace("-", ".")}</span>
        <span>{latest.date.slice(5).replace("-", ".")}</span>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink-100 pt-2.5 text-[12px]">
        <div className="flex items-center gap-1.5">
          <dt className="text-ink-400">지금 빈자리</dt>
          <dd className="font-bold text-ink-900">{latest.vacancy}개</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="text-ink-400">대기</dt>
          <dd className="font-bold text-ink-900">
            {latest.waitlist > 0 ? `${latest.waitlist}명` : "없음"}
            {waitDelta !== 0 && (
              <span className={`ml-1 font-semibold ${waitDelta > 0 ? "text-primary-600" : "text-mint-600"}`}>
                {waitDelta > 0 ? `+${waitDelta}` : waitDelta}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {/* 자리 인사이트 — 관측 7일 이상일 때만 나온다(그 미만은 insight가 null).
          관측된 사실(facts)과 추정(estimate)을 시각적으로 구분한다: 사실은 본문 색,
          추정은 별도 상자에 "추정" 딱지를 달아 우리가 보증하는 말이 아님을 분명히 한다.
          docs/vacancy-insight-spec.md §4 참고. */}
      {insight && (
        <div className="mt-3 border-t border-ink-100 pt-3">
          <p className="mb-1.5 text-[11px] font-bold text-ink-500">
            이 기간에 관찰된 것
          </p>
          <ul className="space-y-1">
            {sentences!.facts.map((s) => (
              <li key={s} className="flex gap-1.5 break-keep text-[12px] leading-relaxed text-ink-700">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-300" />
                {s}
              </li>
            ))}
          </ul>
          {sentences!.estimate && (
            <p className="mt-2 break-keep rounded-xl bg-royal-50 px-3 py-2 text-[12px] leading-relaxed text-royal-700">
              <span className="mr-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold">
                추정
              </span>
              {sentences!.estimate}
            </p>
          )}
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-300">{sentences!.caveat}</p>
        </div>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
        공단이 공개하는 값을 매일 저장해 그린 그래프예요. 실제 입소 가능 여부는 시설에 직접
        확인해 주세요.
      </p>
    </section>
  );
}

export function VacancyTrendSkeleton() {
  return (
    <section className="animate-pulse rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-2 h-4 w-24 rounded bg-ink-100" />
      <div className="mb-3 h-3 w-3/5 rounded bg-ink-100" />
      <div className="h-16 rounded bg-ink-100/60" />
    </section>
  );
}
