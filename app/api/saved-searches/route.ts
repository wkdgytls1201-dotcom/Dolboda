import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MAX_SAVED_SEARCHES, hasAnyFilter, summarizeFilters } from "@/lib/savedSearch";
import {
  EMPTY_FILTERS,
  EXTRA_SERVICE_OPTIONS,
  type FacilityFilters,
} from "@/lib/facilityFilters";

// 저장한 검색조건 — /search에서 저장하면 여기 쌓이고, /notifications에서 목록·삭제한다.
// 매칭·발송은 scripts/send-facility-alerts.mjs가 매일 새로 등록된 시설을 이 조건들과
// 대조해서 한다(lib/savedSearch.ts 상단 주석 — 위치·안심지수 조건은 매칭에서 제외).

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const items = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    select: { id: true, label: true, filters: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { filters?: unknown };
  if (typeof body.filters !== "object" || body.filters === null) {
    return NextResponse.json({ error: "검색조건을 확인해주세요." }, { status: 400 });
  }
  // 클라이언트가 보낸 값을 그대로 믿지 않고, 알려진 필드만 뽑아 EMPTY_FILTERS 위에 얹는다
  // — 모르는 키가 섞여 들어와도 이후 매칭 스크립트가 예상 못 한 값을 만나지 않는다.
  const raw = body.filters as Partial<FacilityFilters>;
  const filters: FacilityFilters = {
    types: Array.isArray(raw.types) ? raw.types : EMPTY_FILTERS.types,
    grades: Array.isArray(raw.grades) ? raw.grades : EMPTY_FILTERS.grades,
    maxDistanceKm: typeof raw.maxDistanceKm === "number" ? raw.maxDistanceKm : null,
    departments: Array.isArray(raw.departments) ? raw.departments : EMPTY_FILTERS.departments,
    onlyVacancy: raw.onlyVacancy === true,
    verifiedOnly: raw.verifiedOnly === true,
    programTags: Array.isArray(raw.programTags) ? raw.programTags : EMPTY_FILTERS.programTags,
    goodScoreOnly: raw.goodScoreOnly === true,
    hasPhotoOnly: raw.hasPhotoOnly === true,
    longTenureOnly: raw.longTenureOnly === true,
    // 알려진 급여만 통과시킨다 — 모르는 값이 들어오면 매칭 스크립트가 영영 0건이 된다
    extraServices: Array.isArray(raw.extraServices)
      ? raw.extraServices.filter((s): s is string =>
          (EXTRA_SERVICE_OPTIONS as readonly string[]).includes(s as string)
        )
      : EMPTY_FILTERS.extraServices,
  };

  if (!hasAnyFilter(filters)) {
    return NextResponse.json({ error: "조건을 하나 이상 골라주세요." }, { status: 400 });
  }

  const count = await prisma.savedSearch.count({ where: { userId: session.user.id } });
  if (count >= MAX_SAVED_SEARCHES) {
    return NextResponse.json(
      { error: `저장한 검색조건은 최대 ${MAX_SAVED_SEARCHES}개까지예요.` },
      { status: 400 }
    );
  }

  const created = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      label: summarizeFilters(filters),
      filters: filters as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, label: true, filters: true, createdAt: true },
  });
  return NextResponse.json(created);
}
