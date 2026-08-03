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

  // 내가 보호자로 올린 요청에는 지원할 수 없다.
  //
  // 한 계정이 보호자이자 돌보다 매니저일 수 있어서(마이페이지 역할 전환) 이 가드가
  // 없으면 자기 글에 자기가 지원하고 자기를 매칭 확정한 뒤 합의서까지 쓰게 된다 —
  // 실제로 그렇게 만들어진 데이터가 나왔다. 목록에서도 걸러내지만(care-requests/open),
  // 화면에서 감추는 것만으로는 막히지 않으므로 여기서 확실히 끊는다.
  if (careRequest.guardianId === session.user.id) {
    return NextResponse.json(
      { error: "내가 올린 돌봄 요청에는 지원할 수 없어요." },
      { status: 400 }
    );
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
