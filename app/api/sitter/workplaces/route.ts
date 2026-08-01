import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rowToFacility } from "@/lib/facilityRepo";
import { calcWorkIndex } from "@/lib/workIndex";
import { REGION_SEO } from "@/lib/regionSeo";
import type { Facility as FacilityRow } from "@prisma/client";

// 돌보다 매니저의 활동 지역에서 "일하기 좋은 시설"을 근무환경 지수 순으로 돌려준다.
// 일자리 공고가 없어도 매니저가 들어와 볼 거리를 만드는 것이 목적.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const profile = await prisma.sitterProfile.findUnique({
    where: { userId: session.user.id },
    select: { regions: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  // 매니저가 특정 지역만 보고 싶을 때 (없으면 활동 지역 전체)
  const only = searchParams.get("region");
  const regionLabels = only ? [only] : profile.regions;

  if (regionLabels.length === 0) {
    return NextResponse.json({ items: [], regions: [] });
  }

  // 활동 지역(시/도 라벨) → 주소 접두어. "경남" → ["경상남도", "경남"]
  const prefixes = regionLabels.flatMap(
    (label) => REGION_SEO.find((r) => r.label === label)?.prefixes ?? [label]
  );

  // 근속·인력 데이터가 있는 입소형 시설만 대상 (요양병원은 공단 인력데이터가 없음)
  const rows = await prisma.$queryRaw<FacilityRow[]>`
    SELECT * FROM "Facility"
    WHERE "facilityType"::text IN ('NURSING_HOME', 'DAY_NIGHT_CARE')
      AND "dataSource" != 'mock'
      AND extra ? 'tenure'
      AND extra ? 'careWorkerDetail'
      AND address LIKE ANY(${prefixes.map((p) => `${p}%`)}::text[])
    LIMIT 1500
  `;

  const items = rows
    .map((row) => {
      const facility = rowToFacility(row);
      const index = calcWorkIndex(facility);
      return { facility, index };
    })
    .filter((x) => x.index.total !== null)
    .sort((a, b) => (b.index.total ?? 0) - (a.index.total ?? 0))
    .slice(0, 30)
    .map(({ facility, index }) => ({
      id: facility.id,
      name: facility.name,
      address: facility.address,
      facilityType: facility.facilityType,
      grade: facility.grade,
      gradeSource: facility.gradeSource,
      phone: facility.phone,
      total: index.total,
      workloadRatio: index.workloadRatio,
      retentionRate: index.retentionRate,
      careWorkers: facility.facilityType !== "NURSING_HOSPITAL" ? facility.careWorkerDetail?.total ?? null : null,
      areas: index.areas.map((a) => ({ key: a.key, label: a.label, score: a.score })),
    }));

  return NextResponse.json({ items, regions: profile.regions });
}
