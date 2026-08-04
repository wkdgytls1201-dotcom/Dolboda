import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/admin";
import { resend, applicationReceivedEmailHtml } from "@/lib/resend";
import { SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";
import { careRequestSummary } from "@/lib/careLocationTypes";

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
  //
  // 단, 운영자 계정은 예외다 — 돌봄 흐름(지원→매칭→합의서 서명)을 계정 하나로
  // 끝까지 시험해봐야 하기 때문. 프로덕션에서도 확인이 필요해 NODE_ENV가 아니라
  // 운영자 판별로 연다(lib/admin.ts).
  if (
    careRequest.guardianId === session.user.id &&
    !isAdminUser(session.user.id, session.user.email)
  ) {
    return NextResponse.json(
      { error: "내가 올린 돌봄 요청에는 지원할 수 없어요." },
      { status: 400 }
    );
  }

  let application;
  try {
    application = await prisma.careRequestApplication.create({
      data: { careRequestId, sitterProfileId: sitterProfile.id },
    });
  } catch {
    return NextResponse.json({ error: "이미 지원한 요청이에요." }, { status: 409 });
  }

  // 보호자에게 "새 지원자 왔어요" 메일 — 지원 자체는 이미 저장됐으니 메일이 실패해도
  // 응답은 그대로 성공으로 돌려준다(발송 실패가 지원을 되돌리면 안 된다).
  if (resend) {
    try {
      const guardian = await prisma.user.findUnique({
        where: { id: careRequest.guardianId },
        select: { email: true },
      });
      if (guardian?.email) {
        await resend.emails.send({
          from: `${SITE_NAME} <${MAIL_FROM}>`,
          to: guardian.email,
          subject: `[${SITE_NAME}] ${sitterProfile.nickname}님이 돌봄 요청에 지원했어요`,
          html: applicationReceivedEmailHtml({
            sitterNickname: sitterProfile.nickname,
            requestSummary: careRequestSummary(careRequest),
          }),
        });
      }
    } catch {
      // 무시 — 지원 처리 자체는 이미 끝났다
    }
  }

  return NextResponse.json(application, { status: 201 });
}
