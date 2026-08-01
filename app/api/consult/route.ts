import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resend, CONSULT_NOTIFY_EMAIL } from "@/lib/resend";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";

// 로그인 없이 부를 수 있는 유일한 쓰기 엔드포인트다(DB 저장 + 메일 발송).
// 그대로 두면 스크립트 한 번에 수만 건이 쌓이고 메일도 그만큼 나간다.
// 한 사람이 시설 몇 곳을 비교하며 신청하는 건 정상이라 시간당 5건까지 열어둔다.
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

// 010-1234-5678 / 01012345678 / 02-123-4567 등 국내 번호 형태만 받는다
const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;

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

  // 시설명은 클라이언트가 보낸 값을 믿지 않고 DB에서 가져온다 —
  // 안 그러면 실재하지 않는 시설 이름이 그대로 접수함과 알림 메일에 실린다.
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { name: true },
  });
  if (!facility) {
    return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });
  }

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

  // 이메일 발송은 실패해도 접수(DB 저장) 자체는 성공으로 처리 — 리드를 잃지 않는 게 우선
  if (resend) {
    try {
      await resend.emails.send({
        from: "돌보다 상담신청 <onboarding@resend.dev>",
        to: CONSULT_NOTIFY_EMAIL,
        subject: `[상담신청] ${facility.name}`,
        text:
          `시설: ${facility.name} (${facilityId})\n이름: ${name}\n연락처: ${phone}\n접수시각: ${request.createdAt.toLocaleString(
            "ko-KR",
            { timeZone: "Asia/Seoul" }
          )}` +
          (profileSummary
            ? `\n\n[보호자가 전달에 동의한 어르신 정보]\n` +
              [
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
            : ""),
      });
    } catch (err) {
      console.error("상담신청 이메일 발송 실패", err);
    }
  }

  return NextResponse.json({ ok: true });
}
