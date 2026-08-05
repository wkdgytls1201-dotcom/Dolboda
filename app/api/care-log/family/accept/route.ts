import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 가족 초대 수락(care-log-spec §9-5) — 로그인한 계정을 초대 토큰에 결합한다.
// 로그인 필수인 이유: 일지는 민감정보라 "누가 보는지"가 기록에 남아야 하고,
// 보호자가 사람 단위로 해제할 수 있어야 한다.

const INVITE_TTL_MS = 7 * 86400 * 1000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { token } = (await req.json()) as { token?: string };
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "초대 링크가 올바르지 않아요." }, { status: 400 });
  }

  const invite = await prisma.careLogFamilyAccess.findUnique({ where: { token } });
  if (!invite || invite.revokedAt) {
    return NextResponse.json({ error: "초대가 없거나 해제됐어요." }, { status: 404 });
  }

  // 이미 이 계정으로 수락된 초대면 그대로 성공 — 링크를 두 번 열어도 이상해지지 않는다
  if (invite.acceptedAt) {
    if (invite.userId === session.user.id) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "이미 다른 가족이 수락한 초대예요." }, { status: 409 });
  }
  if (invite.createdAt.getTime() < Date.now() - INVITE_TTL_MS) {
    return NextResponse.json(
      { error: "초대가 만료됐어요. 보호자께 새 링크를 요청해주세요." },
      { status: 410 }
    );
  }

  const request = await prisma.careRequest.findUnique({
    where: { id: invite.careRequestId },
    select: {
      guardianId: true,
      status: true,
      applications: {
        where: { status: { in: ["매칭확정", "돌봄완료"] } },
        select: { sitterProfile: { select: { userId: true } } },
      },
    },
  });
  if (!request || request.status === "CANCELLED") {
    return NextResponse.json({ error: "이 돌봄은 종료·취소됐어요." }, { status: 410 });
  }
  // 보호자 본인·담당 매니저의 수락은 뜻이 없다(이미 각자의 화면이 있다)
  if (
    request.guardianId === session.user.id ||
    request.applications.some((a) => a.sitterProfile.userId === session.user.id)
  ) {
    return NextResponse.json(
      { error: "보호자·매니저 계정은 가족 초대를 수락할 수 없어요." },
      { status: 400 }
    );
  }

  // 같은 요청에 같은 계정이 이미 수락돼 있으면 새 초대를 소모하지 않는다
  const existing = await prisma.careLogFamilyAccess.findFirst({
    where: { careRequestId: invite.careRequestId, userId: session.user.id, revokedAt: null },
  });
  if (existing) return NextResponse.json({ ok: true });

  // 동시 수락 경쟁은 조건부 updateMany로 선점 — 진 쪽은 409를 받는다
  const claimed = await prisma.careLogFamilyAccess.updateMany({
    where: { id: invite.id, acceptedAt: null, revokedAt: null },
    data: { userId: session.user.id, acceptedAt: new Date() },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "이미 다른 가족이 수락한 초대예요." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
