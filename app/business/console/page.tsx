import type { Metadata } from "next";
import Link from "next/link";
import { myFacilities, capabilityOf } from "@/lib/facilityOwner";
import { prisma } from "@/lib/prisma";
import { findPlan } from "@/lib/businessPlans";
import { ConsoleClient } from "./ConsoleClient";

// 시설 콘솔 — 인증된 시설 담당자가 자기 시설 페이지를 관리하는 화면.
// 로그인 + FacilityOwner 행이 있어야 내용이 보인다. 색인 대상이 아니다.
export const metadata: Metadata = {
  title: "시설 콘솔",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ConsolePage() {
  const facilities = await myFacilities();

  if (facilities.length === 0) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">아직 연결된 시설이 없어요</h1>
        <p className="mb-6 text-sm leading-relaxed text-ink-500">
          시설 인증을 신청하시면 확인 전화 후 이 화면에서 시설 페이지를 직접 관리하실 수
          있습니다. 이미 신청하셨다면 확인 전화를 기다려주세요 — 승인되는 순간 여기가 열립니다.
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

  // 시설별 콘텐츠·상담 통계를 한 번에 실어 보낸다 — 콘솔이 열리자마자 다 보이게.
  const ids = facilities.map((f) => f.facilityId);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [contents, consultTotals, consultRecents] = await Promise.all([
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
  ]);
  const contentById = new Map(contents.map((c) => [c.facilityId, c]));
  const totalById = new Map(consultTotals.map((c) => [c.facilityId, c._count._all]));
  const recentById = new Map(consultRecents.map((c) => [c.facilityId, c._count._all]));

  return (
    <ConsoleClient
      facilities={facilities.map((f) => {
        const cap = capabilityOf(f.plan);
        const content = contentById.get(f.facilityId);
        return {
          facilityId: f.facilityId,
          facilityName: f.facilityName,
          plan: f.plan,
          planName: findPlan(f.plan)?.name ?? "시설 기본 등록",
          photoLimit: cap.photoLimit,
          intro: content?.intro ?? "",
          photos: Array.isArray(content?.photos) ? (content.photos as string[]) : [],
          consultTotal: totalById.get(f.facilityId) ?? 0,
          consultRecent30d: recentById.get(f.facilityId) ?? 0,
        };
      })}
    />
  );
}
