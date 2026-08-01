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

  // 상태 가드 — 이게 없으면 이미 확정된 요청에 다시 PATCH가 들어올 때
  // (중복 클릭·재시도) 지원자 두 명이 동시에 "매칭확정"이 될 수 있다.
  if (application.careRequest.status !== "OPEN" || application.status !== "지원완료") {
    return NextResponse.json({ error: "이미 처리된 요청이에요." }, { status: 409 });
  }

  const [updatedApplication] = await prisma.$transaction([
    prisma.careRequestApplication.update({
      where: { id: params.id },
      data: { status: "매칭확정" },
    }),
    // 나머지 지원자는 그 자리에서 "미선정"으로 — 무소식으로 방치하는 것이
    // 매니저 이탈의 가장 큰 원인이다. 떨어진 걸 아는 게 아무 소식 없는 것보다 낫고,
    // 화면에서 "다음 기회에 다시 만나요"로 재지원을 유도할 수 있다.
    prisma.careRequestApplication.updateMany({
      where: {
        careRequestId: application.careRequestId,
        id: { not: params.id },
        status: "지원완료",
      },
      data: { status: "미선정" },
    }),
    prisma.careRequest.update({
      where: { id: application.careRequestId },
      data: { status: "MATCHED" },
    }),
  ]);

  return NextResponse.json(updatedApplication);
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
