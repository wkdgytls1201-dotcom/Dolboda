import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { heldSlots, heldBannerSlots } from "@/lib/sponsor";
import { SPONSOR_SLOTS_PER_SIGUNGU, BANNER_SLOTS_PER_SIGUNGU } from "@/lib/businessPlans";

// 구독·스폰서 슬롯 운영 (입금 확인 / 일시중지 / 해지).
//
// 구독 상태와 스폰서 노출은 **함께 움직여야 한다.** 따로 켜고 끄면
// "해지했는데 광고는 계속 나간다"거나 "입금했는데 안 나온다"가 생기고, 둘 다 분쟁이다.
// 그래서 여기서 한 트랜잭션으로 같이 바꾼다.
//
// 켜고 끄는 대상은 **이 구독이 산 슬롯**뿐이다(시설 전체가 아니다). 한 시설이 여러 지역을
// 살 수 있어서, 시설 단위로 끄면 아직 유효한 다른 지역 계약까지 같이 꺼진다.

const ALLOWED = new Set(["active", "paused", "cancelled"]);

// 해지는 끝이다 — 되살리지 않는다.
//
// 되살리기를 허용하면 해지 시각(endsAt)을 지워야 하는데, 그 값이 "언제까지 노출됐는가"의
// 정산 근거라 지우는 순간 근거가 사라진다. 재계약은 새 신청 → 새 승인으로 새 구독 행을
// 만든다(계약 시점 금액도 그때 값으로 복사돼야 맞다).
const TERMINAL = new Set(["cancelled"]);

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  const subs = await prisma.facilitySubscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const ids = [...new Set(subs.map((s) => s.facilityId))];
  const [facilities, placements] = await Promise.all([
    prisma.facility.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.sponsorPlacement.findMany({ where: { facilityId: { in: ids } } }),
  ]);
  const nameById = new Map(facilities.map((f) => [f.id, f.name]));

  return NextResponse.json({
    items: subs.map((s) => ({
      ...s,
      facilityName: nameById.get(s.facilityId) ?? "(알 수 없음)",
      placements: placements.filter((p) => p.facilityId === s.facilityId),
    })),
  });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!id || !ALLOWED.has(status)) {
    return NextResponse.json({ error: "상태 값이 올바르지 않아요." }, { status: 400 });
  }

  const sub = await prisma.facilitySubscription.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ error: "구독을 찾을 수 없어요." }, { status: 404 });

  // 상태 가드 — 화면에서 버튼을 비활성화하는 것만으로는 막히지 않는다.
  if (TERMINAL.has(sub.status)) {
    return NextResponse.json(
      { error: "이미 해지된 구독이에요. 다시 이용하려면 새로 신청·승인해주세요." },
      { status: 409 }
    );
  }
  if (sub.status === status) {
    return NextResponse.json({ ok: true, subscription: sub });
  }

  // 이 구독이 산 슬롯만 찾는다. 예전 데이터에는 subscriptionId가 없을 수 있는데,
  // 그때는 시설 단위로 떨어뜨린다(구독이 하나뿐이던 시절의 행이라 그게 맞는 해석이다).
  const [placements, banner] = await Promise.all([
    prisma.sponsorPlacement.findMany({
      where: {
        facilityId: sub.facilityId,
        OR: [{ subscriptionId: id }, { subscriptionId: null }],
      },
      select: { id: true, scope: true, regionKey: true },
    }),
    prisma.facilityBanner.findFirst({
      where: { facilityId: sub.facilityId, OR: [{ subscriptionId: id }, { subscriptionId: null }] },
      select: { facilityId: true, regionKey: true },
    }),
  ]);

  // 노출을 켜는 순간에 상한을 다시 본다. 승인 시점 검사만으로는 부족하다 —
  // 승인은 여러 건이 먼저 쌓일 수 있고(전부 입금 대기), 켜는 건 나중에 하나씩이다.
  // 여기서 안 막으면 지역당 N곳 약속을 넘겨 노출되거나, 노출 조회의 take 상한에 걸려
  // **돈을 낸 시설이 조용히 안 나가게** 된다.
  if (status === "active") {
    for (const p of placements) {
      const used = await heldSlots(p.scope as "sigungu" | "sido" | "national", p.regionKey, {
        excludeFacilityId: sub.facilityId,
        onlyActive: true,
      });
      if (used >= SPONSOR_SLOTS_PER_SIGUNGU) {
        return NextResponse.json(
          {
            error: `${p.regionKey}의 스폰서 자리가 이미 다 노출 중이에요(${SPONSOR_SLOTS_PER_SIGUNGU}곳). 다른 곳을 내리거나 대기로 안내해주세요.`,
          },
          { status: 409 }
        );
      }
    }
    if (banner) {
      const used = await heldBannerSlots(banner.regionKey, {
        excludeFacilityId: sub.facilityId,
        onlyActive: true,
      });
      if (used >= BANNER_SLOTS_PER_SIGUNGU) {
        return NextResponse.json(
          { error: `${banner.regionKey}의 배너 자리가 이미 노출 중이에요. 먼저 정리해주세요.` },
          { status: 409 }
        );
      }
    }
  }

  const now = new Date();
  const placementIds = placements.map((p) => p.id);
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.facilitySubscription.update({
      where: { id },
      data: {
        status,
        // 해지하면 종료 시각을 남긴다 — 언제까지 노출됐는지가 정산의 근거가 된다.
        // 해지가 아닐 때는 **건드리지 않는다**: 예전엔 null로 덮어써서, 기한이 정해진
        // 구독을 일시중지했다 켜는 것만으로 기한이 사라졌다.
        ...(status === "cancelled" ? { endsAt: now } : {}),
      },
    });
    // 이 구독이 산 슬롯만 상태에 맞춘다.
    // active일 때만 광고가 나가고, 해지면 슬롯 자체를 풀어 대기 중인 시설이 들어갈 수 있게 한다.
    // 일시중지는 잠깐 끄는 것이라 자리는 계속 잡고 있다(endsAt을 안 찍는다).
    if (placementIds.length > 0) {
      await tx.sponsorPlacement.updateMany({
        where: { id: { in: placementIds } },
        data:
          status === "active"
            ? { active: true }
            : status === "paused"
            ? { active: false }
            : { active: false, endsAt: now },
      });
    }
    // 배너도 같은 규칙 — 있으면(지역 프리미엄 이상) 같이 켜고 끈다.
    if (banner) {
      await tx.facilityBanner.update({
        where: { facilityId: banner.facilityId },
        data:
          status === "cancelled"
            ? { active: false, endsAt: now }
            : { active: status === "active" },
      });
    }
    return next;
  });

  return NextResponse.json({ ok: true, subscription: updated });
}
