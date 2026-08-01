import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 완료된 돌봄에 보호자가 남기는 후기 — 매니저 "돌보다 인증 경력"의 원천 데이터.
// 만들 수 있는 조건을 좁게 잡는다:
//   내 요청 + COMPLETED 상태 + 실제로 확정됐던 매니저 + 아직 후기 없음(요청당 1건).
// 이 조건이 곧 신뢰다 — 아무나 별점을 못 만들기 때문에 ★4.8이 의미를 가진다.
const MAX_COMMENT = 200;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    careRequestId?: unknown;
    rating?: unknown;
    comment?: unknown;
  };
  const careRequestId = typeof body.careRequestId === "string" ? body.careRequestId : "";
  const rating =
    typeof body.rating === "number" && Number.isInteger(body.rating) ? body.rating : NaN;
  const comment =
    typeof body.comment === "string" ? body.comment.trim().slice(0, MAX_COMMENT) || null : null;

  if (!careRequestId || !(rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: "별점을 골라주세요." }, { status: 400 });
  }

  const careRequest = await prisma.careRequest.findUnique({
    where: { id: careRequestId },
    include: {
      review: { select: { id: true } },
      applications: { where: { status: "돌봄완료" }, select: { sitterProfileId: true } },
    },
  });
  if (!careRequest || careRequest.guardianId !== session.user.id) {
    return NextResponse.json({ error: "후기를 남길 수 없어요." }, { status: 404 });
  }
  if (careRequest.status !== "COMPLETED") {
    return NextResponse.json({ error: "돌봄이 완료된 뒤에 남길 수 있어요." }, { status: 400 });
  }
  if (careRequest.review) {
    return NextResponse.json({ error: "이미 후기를 남기셨어요." }, { status: 409 });
  }
  const sitterProfileId = careRequest.applications[0]?.sitterProfileId;
  if (!sitterProfileId) {
    return NextResponse.json({ error: "완료된 매니저를 찾을 수 없어요." }, { status: 400 });
  }

  const review = await prisma.careReview.create({
    data: { careRequestId, sitterProfileId, rating, comment },
  });
  return NextResponse.json(review, { status: 201 });
}
