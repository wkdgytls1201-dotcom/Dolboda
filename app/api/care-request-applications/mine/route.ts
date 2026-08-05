import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 로그인한 돌보다 매니저 본인의 지원 내역 전체.
// 일자리 관리의 "지원 현황 / 매칭된 돌봄 / 완료된 돌봄" 탭이 이 하나로 그려진다.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const sitterProfile = await prisma.sitterProfile.findUnique({
    where: { userId: session.user.id },
    include: { certifications: true },
  });
  if (!sitterProfile) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  const applications = await prisma.careRequestApplication.findMany({
    where: { sitterProfileId: sitterProfile.id },
    orderBy: { createdAt: "desc" },
    include: { careRequest: { include: { guardian: { select: { name: true } } } } },
  });

  const sitter = {
    nickname: sitterProfile.nickname,
    experienceYears: sitterProfile.experienceYears,
    certifications: sitterProfile.certifications.map((c) => ({ id: c.id, name: c.name })),
  };

  // 확인서 페이지가 쓰는 단건(매칭확정) — 기존 응답 형태를 유지한다.
  const confirmed = applications.find(
    (a) => a.status === "매칭확정" && a.careRequest.status === "MATCHED"
  );

  return NextResponse.json({
    // 지원 내역(items)에는 보호자 이름을 싣지 않는다 — 지원완료·미선정 단계의 매니저에게
    // 보호자가 누구인지 알려줄 이유가 없다(open API가 recipientName을 뺀 것과 같은 원칙).
    // 확정 건(아래 application)은 그대로 둔다 — 돌봄 확인서가 그때부터 이름을 쓴다.
    items: applications.map((a) => {
      const { guardian, ...careRequest } = a.careRequest;
      void guardian;
      return {
        id: a.id,
        status: a.status,
        createdAt: a.createdAt,
        careRequest,
      };
    }),
    sitter,
    application: confirmed
      ? {
          id: confirmed.id,
          status: confirmed.status,
          careRequest: confirmed.careRequest,
          sitterProfile: sitter,
        }
      : null,
  });
}
