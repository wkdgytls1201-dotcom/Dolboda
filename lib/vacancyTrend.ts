// 자리 추이 계산 — FacilitySnapshot(정원·현원·대기)을 하루 단위 시계열로 편다.
//
// 화면(app/facility/[id]/VacancyTrend.tsx)에서 떼어낸 이유는 하나다: 이 계산에
// 까다로운 규칙이 몇 개 있어서 시나리오를 바꿔가며 검증할 수 있어야 한다.
//
// 핵심 규칙: 스냅샷은 **바뀐 시설만** 그날 값으로 적재한다(scripts/daily-nhis-sync.mjs).
// 그래서 날짜가 듬성듬성하다 — 마지막으로 관측된 값을 다음 관측일까지 이어 붙여야
// (forward-fill) 실제 하루하루의 상태가 된다. 이걸 안 하면 "기록이 없는 날 = 자리 0"으로
// 잘못 읽힌다.

export const TREND_WINDOW_DAYS = 30;

export interface SnapshotRow {
  date: string; // YYYY-MM-DD
  capacity: number;
  currentOccupancy: number;
  waitlistCount: number;
}

export interface TrendPoint {
  date: string;
  vacancy: number;
  waitlist: number;
}

export function ymdKst(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export function shiftYmd(ymd: string, days: number): string {
  return new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * 관측값들을 최근 창(기본 30일) 안의 하루 단위 시계열로 편다.
 * 관측이 2회 미만이면 "추이"라 부를 수 없으므로 빈 배열을 돌려준다.
 */
export function buildVacancySeries(
  rows: SnapshotRow[],
  today: string,
  windowDays = TREND_WINDOW_DAYS
): TrendPoint[] {
  if (rows.length < 2) return [];
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1));

  const windowStart = shiftYmd(today, -(windowDays - 1));
  // 관측이 시작된 날보다 앞은 그릴 게 없다(빈 왼쪽 여백이 "자료 없음"으로 오해된다)
  const from = sorted[0].date > windowStart ? sorted[0].date : windowStart;

  const series: TrendPoint[] = [];
  let cursor = 0;
  let last: SnapshotRow | null = null;
  // 창 시작 이전의 관측도 "마지막 값"으로는 유효하다 — 창 안에 관측이 없는 날의
  // 상태를 채우려면 그 이전 값을 알아야 한다.
  for (let d = from; d <= today; d = shiftYmd(d, 1)) {
    while (cursor < sorted.length && sorted[cursor].date <= d) last = sorted[cursor++];
    if (!last) continue;
    series.push({
      date: d,
      // 원본에 현원 > 정원인 행이 있다(공단 집계 시점 차이) — 음수 자리는 뜻이 없어 0으로 본다
      vacancy: Math.max(0, last.capacity - last.currentOccupancy),
      waitlist: last.waitlistCount,
    });
  }
  return series.length >= 2 ? series : [];
}

/** 막대만 보고 스스로 해석하게 두지 않는다(50~70대 타깃) — 한 줄로 무슨 일이 있었는지 */
export function trendHeadline(series: TrendPoint[]): string {
  const first = series[0];
  const latest = series[series.length - 1];
  const delta = latest.vacancy - first.vacancy;
  const days = series.length;
  if (delta > 0) return `최근 ${days}일 사이 빈자리가 ${delta}개 늘었어요.`;
  if (delta < 0) return `최근 ${days}일 사이 빈자리가 ${Math.abs(delta)}개 줄었어요.`;
  return latest.vacancy > 0
    ? `최근 ${days}일 동안 빈자리 ${latest.vacancy}개가 그대로예요.`
    : `최근 ${days}일 동안 계속 정원이 찬 상태예요.`;
}
