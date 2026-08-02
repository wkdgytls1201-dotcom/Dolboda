import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

// 구독·스폰서 슬롯 운영 (입금 확인 / 일시중지 / 해지).
//
// 구독 상태와 스폰서 노출은 **함께 움직여야 한다.** 따로 켜고 끄면
// "해지했는데 광고는 계속 나간다"거나 "입금했는데 안 나온다"가 생기고, 둘 다 분쟁이다.
// 그래서 여기서 한 트랜잭션으로 같이 바꾼다.

const ALLOWED = new Set(["active", "paused", "cancelled"]);

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

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.facilitySubscription.update({
      where: { id },
      data: {
        status,
        // 해지하면 종료 시각을 남긴다 — 언제까지 노출됐는지가 정산의 근거가 된다
        endsAt: status === "cancelled" ? now : null,
      },
    });
    // 이 시설의 스폰서 슬롯을 구독 상태에 맞춘다.
    // active일 때만 광고가 나가고, 해지면 슬롯 자체를 풀어 대기 중인 시설이 들어갈 수 있게 한다.
    await tx.sponsorPlacement.updateMany({
      where: { facilityId: sub.facilityId },
      data:
        status === "active"
          ? { active: true, endsAt: null }
          : status === "paused"
          ? { active: false }
          : { active: false, endsAt: now },
    });
    return next;
  });

  return NextResponse.json({ ok: true, subscription: updated });
}
