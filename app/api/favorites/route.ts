import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { REGIONS } from "@/lib/regions";

// 관심시설(찜)과 알림 설정 — 서버 저장분.
//
// 예전엔 localStorage에만 있어서 기기를 바꾸면 사라지고, 서버가 수신자를 몰라
// 알림을 보낼 수도 없었다(docs/favorite-alert-spec.md §1-2).
//
// 비로그인 사용자는 여전히 localStorage로 동작한다 — 찜하려고 로그인부터 하라고
// 막으면 이탈이 크다. 로그인하면 그때 병합한다(POST /api/favorites/import).

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const [favorites, regions] = await Promise.all([
    prisma.facilityFavorite.findMany({
      where: { userId: session.user.id },
      select: {
        facilityId: true,
        vacancyAlert: true,
        gradeChangeAlert: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.regionInterest.findMany({
      where: { userId: session.user.id },
      select: { region: true },
    }),
  ]);

  return NextResponse.json({
    favorites,
    regions: regions.map((r) => r.region),
  });
}

/** 찜 추가/해제 — 화면의 하트 토글이 부른다. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    facilityId?: unknown;
    favorite?: unknown;
  };
  const facilityId = typeof body.facilityId === "string" ? body.facilityId.trim() : "";
  if (!facilityId) {
    return NextResponse.json({ error: "시설을 확인해주세요." }, { status: 400 });
  }

  // favorite 값을 안 주면 토글로 동작한다.
  const existing = await prisma.facilityFavorite.findUnique({
    where: { userId_facilityId: { userId: session.user.id, facilityId } },
    select: { id: true },
  });
  const shouldFavorite = typeof body.favorite === "boolean" ? body.favorite : !existing;

  if (!shouldFavorite) {
    // 찜을 풀면 알림 설정도 함께 사라진다 — 찜 없이 알림만 남는 상태를 만들지 않는다
    if (existing) {
      await prisma.facilityFavorite.delete({ where: { id: existing.id } });
    }
    return NextResponse.json({ facilityId, favorite: false });
  }

  if (existing) {
    return NextResponse.json({ facilityId, favorite: true });
  }

  // 실재하지 않는 시설 id가 쌓이면 나중에 알림 발송 때 대상을 못 찾는다
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { id: true },
  });
  if (!facility) {
    return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });
  }

  await prisma.facilityFavorite.create({
    data: { userId: session.user.id, facilityId },
  });
  return NextResponse.json({ facilityId, favorite: true });
}

/** 알림 설정 변경 — 찜한 시설에만 걸 수 있다. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // 관심 지역 토글
  // ★ REGION_SEO가 아니라 REGIONS로 검증한다 — REGION_SEO는 "전남"·"광주"를 "전남광주"
  // 하나로 묶어서, /notifications 화면(REGIONS 17개, 전남·광주 분리)에서 그 두 칩을
  // 누르면 클라이언트는 켜진 것처럼 보이는데 여기서 조용히 400을 내고 있었다
  // (fetch는 실패 응답을 reject하지 않아 클라이언트가 실패를 못 알아챈다 —
  // lib/alertPreferencesContext.tsx의 toggleRegionInterest 참고). 실제로 저장은
  // 하나도 안 되고 있었던 버그.
  if (typeof body.region === "string") {
    const region = body.region.trim();
    if (!(REGIONS as readonly string[]).includes(region)) {
      return NextResponse.json({ error: "지역을 확인해주세요." }, { status: 400 });
    }
    const on = body.on === true;
    if (on) {
      await prisma.regionInterest.upsert({
        where: { userId_region: { userId: session.user.id, region } },
        create: { userId: session.user.id, region },
        update: {},
      });
    } else {
      await prisma.regionInterest
        .delete({ where: { userId_region: { userId: session.user.id, region } } })
        .catch(() => null); // 이미 없으면 그대로 성공으로 본다
    }
    return NextResponse.json({ region, on });
  }

  // 시설별 알림 스위치
  const facilityId = typeof body.facilityId === "string" ? body.facilityId.trim() : "";
  if (!facilityId) {
    return NextResponse.json({ error: "시설을 확인해주세요." }, { status: 400 });
  }

  const data: { vacancyAlert?: boolean; gradeChangeAlert?: boolean } = {};
  if (typeof body.vacancyAlert === "boolean") data.vacancyAlert = body.vacancyAlert;
  if (typeof body.gradeChangeAlert === "boolean") data.gradeChangeAlert = body.gradeChangeAlert;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "바꿀 설정이 없어요." }, { status: 400 });
  }

  // 찜하지 않은 시설에 알림을 켜면 찜도 함께 만든다 —
  // 화면상 찜한 시설에만 스위치가 보이지만, API가 그걸 전제로 실패하면 안 된다
  const updated = await prisma.facilityFavorite.upsert({
    where: { userId_facilityId: { userId: session.user.id, facilityId } },
    create: { userId: session.user.id, facilityId, ...data },
    update: data,
    select: { facilityId: true, vacancyAlert: true, gradeChangeAlert: true },
  });

  return NextResponse.json(updated);
}
