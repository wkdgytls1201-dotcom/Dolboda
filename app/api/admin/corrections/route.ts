import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

// 운영자용 정보 정정 요청 처리.
//
// 상태 전이: 접수(null) → done(반영 완료) 또는 rejected(반영 불가).
// 시설이 콘솔에서 올린 요청(app/api/business/correction/route.ts)을 운영자가 원본
// 데이터와 대조해 확인한 뒤 여기서 상태만 바꾼다 — 실제 데이터 반영은 별도로
// 공단 재적재·수동 수정을 거치므로, 이 API는 "확인했다"는 상태 기록에 그친다.

const ALLOWED_STATUS = new Set(["done", "rejected"]);

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const rows = await prisma.facilityCorrection.findMany({
    where: status === "new" ? { status: null } : status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items: rows });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!id || !ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: "상태 값이 올바르지 않아요." }, { status: 400 });
  }

  const existing = await prisma.facilityCorrection.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "요청을 찾을 수 없어요." }, { status: 404 });

  const updated = await prisma.facilityCorrection.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true, correction: updated });
}
