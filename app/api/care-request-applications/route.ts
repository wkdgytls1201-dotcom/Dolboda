import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const sitterProfile = await prisma.sitterProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!sitterProfile) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  const { careRequestId } = (await req.json()) as { careRequestId?: string };
  if (!careRequestId) {
    return NextResponse.json({ error: "careRequestId가 필요해요." }, { status: 400 });
  }

  const careRequest = await prisma.careRequest.findUnique({ where: { id: careRequestId } });
  if (!careRequest || careRequest.status !== "OPEN") {
    return NextResponse.json({ error: "지원할 수 없는 요청이에요." }, { status: 404 });
  }

  try {
    const application = await prisma.careRequestApplication.create({
      data: { careRequestId, sitterProfileId: sitterProfile.id },
    });
    return NextResponse.json(application, { status: 201 });
  } catch {
    return NextResponse.json({ error: "이미 지원한 요청이에요." }, { status: 409 });
  }
}
