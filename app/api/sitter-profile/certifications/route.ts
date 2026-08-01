import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// app/api/sitter-profile/route.ts의 일괄 등록과 같은 상한을 쓴다
const MAX_NAME = 50;
const MAX_CERTIFICATIONS = 20;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const profile = await prisma.sitterProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  const body = (await req.json()) as { name?: unknown; issuedBy?: unknown };
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
  const issuedBy =
    typeof body.issuedBy === "string" ? body.issuedBy.trim().slice(0, MAX_NAME) || null : null;
  if (!name) {
    return NextResponse.json({ error: "자격증명을 입력해주세요." }, { status: 400 });
  }

  // 개수 상한이 없어서 같은 요청을 반복하면 무한정 쌓을 수 있었다.
  // 자격증은 프로필 응답에 통째로 실려 나가므로 응답 크기와도 직결된다.
  const existing = await prisma.sitterCertification.count({ where: { sitterProfileId: profile.id } });
  if (existing >= MAX_CERTIFICATIONS) {
    return NextResponse.json(
      { error: `자격증은 최대 ${MAX_CERTIFICATIONS}개까지 등록할 수 있어요.` },
      { status: 400 }
    );
  }

  const certification = await prisma.sitterCertification.create({
    data: { sitterProfileId: profile.id, name, issuedBy },
  });

  return NextResponse.json(certification, { status: 201 });
}
