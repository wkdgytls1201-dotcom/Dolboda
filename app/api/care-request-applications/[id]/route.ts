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

  const [updatedApplication] = await prisma.$transaction([
    prisma.careRequestApplication.update({
      where: { id: params.id },
      data: { status: "매칭확정" },
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
