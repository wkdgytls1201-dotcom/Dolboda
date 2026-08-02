import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 보호자가 지원자 중 한 명을 확정 — status를 "매칭확정"으로, 해당 CareRequest도 MATCHED로.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const application = await prisma.careRequestApplication.findUnique({
    where: { id: params.id },
    include: { careRequest: true },
  });
  if (!application || application.careRequest.guardianId !== session.user.id) {
    return NextResponse.json({ error: "처리할 수 없어요." }, { status: 404 });
  }

  const { action } = (await req.json()) as { action?: "confirm" };
  if (action !== "confirm") {
    return NextResponse.json({ error: "알 수 없는 처리예요." }, { status: 400 });
  }

  // 상태 가드 — 이미 처리된 요청이면 여기서 끊는다(대부분의 중복 클릭은 여기서 걸린다).
  if (application.careRequest.status !== "OPEN" || application.status !== "지원완료") {
    return NextResponse.json({ error: "이미 처리된 요청이에요." }, { status: 409 });
  }

  // 위 검사만으로는 부족하다 — 서로 다른 지원자를 거의 동시에 확정하면 두 요청이 모두
  // 검사를 통과해(둘 다 OPEN을 봄) 지원자 두 명이 "매칭확정"이 될 수 있다.
  // 그래서 트랜잭션 안에서 조건부 updateMany로 한 번 더 잠근다: OPEN인 요청을 MATCHED로
  // 바꾸는 데 성공한 쪽만 확정을 이어가고, 진 쪽은 count 0을 보고 롤백된다.
  try {
    const updatedApplication = await prisma.$transaction(async (tx) => {
      const claimed = await tx.careRequest.updateMany({
        where: { id: application.careRequestId, status: "OPEN" },
        data: { status: "MATCHED" },
      });
      if (claimed.count === 0) throw new Error("ALREADY_MATCHED");

      const app = await tx.careRequestApplication.update({
        where: { id: params.id },
        data: { status: "매칭확정" },
      });
      // 나머지 지원자는 그 자리에서 "미선정"으로 — 무소식으로 방치하는 것이
      // 매니저 이탈의 가장 큰 원인이다. 떨어진 걸 아는 게 아무 소식 없는 것보다 낫고,
      // 화면에서 "다음 기회에 다시 만나요"로 재지원을 유도할 수 있다.
      await tx.careRequestApplication.updateMany({
        where: {
          careRequestId: application.careRequestId,
          id: { not: params.id },
          status: "지원완료",
        },
        data: { status: "미선정" },
      });
      return app;
    });
    return NextResponse.json(updatedApplication);
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_MATCHED") {
      return NextResponse.json({ error: "이미 처리된 요청이에요." }, { status: 409 });
    }
    throw e;
  }
}

// 돌보다 매니저 본인이 지원을 취소
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const application = await prisma.careRequestApplication.findUnique({
    where: { id: params.id },
    include: { sitterProfile: true },
  });
  if (!application || application.sitterProfile.userId !== session.user.id) {
    return NextResponse.json({ error: "취소할 수 없어요." }, { status: 404 });
  }

  await prisma.careRequestApplication.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
