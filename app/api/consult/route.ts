import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, CONSULT_NOTIFY_EMAIL } from "@/lib/resend";

export async function POST(req: Request) {
  const body = await req.json();
  const { facilityId, facilityName, name, phone } = body as {
    facilityId?: string;
    facilityName?: string;
    name?: string;
    phone?: string;
  };

  if (!facilityId || !facilityName || !name || !phone) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }

  const request = await prisma.consultRequest.create({
    data: { facilityId, facilityName, name, phone },
  });

  // 이메일 발송은 실패해도 접수(DB 저장) 자체는 성공으로 처리 — 리드를 잃지 않는 게 우선
  if (resend) {
    try {
      await resend.emails.send({
        from: "돌보다 상담신청 <onboarding@resend.dev>",
        to: CONSULT_NOTIFY_EMAIL,
        subject: `[상담신청] ${facilityName}`,
        text: `시설: ${facilityName} (${facilityId})\n이름: ${name}\n연락처: ${phone}\n접수시각: ${request.createdAt.toLocaleString(
          "ko-KR"
        )}`,
      });
    } catch (err) {
      console.error("상담신청 이메일 발송 실패", err);
    }
  }

  return NextResponse.json({ ok: true });
}
