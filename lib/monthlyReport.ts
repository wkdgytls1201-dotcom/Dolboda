import { prisma } from "./prisma";
import { REGION_SEO } from "./regionSeo";
import { pctDelta } from "./deltaPct";

// 월간 성과 보고서 집계 (지역 프리미엄 이상, capabilityOf().hasReport).
//
// 원칙: 못 재는 지표는 0으로 채우지 않고 필드 자체를 비운다(null/undefined).
// "노출 0"과 "아직 측정 안 함"은 시설 입장에서 전혀 다른 뜻이라, 섞으면 오해를 산다.
// 화면(app/business/console/report/page.tsx)은 null인 항목을 통째로 숨긴다.

function kstToday(): { y: number; m: number } {
  const shifted = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() };
}

interface MonthRange {
  label: string;
  /** DATE 컬럼(FacilityDailyView·AdEvent) 비교용 — 캘린더 날짜값 그대로 */
  dateStart: Date;
  dateEnd: Date;
  /** TIMESTAMP 컬럼(ConsultRequest·FacilityPost) 비교용 — KST 자정의 실제 UTC 시각 */
  instantStart: Date;
  instantEnd: Date;
}

/** monthsAgo=0이면 이번 달, 1이면 지난달. KST 기준. */
function monthRange(monthsAgo: number): MonthRange {
  const { y, m } = kstToday();
  const dateStart = new Date(Date.UTC(y, m - monthsAgo, 1));
  const dateEnd = new Date(Date.UTC(y, m - monthsAgo + 1, 1));
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  return {
    label: `${dateStart.getUTCFullYear()}년 ${dateStart.getUTCMonth() + 1}월`,
    dateStart,
    dateEnd,
    instantStart: new Date(dateStart.getTime() - KST_OFFSET_MS),
    instantEnd: new Date(dateEnd.getTime() - KST_OFFSET_MS),
  };
}

export interface DailyPoint {
  date: string; // "08/03"
  count: number;
}

export interface MonthlyReport {
  facilityId: string;
  facilityName: string;
  periodLabel: string;
  prevPeriodLabel: string;

  views: {
    thisMonth: number;
    lastMonth: number;
    deltaPct: number | null;
    last30Days: DailyPoint[];
  };
  /** 같은 시·군·구 다른 시설들의 이번 달 평균 조회수. 비교 대상이 부족하면 null. */
  regionAvgViews: number | null;
  regionLabel: string | null;

  consults: {
    thisMonth: number;
    lastMonth: number;
    deltaPct: number | null;
    byStatus: { label: string; count: number }[];
  };

  content: {
    photosCount: number;
    postsThisMonth: number;
    hasIntro: boolean;
  };

  /** 스폰서·배너를 사지 않은 요금제면 통째로 null — "0"이 아니라 "해당 없음"으로 구분 */
  sponsor: { impressions: number; clicks: number; ctr: number | null } | null;
  banner: { impressions: number; clicks: number; ctr: number | null } | null;
}

const MIN_REGION_SAMPLES = 2; // 비교 대상이 자신뿐이면 "평균"이 의미가 없다

async function regionAverageViews(
  facilityId: string,
  address: string,
  range: MonthRange
): Promise<{ avg: number | null; label: string | null }> {
  const region = REGION_SEO.find((r) => r.prefixes.some((p) => address.startsWith(p)));
  const sigungu = address.split(/\s+/)[1];
  if (!region || !sigungu || !/^[가-힣]{1,10}(시|군|구)$/.test(sigungu)) {
    return { avg: null, label: null };
  }

  const peers = await prisma.facility.findMany({
    where: {
      OR: region.prefixes.map((p) => ({ address: { startsWith: p } })),
      address: { contains: ` ${sigungu} ` },
      dataSource: { not: "mock" },
    },
    select: { id: true },
  });
  const peerIds = peers.map((p) => p.id).filter((id) => id !== facilityId);
  if (peerIds.length < MIN_REGION_SAMPLES) return { avg: null, label: null };

  const rows = await prisma.facilityDailyView.groupBy({
    by: ["facilityId"],
    where: { facilityId: { in: peerIds }, date: { gte: range.dateStart, lt: range.dateEnd } },
    _sum: { count: true },
  });
  // 조회수가 아예 없던 시설(0건)도 평균에 들어가야 진짜 평균이다 —
  // 방문이 있었던 시설만 평균 내면 값이 부풀려진다.
  const total = rows.reduce((s, r) => s + (r._sum.count ?? 0), 0);
  const avg = Math.round(total / peerIds.length);
  return { avg, label: `${region.label} ${sigungu}` };
}

function last30DaysSeries(rows: { date: Date; count: number }[]): DailyPoint[] {
  const byDate = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), r.count]));
  const out: DailyPoint[] = [];
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // KST 오늘
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ date: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, count: byDate.get(key) ?? 0 });
  }
  return out;
}

export async function getMonthlyReport(
  facilityId: string,
  facilityName: string,
  plan: string
): Promise<MonthlyReport | null> {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { address: true },
  });
  if (!facility) return null;

  const thisMonth = monthRange(0);
  const lastMonth = monthRange(1);
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    viewsThis,
    viewsLast,
    viewSeries,
    regionAvg,
    consultsThisRows,
    consultsLastCount,
    content,
    postsThisMonth,
    sponsorPlacement,
    bannerRow,
  ] = await Promise.all([
    prisma.facilityDailyView.aggregate({
      _sum: { count: true },
      where: { facilityId, date: { gte: thisMonth.dateStart, lt: thisMonth.dateEnd } },
    }),
    prisma.facilityDailyView.aggregate({
      _sum: { count: true },
      where: { facilityId, date: { gte: lastMonth.dateStart, lt: lastMonth.dateEnd } },
    }),
    prisma.facilityDailyView.findMany({
      where: { facilityId, date: { gte: last30 } },
      select: { date: true, count: true },
    }),
    regionAverageViews(facilityId, facility.address, thisMonth),
    prisma.consultRequest.findMany({
      where: { facilityId, createdAt: { gte: thisMonth.instantStart, lt: thisMonth.instantEnd } },
      select: { status: true },
    }),
    prisma.consultRequest.count({
      where: { facilityId, createdAt: { gte: lastMonth.instantStart, lt: lastMonth.instantEnd } },
    }),
    prisma.facilityContent.findUnique({ where: { facilityId } }),
    prisma.facilityPost.count({
      where: { facilityId, createdAt: { gte: thisMonth.instantStart, lt: thisMonth.instantEnd } },
    }),
    prisma.sponsorPlacement.findFirst({ where: { facilityId, scope: "sigungu" } }),
    prisma.facilityBanner.findUnique({ where: { facilityId } }),
  ]);

  const adRange = { start: thisMonth.dateStart, end: thisMonth.dateEnd };
  const adEvents = await prisma.adEvent.findMany({
    where: { facilityId, date: { gte: adRange.start, lt: adRange.end } },
  });
  const sumKind = (kind: string) =>
    adEvents.filter((e) => e.kind === kind).reduce((s, e) => s + e.count, 0);

  const statusCount = (label: string | null) =>
    consultsThisRows.filter((c) => c.status === label).length;

  return {
    facilityId,
    facilityName,
    periodLabel: thisMonth.label,
    prevPeriodLabel: lastMonth.label,

    views: {
      thisMonth: viewsThis._sum.count ?? 0,
      lastMonth: viewsLast._sum.count ?? 0,
      deltaPct: pctDelta(viewsThis._sum.count ?? 0, viewsLast._sum.count ?? 0),
      last30Days: last30DaysSeries(viewSeries),
    },
    regionAvgViews: regionAvg.avg,
    regionLabel: regionAvg.label,

    consults: {
      thisMonth: consultsThisRows.length,
      lastMonth: consultsLastCount,
      deltaPct: pctDelta(consultsThisRows.length, consultsLastCount),
      byStatus: [
        { label: "대기 중", count: statusCount(null) },
        { label: "연락받음", count: statusCount("연락받음") },
        { label: "입소 결정", count: statusCount("입소결정") },
      ],
    },

    content: {
      photosCount: Array.isArray(content?.photos) ? (content.photos as string[]).length : 0,
      postsThisMonth,
      hasIntro: Boolean(content?.intro),
    },

    sponsor: sponsorPlacement
      ? {
          impressions: sumKind("sponsor_impression"),
          clicks: sumKind("sponsor_click"),
          ctr:
            sumKind("sponsor_impression") > 0
              ? Math.round((sumKind("sponsor_click") / sumKind("sponsor_impression")) * 1000) / 10
              : null,
        }
      : null,
    banner: bannerRow
      ? {
          impressions: sumKind("banner_impression"),
          clicks: sumKind("banner_click"),
          ctr:
            sumKind("banner_impression") > 0
              ? Math.round((sumKind("banner_click") / sumKind("banner_impression")) * 1000) / 10
              : null,
        }
      : null,
  };
}
