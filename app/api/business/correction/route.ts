import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFacilityOwner } from "@/lib/facilityOwner";
import { resend, CONSULT_NOTIFY_EMAIL } from "@/lib/resend";
import { sendTelegram } from "@/lib/telegram";
import { SITE_URL, SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";

// 시설 콘솔 — 정보 정정 요청.
//
// 시설이 공공데이터 항목(인력·정원·연락처 등)을 직접 고치게 하지 않는다 —
// 그 값들은 안심지수·필터의 입력이라, 시설 손에 맡기면 지표의 신뢰가 무너진다.
// 대신 "무엇이 어떻게 다른지"를 접수받고 운영자가 원본과 대조해 반영한다.

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const facilityId = typeof body.facilityId === "string" ? body.facilityId : "";
  const owner = await requireFacilityOwner(facilityId);
  if (!owner) return NextResponse.json({ error: "이 시설을 관리할 권한이 없어요." }, { status: 403 });

  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
  if (message.length < 5) {
    return NextResponse.json({ error: "바로잡을 내용을 적어주세요." }, { status: 400 });
  }

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { name: true },
  });

  const correction = await prisma.facilityCorrection.create({
    data: { facilityId, message, createdBy: owner.userId },
  });

  // 운영자에게 즉시 알린다 — 정정은 미루면 그 사이 보호자가 틀린 정보로 결정한다
  const lines = [
    `시설: ${facility?.name ?? facilityId}`,
    `${SITE_URL}/facility/${facilityId}`,
    `\n[정정 요청 내용]\n${message}`,
  ];
  if (resend) {
    try {
      await resend.emails.send({
        from: `${SITE_NAME} 정정요청 <${MAIL_FROM}>`,
        to: CONSULT_NOTIFY_EMAIL,
        subject: `[정정요청] ${facility?.name ?? facilityId}`,
        text: lines.join("\n"),
      });
    } catch (e) {
      console.error("정정요청 메일 실패:", e);
    }
  }
  await sendTelegram(["✏️ 시설 정보 정정 요청", ...lines].join("\n"));

  return NextResponse.json({ ok: true, id: correction.id });
}
