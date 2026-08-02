import type { Metadata } from "next";
import { requireAdmin, currentSessionInfo } from "@/lib/admin";
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
    // 카카오 계정은 이메일이 없는 경우가 흔해서, 로그인한 본인에게만 계정 id를 보여준다.
    // 운영자는 이 값을 Vercel의 ADMIN_USER_IDS에 넣으면 된다(제3자에겐 의미 없는 값이다).
    const me = await currentSessionInfo();
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">운영자 전용 화면이에요</h1>
        <p className="mb-4 text-sm leading-relaxed text-ink-500">
          {me
            ? "로그인은 됐지만 이 계정은 운영자로 등록돼 있지 않아요."
            : "운영자 계정으로 로그인한 뒤 다시 열어주세요."}
        </p>
        {me && (
          <div className="rounded-2xl bg-white p-4 text-left shadow-card">
            <p className="mb-1 text-xs text-ink-300">현재 로그인한 계정</p>
            <p className="break-all font-mono text-sm font-bold text-ink-900">{me.userId}</p>
            <p className="mt-0.5 text-xs text-ink-500">{me.email ?? "이메일 미제공(카카오)"}</p>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              이 계정이 운영자 본인이라면, 위 id를 Vercel 환경변수{" "}
              <code className="rounded bg-ink-100/60 px-1 font-mono text-[11px]">
                ADMIN_USER_IDS
              </code>
              에 넣고 재배포하면 이 화면이 열려요.
            </p>
          </div>
        )}
      </main>
    );
  }

  // 첫 화면에 필요한 것만 서버에서 실어 보낸다 — 열자마자 빈 화면에서 로딩이 도는 걸 피한다
  const [inquiries, subs, counts, corrections, correctionCounts] = await Promise.all([
    prisma.businessInquiry.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.facilitySubscription.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.businessInquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.facilityCorrection.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.facilityCorrection.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const facilityIds = [
    ...new Set([
      ...inquiries.map((i) => i.facilityId).filter((v): v is string => !!v),
      ...subs.map((s) => s.facilityId),
      ...corrections.map((c) => c.facilityId),
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
      corrections={corrections.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))}
      correctionCounts={correctionCounts.map((c) => ({
        status: c.status,
        count: c._count._all,
      }))}
    />
  );
}
