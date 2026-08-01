import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resend, CONSULT_NOTIFY_EMAIL, consultForwardEmailHtml } from "@/lib/resend";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";

// 로그인 없이 부를 수 있는 유일한 쓰기 엔드포인트다(DB 저장 + 메일 발송).
// 그대로 두면 스크립트 한 번에 수만 건이 쌓이고 메일도 그만큼 나간다.
// 한 사람이 시설 몇 곳을 비교하며 신청하는 건 정상이라 시간당 5건까지 열어둔다.
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

// 010-1234-5678 / 01012345678 / 02-123-4567 등 국내 번호 형태만 받는다
const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function facilityEmailOf(extra: unknown): string | null {
  const email = (extra as { institutionInfo?: { email?: string } } | null)?.institutionInfo?.email;
  const trimmed = email?.trim();
  return trimmed && EMAIL_RE.test(trimmed) ? trimmed : null;
}

export async function POST(req: Request) {
  const limited = rateLimit(`consult:${clientIp(req)}`, LIMIT, WINDOW_MS);
  if (!limited.ok) {
    return tooManyRequests(
      "상담 신청이 잠시 제한됐어요. 시간을 두고 다시 시도해주세요.",
      limited.retryAfter
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const facilityId = typeof body.facilityId === "string" ? body.facilityId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!facilityId || !name || !phone) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }
  if (name.length > 20) {
    return NextResponse.json({ error: "이름이 너무 길어요." }, { status: 400 });
  }
  if (!PHONE_RE.test(phone.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "연락처 형식을 확인해주세요." }, { status: 400 });
  }

  // 시설명·이메일은 클라이언트가 보낸 값을 믿지 않고 DB에서 가져온다 —
  // 안 그러면 실재하지 않는 시설 이름이 그대로 접수함과 알림 메일에 실린다.
  // extra는 institutionInfo.email(시설 자동 발송 대상)을 꺼내는 데만 쓴다.
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { name: true, extra: true },
  });
  if (!facility) {
    return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });
  }
  const facilityEmail = facilityEmailOf(facility.extra);

  // 로그인 상태면 계정에 연결 — 마이페이지 "상담 내역"의 근거. 비로그인도 그대로 접수.
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // "어르신 정보 함께 전달" 옵트인 — careProfileId가 왔고 그 프로필이 본인 것일 때만.
  // 신청 시점 스냅샷으로 복사한다(이후 프로필을 지워도 이미 한 상담 내용은 유지).
  let profileSummary: Record<string, string | string[] | null> | null = null;
  const careProfileId = typeof body.careProfileId === "string" ? body.careProfileId : null;
  if (careProfileId && userId) {
    const p = await prisma.careProfile.findUnique({ where: { id: careProfileId } });
    if (p && p.userId === userId) {
      profileSummary = {
        relation: p.relation,
        gender: p.gender,
        ageBand: p.ageBand,
        weightBand: p.weightBand,
        mobilityLevel: p.mobilityLevel,
        mealAssistLevel: p.mealAssistLevel,
        toiletAssistLevel: p.toiletAssistLevel,
        conditions: p.conditions,
        ltcGrade: p.ltcGrade,
      };
    }
  }

  const request = await prisma.consultRequest.create({
    data: {
      facilityId,
      facilityName: facility.name,
      name,
      phone,
      userId,
      ...(profileSummary ? { profileSummary } : {}),
    },
  });

  const receivedAt = request.createdAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const profileLines = profileSummary
    ? [
        profileSummary.relation && `관계: ${profileSummary.relation}`,
        profileSummary.gender && `성별: ${profileSummary.gender}`,
        profileSummary.ageBand && `연령대: ${profileSummary.ageBand}`,
        profileSummary.weightBand && `체중대: ${profileSummary.weightBand}`,
        profileSummary.mobilityLevel && `거동: ${profileSummary.mobilityLevel}`,
        profileSummary.mealAssistLevel && `식사: ${profileSummary.mealAssistLevel}`,
        profileSummary.toiletAssistLevel && `배변: ${profileSummary.toiletAssistLevel}`,
        Array.isArray(profileSummary.conditions) &&
          profileSummary.conditions.length > 0 &&
          `질환·상태: ${(profileSummary.conditions as string[]).join(", ")}`,
        profileSummary.ltcGrade && `장기요양등급: ${profileSummary.ltcGrade}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  // 시설에 자동 발송 — 이메일 정보가 있을 때만. 실패해도 접수 자체는 이미 끝난 상태.
  // 발송 성공 여부를 DB에 남겨(facilityNotifiedAt) 운영자가 "직접 연락 필요"를 구분할 수 있게 한다.
  let facilityNotified = false;
  if (resend && facilityEmail) {
    try {
      await resend.emails.send({
        from: `${SITE_NAME} 상담신청 <onboarding@resend.dev>`,
        to: facilityEmail,
        subject: `[${SITE_NAME}] ${facility.name}에 상담 문의가 접수됐어요`,
        // 거래성 정보만 담는다(광고 문구 없음) — lib/resend.ts 상단 주석 참고
        html: consultForwardEmailHtml({
          facilityName: facility.name,
          requesterName: name,
          requesterPhone: phone,
          receivedAt,
          profileLines: profileLines || undefined,
        }),
        text:
          `안녕하세요, ${facility.name} 담당자님.\n` +
          `장기요양시설 정보 서비스 ${SITE_NAME}(${SITE_URL})을 통해 아래와 같이 상담 문의가 접수되어 안내드립니다.\n\n` +
          `문의자: ${name}\n연락처: ${phone}\n접수시각: ${receivedAt}` +
          (profileLines ? `\n\n[문의자가 전달에 동의한 어르신 정보]\n${profileLines}` : "") +
          `\n\n문의자에게 직접 연락해 상담을 진행해 주시면 됩니다.\n` +
          `본 메일은 ${SITE_NAME} 이용자가 귀 시설 정보를 열람하고 남긴 상담 신청을 그대로 전달하는 ` +
          `안내 메일이며, 광고성 정보가 아닙니다. 문의사항은 ${SITE_URL}/about 을 참고해 주세요.`,
      });
      facilityNotified = true;
    } catch (err) {
      console.error("상담신청 시설 발송 실패", err);
    }
  }
  if (facilityNotified) {
    await prisma.consultRequest.update({
      where: { id: request.id },
      data: { facilityNotifiedAt: new Date() },
    });
  }

  // 운영자 알림 — 시설에 자동 발송됐는지 여부를 함께 적어, 이메일이 없어 직접 연락이
  // 필요한 건만 운영자가 골라내 처리할 수 있게 한다.
  if (resend) {
    try {
      await resend.emails.send({
        from: "돌보다 상담신청 <onboarding@resend.dev>",
        to: CONSULT_NOTIFY_EMAIL,
        subject: `[상담신청] ${facility.name}${facilityNotified ? "" : " (시설 자동안내 실패 — 직접 연락 필요)"}`,
        text:
          `시설: ${facility.name} (${facilityId})\n이름: ${name}\n연락처: ${phone}\n접수시각: ${receivedAt}\n` +
          `시설 자동 안내: ${
            facilityNotified ? `성공 (${facilityEmail})` : facilityEmail ? "실패 — 발송 오류" : "이메일 정보 없음 — 직접 연락 필요"
          }` +
          (profileLines ? `\n\n[보호자가 전달에 동의한 어르신 정보]\n${profileLines}` : ""),
      });
    } catch (err) {
      console.error("상담신청 운영자 알림 실패", err);
    }
  }

  return NextResponse.json({ ok: true, facilityNotified });
}
