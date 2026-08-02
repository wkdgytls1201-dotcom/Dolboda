import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminClient } from "./AdminClient";

// 운영자 콘솔. 로그인 + 운영자 이메일이어야 들어온다.
// 색인 대상이 아니다(robots에서 /admin 차단 + 여기서도 noindex).
export const metadata: Metadata = {
  title: "운영자 콘솔",
  robots: { index: false, follow: false },
};

// 세션을 봐야 하므로 정적 생성 대상이 아니다
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">운영자 전용 화면이에요</h1>
        <p className="text-sm leading-relaxed text-ink-500">
          운영자 계정으로 로그인한 뒤 다시 열어주세요. 계정에 이메일이 없으면 접근할 수 없어요.
        </p>
      </main>
    );
  }

  // 첫 화면에 필요한 것만 서버에서 실어 보낸다 — 열자마자 빈 화면에서 로딩이 도는 걸 피한다
  const [inquiries, subs, counts] = await Promise.all([
    prisma.businessInquiry.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.facilitySubscription.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.businessInquiry.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const facilityIds = [
    ...new Set([
      ...inquiries.map((i) => i.facilityId).filter((v): v is string => !!v),
      ...subs.map((s) => s.facilityId),
    ]),
  ];
  const facilities = await prisma.facility.findMany({
    where: { id: { in: facilityIds } },
    select: { id: true, name: true, address: true },
  });
  const placements = await prisma.sponsorPlacement.findMany({
    where: { facilityId: { in: facilityIds } },
  });

  return (
    <AdminClient
      adminEmail={admin.email}
      inquiries={inquiries.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      }))}
      subscriptions={subs.map((s) => ({
        ...s,
        startedAt: s.startedAt.toISOString(),
        endsAt: s.endsAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
      placements={placements.map((p) => ({
        id: p.id,
        facilityId: p.facilityId,
        scope: p.scope,
        regionKey: p.regionKey,
        active: p.active,
      }))}
      facilities={facilities}
      statusCounts={counts.map((c) => ({ status: c.status, count: c._count._all }))}
    />
  );
}
