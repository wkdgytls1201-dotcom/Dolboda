import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFacilityOwner } from "@/lib/facilityOwner";

// 시설 콘솔 — 우리 시설로 들어온 상담 신청 내역.
//
// 이름·연락처를 그대로 보여준다: 상담 신청은 "시설에 전달해 달라"는 뜻으로 남긴
// 정보이고, 이메일이 있는 시설엔 이미 같은 내용이 메일로 가고 있다. 오히려 이메일이
// 없던 19% 시설에게는 콘솔이 상담을 받아보는 유일한 창구가 된다.
// 접근은 소유권 확인(requireFacilityOwner)을 통과한 담당자뿐이다.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facilityId") ?? "";
  const owner = await requireFacilityOwner(facilityId);
  if (!owner) return NextResponse.json({ error: "이 시설을 관리할 권한이 없어요." }, { status: 403 });

  const rows = await prisma.consultRequest.findMany({
    where: { facilityId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      // 어르신 프로필 요약은 민감정보라 콘솔에는 "동의해서 첨부됨" 여부만 알려준다.
      // 상세 내용은 시설 이메일로 이미 전달된 것을 보게 한다(전달 경로를 늘리지 않는 원칙).
      profileSummary: true,
      facilityNotifiedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      status: r.status,
      hasProfile: r.profileSummary != null,
      emailed: r.facilityNotifiedAt != null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
