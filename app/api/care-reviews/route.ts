import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { POINT_EARN } from "@/lib/pointsConfig";

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
      applications: {
        where: { status: "돌봄완료" },
        select: { sitterProfileId: true, sitterProfile: { select: { userId: true } } },
      },
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

  let review;
  try {
    review = await prisma.careReview.create({
      data: { careRequestId, sitterProfileId, rating, comment },
    });
  } catch (e) {
    // 위의 careRequest.review 검사만으론 부족하다 — 같은 후기를 거의 동시에 두 번
    // 제출하면(더블클릭 등) 둘 다 검사를 통과할 수 있다. careRequestId가 @unique라
    // DB가 두 번째 생성을 막아주는데, 그걸 안 잡으면 처리되지 않은 500이 샌다
    // (2026-08-07 감사 — lib/points.ts와 같은 P2002 판별 방식).
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "이미 후기를 남기셨어요." }, { status: 409 });
    }
    throw e;
  }

  // 돌봄 포인트(docs/points-spec.md) — 완료 자체가 아니라 "보호자의 좋은 반응"이 지급
  // 조건이다(근무 대가가 아니라 감사에 대한 플랫폼 리워드 — 매니저 법적 거리 방침).
  // 요청당 후기 1건 가드가 곧 중복 지급 방지이고, 유니크 제약이 한 번 더 막는다.
  // 지급 실패는 무시 — 포인트 때문에 후기 저장이 실패하면 안 된다.
  const sitterUserId = careRequest.applications[0]?.sitterProfile.userId;
  if (sitterUserId) {
    await awardPoints({
      userId: sitterUserId,
      kind: "review_received",
      refId: careRequestId,
      amount: POINT_EARN.reviewReceived,
    });
    if (rating === 5) {
      await awardPoints({
        userId: sitterUserId,
        kind: "review_five_star",
        refId: careRequestId,
        amount: POINT_EARN.fiveStarBonus,
      });
    }
  }
  await awardPoints({
    userId: session.user.id,
    kind: "review_written",
    refId: careRequestId,
    amount: POINT_EARN.reviewWritten,
  });

  return NextResponse.json(review, { status: 201 });
}
