import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { findPlan } from "@/lib/businessPlans";
import { remainingSlots } from "@/lib/sponsor";
import { canonicalRegionKey } from "@/lib/regionSeo";

// 운영자용 입점 신청 처리.
//
// 상태 전이는 화면이 아니라 여기서 지킨다(버튼을 숨기는 것만으로는 막히지 않는다):
//
//   접수(null) → contacted(확인전화 완료) → verified(승인) 또는 rejected(거절)
//
// 승인(verified)은 단순한 상태 변경이 아니라 세 가지를 한 트랜잭션으로 만든다:
//   1) FacilityOwner  — 담당자 계정이 시설을 관리할 권한
//   2) FacilitySubscription — 유료 상품이면 구독(계약 시점 금액을 복사해 둔다)
//   3) SponsorPlacement — 스폰서가 포함된 상품이면 지역 슬롯
// 세 개가 따로 만들어지면 "권한은 있는데 구독이 없는" 어긋난 상태가 생긴다.

const ALLOWED_STATUS = new Set(["contacted", "verified", "rejected"]);
// 스폰서 노출이 포함된 상품
const SPONSOR_PLANS = new Set(["sponsor", "premium", "silvertown"]);

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const rows = await prisma.businessInquiry.findMany({
    where: status === "new" ? { status: null } : status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items: rows });
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
  const memo = typeof body.memo === "string" ? body.memo.slice(0, 1000) : undefined;
  // 승인 시에만 쓰는 값들
  const ownerUserId = typeof body.ownerUserId === "string" ? body.ownerUserId.trim() : "";
  const facilityId = typeof body.facilityId === "string" ? body.facilityId.trim() : "";
  const regionKey = typeof body.regionKey === "string" ? body.regionKey.trim() : "";

  if (!id || !ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: "상태 값이 올바르지 않아요." }, { status: 400 });
  }

  const inquiry = await prisma.businessInquiry.findUnique({ where: { id } });
  if (!inquiry) return NextResponse.json({ error: "신청을 찾을 수 없어요." }, { status: 404 });
  if (inquiry.status === "verified" && status !== "verified") {
    // 이미 승인해 권한·구독을 만든 건을 되돌리면 그것들이 남아 유령 상태가 된다.
    // 해지는 구독 쪽에서 처리할 일이라 여기서는 막는다.
    return NextResponse.json(
      { error: "이미 승인된 신청이에요. 해지는 구독 관리에서 처리해주세요." },
      { status: 409 }
    );
  }

  // 승인이 아니면 상태·메모만 바꾸고 끝
  if (status !== "verified") {
    const updated = await prisma.businessInquiry.update({
      where: { id },
      data: { status, ...(memo !== undefined && { memo }) },
    });
    return NextResponse.json({ ok: true, inquiry: updated });
  }

  // ---- 여기부터 승인 ----
  const targetFacilityId = facilityId || inquiry.facilityId;
  if (!targetFacilityId) {
    return NextResponse.json(
      { error: "연결할 시설을 지정해주세요. (기관기호로 자동 매칭되지 않은 신청이에요)" },
      { status: 400 }
    );
  }
  if (!ownerUserId) {
    return NextResponse.json(
      { error: "담당자가 로그인한 계정 id가 필요해요. 카카오 로그인 후 안내해주세요." },
      { status: 400 }
    );
  }

  const [facility, user] = await Promise.all([
    prisma.facility.findUnique({
      where: { id: targetFacilityId },
      select: { id: true, address: true },
    }),
    prisma.user.findUnique({ where: { id: ownerUserId }, select: { id: true } }),
  ]);
  if (!facility) return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });
  if (!user) return NextResponse.json({ error: "계정을 찾을 수 없어요." }, { status: 404 });

  const plan = findPlan(inquiry.plan);
  const needsSponsor = SPONSOR_PLANS.has(inquiry.plan);

  // 스폰서 상품이면 지역 슬롯이 남아 있는지 먼저 본다 —
  // 상한을 넘겨 팔면 /business에 적어둔 "지역당 N곳" 약속이 즉시 거짓이 된다.
  let sponsorRegion = regionKey;
  if (needsSponsor) {
    if (!sponsorRegion) {
      // 정규 키("경남 김해시")로 저장한다 — 지역 페이지 조회와 같은 함수를 써야
      // 같은 지역이 두 키로 갈라져 상한·노출이 어긋나는 일이 없다
      sponsorRegion = canonicalRegionKey(facility.address ?? "") ?? "";
    }
    if (!sponsorRegion.trim()) {
      return NextResponse.json({ error: "스폰서 노출 지역을 지정해주세요." }, { status: 400 });
    }
    const left = await remainingSlots("sigungu", sponsorRegion);
    if (left <= 0) {
      return NextResponse.json(
        { error: `${sponsorRegion}의 스폰서 슬롯이 모두 찼어요. 대기로 안내해주세요.` },
        { status: 409 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.facilityOwner.upsert({
      where: { facilityId_userId: { facilityId: targetFacilityId, userId: ownerUserId } },
      update: { managerName: inquiry.managerName, phone: inquiry.phone, email: inquiry.email },
      create: {
        facilityId: targetFacilityId,
        userId: ownerUserId,
        managerName: inquiry.managerName,
        managerRole: inquiry.managerRole,
        phone: inquiry.phone,
        email: inquiry.email,
        approvedBy: admin.email,
      },
    });

    if (plan && plan.monthly && plan.monthly > 0) {
      await tx.facilitySubscription.create({
        data: {
          facilityId: targetFacilityId,
          plan: plan.id,
          // 입금 확인 전까지는 pending — 승인만으로 광고가 나가면 미수금이 쌓인다
          status: "pending",
          monthlyPrice: plan.monthly,
        },
      });
    }

    if (needsSponsor) {
      await tx.sponsorPlacement.create({
        data: {
          facilityId: targetFacilityId,
          scope: "sigungu",
          regionKey: sponsorRegion,
          // 구독이 pending인 동안은 노출하지 않는다. 입금 확인 후 켠다.
          active: false,
        },
      });
    }

    await tx.businessInquiry.update({
      where: { id },
      data: { status: "verified", facilityId: targetFacilityId, ...(memo !== undefined && { memo }) },
    });
  });

  return NextResponse.json({
    ok: true,
    approved: {
      facilityId: targetFacilityId,
      plan: plan?.id ?? "free",
      sponsorRegion: needsSponsor ? sponsorRegion : null,
    },
  });
}
