import type { Metadata } from "next";
import Link from "next/link";
import { myFacilities, capabilityOf } from "@/lib/facilityOwner";
import { prisma } from "@/lib/prisma";
import { findPlan } from "@/lib/businessPlans";
import { ConsoleClient } from "./ConsoleClient";

// 기업회원 콘솔 — 인증된 시설 담당자가 자기 시설 페이지를 관리하는 화면.
// 로그인 + FacilityOwner 행이 있어야 내용이 보인다. 색인 대상이 아니다.
export const metadata: Metadata = {
  title: "기업회원 대시보드",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/** 최근 30일의 날짜 문자열(오늘 포함, 오래된 순)을 만든다. 추이 그래프의 x축 뼈대다. */
function last30Dates(): string[] {
  const now = Date.now();
  return Array.from({ length: 30 }, (_, i) =>
    new Date(now - (29 - i) * DAY).toISOString().slice(0, 10)
  );
}

export default async function ConsolePage() {
  const facilities = await myFacilities();

  if (facilities.length === 0) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">아직 연결된 시설이 없어요</h1>
        <p className="mb-6 text-sm leading-relaxed text-ink-500">
          시설 인증을 신청하시면 이메일 서류 확인 후 이 화면에서 시설 페이지를 직접 관리하실
          수 있습니다. 이미 신청하셨다면 안내 메일을 확인해 주세요 — 승인되는 순간 여기가
          열립니다.
        </p>
        <Link
          href="/business"
          className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-primary-500 px-6 text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-600"
        >
          시설 인증 신청하러 가기
        </Link>
      </main>
    );
  }

  // 첫 화면에 필요한 것을 전부 병렬로 실어 보낸다 — 콘솔이 열리자마자 다 보이게.
  const ids = facilities.map((f) => f.facilityId);
  const now = Date.now();
  const monthAgo = new Date(now - 30 * DAY);
  const weekAgo = new Date(now - 7 * DAY);
  // "지난 30일 대비" 증감을 보여주려면 그 이전 30일치도 필요하다 — 조회수는 어차피
  // 하루 단위로 쌓이는 테이블이라 범위만 넓히면 되고, 상담은 별도 구간 집계를 하나 더 돈다.
  const prevMonthAgo = new Date(now - 60 * DAY);

  const [
    contents,
    consultTotals,
    consultRecents,
    consultPrevs,
    latestConsults,
    posts,
    views,
    placements,
    banners,
  ] = await Promise.all([
      prisma.facilityContent.findMany({ where: { facilityId: { in: ids } } }),
      prisma.consultRequest.groupBy({
        by: ["facilityId"],
        where: { facilityId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.consultRequest.groupBy({
        by: ["facilityId"],
        where: { facilityId: { in: ids }, createdAt: { gte: monthAgo } },
        _count: { _all: true },
      }),
      prisma.consultRequest.groupBy({
        by: ["facilityId"],
        where: { facilityId: { in: ids }, createdAt: { gte: prevMonthAgo, lt: monthAgo } },
        _count: { _all: true },
      }),
      prisma.consultRequest.findMany({
        where: { facilityId: { in: ids } },
        orderBy: { createdAt: "desc" },
        take: 10 * ids.length,
        select: {
          id: true,
          facilityId: true,
          name: true,
          phone: true,
          status: true,
          profileSummary: true,
          facilityNotifiedAt: true,
          createdAt: true,
        },
      }),
      prisma.facilityPost.findMany({
        where: { facilityId: { in: ids } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.facilityDailyView.findMany({
        where: { facilityId: { in: ids }, date: { gte: prevMonthAgo } },
      }),
      prisma.sponsorPlacement.findMany({ where: { facilityId: { in: ids } } }),
      prisma.facilityBanner.findMany({ where: { facilityId: { in: ids } } }),
    ]);
  const bannerById = new Map(banners.map((b) => [b.facilityId, b]));

  const contentById = new Map(contents.map((c) => [c.facilityId, c]));
  const totalById = new Map(consultTotals.map((c) => [c.facilityId, c._count._all]));
  const recentById = new Map(consultRecents.map((c) => [c.facilityId, c._count._all]));
  const prevById = new Map(consultPrevs.map((c) => [c.facilityId, c._count._all]));
  const dateRange = last30Dates();

  // 시설별로 한 번씩만 묶는다. 예전엔 facilities.map() 안에서 이 네 배열을 매번
  // .filter()했는데, 그러면 시설이 F곳·조회 기록이 V행일 때 O(F×V)가 된다 — 관리하는
  // 시설이 많은 기업회원일수록 느려지는 구조라, 미리 한 번 그룹핑해 O(V)로 바꾼다.
  function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const k = key(row);
      const arr = map.get(k);
      if (arr) arr.push(row);
      else map.set(k, [row]);
    }
    return map;
  }
  const viewsByFacility = groupBy(views, (v) => v.facilityId);
  const consultsByFacility = groupBy(latestConsults, (c) => c.facilityId);
  const postsByFacility = groupBy(posts, (p) => p.facilityId);
  const placementsByFacility = groupBy(placements, (p) => p.facilityId);

  return (
    <ConsoleClient
      facilities={facilities.map((f) => {
        const cap = capabilityOf(f.plan);
        const content = contentById.get(f.facilityId);
        const myViews = viewsByFacility.get(f.facilityId) ?? [];
        // 날짜별 조회수 맵 — 기록이 없는 날은 0으로 채워야 그래프 막대 간격이 어긋나지 않는다
        const viewByDate = new Map(myViews.map((v) => [v.date.toISOString().slice(0, 10), v.count]));
        return {
          facilityId: f.facilityId,
          facilityName: f.facilityName,
          plan: f.plan,
          planName: findPlan(f.plan)?.name ?? "시설 기본 등록",
          photoLimit: cap.photoLimit,
          canPostNews: cap.canPostNews,
          canManageBanner: cap.hasBanner,
          bannerImageUrl: bannerById.get(f.facilityId)?.imageUrl ?? null,
          hasReport: cap.hasReport,
          intro: content?.intro ?? "",
          photos: Array.isArray(content?.photos) ? (content.photos as string[]) : [],
          consultTotal: totalById.get(f.facilityId) ?? 0,
          consultRecent30d: recentById.get(f.facilityId) ?? 0,
          consultPrev30d: prevById.get(f.facilityId) ?? 0,
          views30d: myViews
            .filter((v) => v.date >= monthAgo)
            .reduce((s, v) => s + v.count, 0),
          views7d: myViews
            .filter((v) => v.date >= weekAgo)
            .reduce((s, v) => s + v.count, 0),
          viewsPrev30d: myViews
            .filter((v) => v.date >= prevMonthAgo && v.date < monthAgo)
            .reduce((s, v) => s + v.count, 0),
          viewSeries: dateRange.map((date) => ({ date, count: viewByDate.get(date) ?? 0 })),
          consults: (consultsByFacility.get(f.facilityId) ?? [])
            .slice(0, 10)
            .map((c) => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              status: c.status,
              hasProfile: c.profileSummary != null,
              emailed: c.facilityNotifiedAt != null,
              createdAt: c.createdAt.toISOString(),
            })),
          posts: (postsByFacility.get(f.facilityId) ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            body: p.body,
            createdAt: p.createdAt.toISOString(),
          })),
          sponsorRegions: (placementsByFacility.get(f.facilityId) ?? [])
            .filter((p) => p.active)
            .map((p) => p.regionKey),
        };
      })}
    />
  );
}
