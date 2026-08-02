import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rowToFacility } from "@/lib/facilityRepo";
import { calcWorkIndex } from "@/lib/workIndex";
import { REGION_SEO } from "@/lib/regionSeo";
import { REGIONS } from "@/lib/regions";
import type { Facility as FacilityRow } from "@prisma/client";

// 활동 지역 라벨(REGIONS 표기) → 주소 접두어.
// REGION_SEO는 "전남·광주"를 한 항목으로 묶어서 "전남"/"광주" 단독 라벨은 못 찾는다 —
// 그대로 두면 "전남" 매니저에게 "전라남도"로 시작하는 주소가 통째로 누락된다.
function prefixesFor(label: string): string[] {
  if (label === "광주") return ["광주"];
  if (label === "전남") return ["전라남도", "전남"];
  return REGION_SEO.find((r) => r.label === label)?.prefixes ?? [label];
}

// 돌보다 매니저의 활동 지역에서 "일하기 좋은 시설"을 근무환경 지수 순으로 돌려준다.
// 일자리 공고가 없어도 매니저가 들어와 볼 거리를 만드는 것이 목적.

const RESULT_LIMIT = 30;
// 근속·인력 데이터를 가진 입소형 시설은 전국 11,470곳이다. 그 위로 상한을 둬서
// 어떤 지역 조합이든 잘려나가지 않게 한다(잘리면 "상위 30곳"이 상위가 아니게 된다).
const SCAN_LIMIT = 15000;

export interface WorkplaceItem {
  id: string;
  name: string;
  address: string;
  facilityType: string;
  grade: number | null;
  gradeSource: string;
  phone: string | undefined;
  total: number | null;
  workloadRatio: number | null;
  retentionRate: number | null;
  careWorkers: number | null;
  areas: { key: string; label: string; score: number | null }[];
}

// 근무환경 지수 순위는 (활동지역 집합)만으로 결정되고 시설 데이터는 import 때만 바뀐다.
// 매니저가 마이페이지를 열 때마다 수천 행을 다시 읽을 이유가 없어 하루 캐시한다.
const getRanking = unstable_cache(
  async (prefixes: string[]): Promise<WorkplaceItem[]> => {
    // 예전엔 `SELECT *`로 extra(jsonb) 전체를 읽었다. 프로그램·비급여·평가상세까지 딸려와
    // 행당 수십 KB였고, 그래서 LIMIT 1500으로 막아둘 수밖에 없었다. 그런데 ORDER BY가 없는
    // LIMIT은 "아무 1500곳"이라, 서울처럼 대상이 더 많은 지역에서는 진짜 상위 시설이
    // 후보에 들지도 못했다. 지수 계산에 실제로 쓰는 조각만 뽑아 행을 가볍게 만들고,
    // 그 대신 대상 전체를 훑는다.
    const rows = await prisma.$queryRaw<FacilityRow[]>`
      SELECT
        id, name, address, phone, grade,
        "facilityType", "dataSource", "gradeSource", "sourceUpdatedAt",
        jsonb_build_object(
          'capacity',          extra->'capacity',
          'currentOccupancy',  extra->'currentOccupancy',
          'careWorkerDetail',  extra->'careWorkerDetail',
          'tenure',            extra->'tenure',
          'staffDetail',       extra->'staffDetail',
          'institutionInfo',   extra->'institutionInfo',
          'adminActions',      extra->'adminActions'
        ) AS extra
      FROM "Facility"
      WHERE "facilityType"::text IN ('NURSING_HOME', 'DAY_NIGHT_CARE')
        AND "dataSource" != 'mock'
        AND extra ? 'tenure'
        AND extra ? 'careWorkerDetail'
        AND address LIKE ANY(${prefixes.map((p) => `${p}%`)}::text[])
      ORDER BY id
      LIMIT ${SCAN_LIMIT}
    `;

    return rows
      .map((row) => {
        const facility = rowToFacility(row);
        return { facility, index: calcWorkIndex(facility) };
      })
      .filter((x) => x.index.total !== null)
      // 동점일 때 순서가 흔들리지 않게 id를 2차 정렬 기준으로 둔다
      .sort((a, b) => (b.index.total ?? 0) - (a.index.total ?? 0) || a.facility.id.localeCompare(b.facility.id))
      .slice(0, RESULT_LIMIT)
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
        careWorkers:
          facility.facilityType !== "NURSING_HOSPITAL"
            ? facility.careWorkerDetail?.total ?? null
            : null,
        areas: index.areas.map((a) => ({ key: a.key, label: a.label, score: a.score })),
      }));
  },
  ["sitter-workplaces-ranking"],
  { revalidate: 86400 }
);

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
  // 매니저가 특정 지역만 보고 싶을 때 (없으면 활동 지역 전체).
  // 전국 시/도 라벨이면 활동 지역이 아니어도 허용 — "다른 지역은 어떤가" 둘러보는 용도.
  // 다만 임의 문자열은 여전히 거부한다(주소 LIKE 전국 스캔·캐시 키 폭증 방지 —
  // REGIONS 17개로 한정되므로 캐시 키도 유한하다).
  const only = searchParams.get("region");
  const isKnownRegion = !!only && (REGIONS as readonly string[]).includes(only);
  const regionLabels = isKnownRegion ? [only!] : profile.regions;

  if (regionLabels.length === 0) {
    return NextResponse.json({ items: [], regions: [] });
  }

  // 같은 지역 집합이면 캐시가 맞도록 정렬해 키를 안정시킨다.
  const prefixes = [...new Set(regionLabels.flatMap(prefixesFor))].sort();

  const items = await getRanking(prefixes);

  return NextResponse.json({ items, regions: profile.regions });
}
