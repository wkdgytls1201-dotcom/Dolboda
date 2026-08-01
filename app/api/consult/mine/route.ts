import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 보호자 본인의 상담 신청 내역 — 시설을 비교하는 며칠 동안 "어디에 넣었더라"를
// 확인하러 돌아오는 화면의 데이터. 본인 것만 보인다.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const items = await prisma.consultRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      facilityId: true,
      facilityName: true,
      status: true,
      createdAt: true,
      // profileSummary는 내려주지 않는다 — 화면에서 안 쓰고, 민감정보는 필요한 곳에만
    },
  });

  return NextResponse.json({ items });
}

// 보호자 본인이 표시하는 진행 상태 셀프 체크 (연락받음 / 입소결정 / 해제)
const ALLOWED_STATUS = ["연락받음", "입소결정"] as const;

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: unknown; status?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  // null = 상태 해제(다시 '대기'로)
  const status =
    body.status === null
      ? null
      : ALLOWED_STATUS.includes(body.status as (typeof ALLOWED_STATUS)[number])
      ? (body.status as string)
      : undefined;
  if (status === undefined) {
    return NextResponse.json({ error: "상태 값이 올바르지 않아요." }, { status: 400 });
  }

  const existing = id
    ? await prisma.consultRequest.findUnique({ where: { id }, select: { userId: true } })
    : null;
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "수정할 수 없어요." }, { status: 404 });
  }

  const updated = await prisma.consultRequest.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });
  return NextResponse.json(updated);
}
