import { prisma } from "@/lib/prisma";

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

const WINDOW_DAYS = 30;

function ymdKst(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function shift(ymd: string, days: number): string {
  return new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

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

  // 관측이 한 번뿐이면 "추이"가 아니다 — 오늘 값은 위 CapacityMeter가 이미 보여준다
  if (rows.length < 2) return null;

  const today = ymdKst(new Date());
  const from = (() => {
    const windowStart = shift(today, -(WINDOW_DAYS - 1));
    // 관측이 시작된 날보다 앞은 그릴 게 없다(빈 왼쪽 여백이 "자료 없음"으로 오해된다)
    return rows[0].date > windowStart ? rows[0].date : windowStart;
  })();

  // forward-fill — 관측일 사이는 마지막 값이 유지된 것으로 본다
  const series: { date: string; vacancy: number; waitlist: number }[] = [];
  let cursor = 0;
  let last: (typeof rows)[number] | null = null;
  for (let d = from; d <= today; d = shift(d, 1)) {
    while (cursor < rows.length && rows[cursor].date <= d) last = rows[cursor++];
    if (!last) continue;
    series.push({
      date: d,
      vacancy: Math.max(0, last.capacity - last.currentOccupancy),
      waitlist: last.waitlistCount,
    });
  }
  if (series.length < 2) return null;

  const first = series[0];
  const latest = series[series.length - 1];
  const maxVacancy = Math.max(...series.map((s) => s.vacancy), 1);
  const vacancyDelta = latest.vacancy - first.vacancy;
  const waitDelta = latest.waitlist - first.waitlist;
  const days = series.length;

  // 한 줄 요약 — 막대만 보고 스스로 해석하게 두지 않는다(50~70대 타깃)
  const headline =
    vacancyDelta > 0
      ? `최근 ${days}일 사이 빈자리가 ${vacancyDelta}개 늘었어요.`
      : vacancyDelta < 0
        ? `최근 ${days}일 사이 빈자리가 ${Math.abs(vacancyDelta)}개 줄었어요.`
        : latest.vacancy > 0
          ? `최근 ${days}일 동안 빈자리 ${latest.vacancy}개가 그대로예요.`
          : `최근 ${days}일 동안 계속 정원이 찬 상태예요.`;

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
