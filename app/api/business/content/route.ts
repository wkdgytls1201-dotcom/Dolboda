import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFacilityOwner } from "@/lib/facilityOwner";

// 기업회원 콘솔 — 소개글 저장.
//
// 규칙: 상태를 바꾸는 API에는 반드시 가드를 넣는다. 화면에서 폼을 숨겨도 막히지 않으므로
// 소유권(requireFacilityOwner)을 여기서 확인한다.

export async function PATCH(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const facilityId = typeof body.facilityId === "string" ? body.facilityId : "";
  const owner = await requireFacilityOwner(facilityId);
  if (!owner) return NextResponse.json({ error: "이 시설을 관리할 권한이 없어요." }, { status: 403 });

  // 소개글은 무료 포함 기능이다. 길이만 제한한다(검색·상세 페이로드를 지키기 위해).
  const intro = typeof body.intro === "string" ? body.intro.trim().slice(0, 2000) : "";

  const content = await prisma.facilityContent.upsert({
    where: { facilityId },
    update: { intro: intro || null, updatedBy: owner.userId },
    create: { facilityId, intro: intro || null, updatedBy: owner.userId },
  });

  return NextResponse.json({ ok: true, content });
}
