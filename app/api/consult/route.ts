import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resend, CONSULT_NOTIFY_EMAIL, consultForwardEmailHtml } from "@/lib/resend";
import { sendTelegram } from "@/lib/telegram";
import { isOptedOut, unsubscribeToken } from "@/lib/emailOptOut";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { SITE_URL, SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";

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

  // 수신거부한 주소로는 두 번 다시 보내지 않는다. 발송 직전에 확인한다 —
  // 화면이나 목록에서 걸러도, 결국 여기를 지나야 메일이 나가기 때문이다.
  const optedOut = facilityEmail ? await isOptedOut(facilityEmail) : false;

  // 시설에 자동 발송 — 이메일 정보가 있을 때만. 실패해도 접수 자체는 이미 끝난 상태.
  // 발송 성공 여부를 DB에 남겨(facilityNotifiedAt) 운영자가 "직접 연락 필요"를 구분할 수 있게 한다.
  let facilityNotified = false;
  if (resend && facilityEmail && !optedOut) {
    // 주소마다 서명이 붙은 수신거부 링크 — 링크만 알면 남의 주소를 막을 수 있으면 안 된다
    const unsubscribeUrl =
      `${SITE_URL}/api/email/unsubscribe` +
      `?e=${encodeURIComponent(facilityEmail)}` +
      `&t=${unsubscribeToken(facilityEmail)}` +
      `&f=${encodeURIComponent(facilityId)}` +
      `&n=${encodeURIComponent(facility.name)}`;
    try {
      await resend.emails.send({
        from: `${SITE_NAME} 상담신청 <${MAIL_FROM}>`,
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
        // 정정 요청·수신거부를 "회신"으로 받으려면 답장이 닿을 주소가 있어야 한다 —
        // 발신 주소(noreply@)는 수신함이 없어서 회신이 사라진다.
        replyTo: CONSULT_NOTIFY_EMAIL,
        // List-Unsubscribe — Gmail이 발신자 평판을 매길 때 보는 항목이라 수신함 도달률에
        // 도움이 되고, 수신자는 본문을 읽지 않아도 메일 상단에서 바로 수신거부할 수 있다.
        //
        // 원클릭(RFC 8058)은 Gmail이 본문 없이 URL로 POST를 쏘고, 우리 엔드포인트가
        // 그 자리에서 차단 목록에 넣는다. 사람이 링크를 눌러 브라우저로 들어와도
        // 같은 처리를 하고 결과 화면을 보여준다. mailto도 함께 남겨 둘 다 되게 한다.
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${CONSULT_NOTIFY_EMAIL}?subject=${encodeURIComponent(
            `수신거부 ${facility.name}`
          )}>`,
          "List-Unsubscribe-Post": "List=One-Click",
        },
        text:
          `안녕하세요, ${facility.name} 담당자님.\n` +
          `장기요양시설 정보 서비스 ${SITE_NAME}(${SITE_URL})을 통해 아래와 같이 상담 문의가 접수되어 안내드립니다.\n\n` +
          `문의자: ${name}\n연락처: ${phone}\n접수시각: ${receivedAt}` +
          (profileLines ? `\n\n[문의자가 전달에 동의한 어르신 정보]\n${profileLines}` : "") +
          `\n\n문의자가 상담을 하길 원해요.\n\n` +
          `[${SITE_NAME}는 어떤 서비스인가요]\n` +
          `${SITE_NAME}는 고령화 시대의 돌봄 정보 격차를 해소하는 시니어 케어 플랫폼입니다.\n\n` +
          `노인 돌봄 시장은 빠르게 성장하고 있지만, 보호자가 믿을 수 있는 요양시설과 돌봄 서비스를 ` +
          `찾는 과정은 여전히 어렵고 복잡합니다. 시설마다 안내하는 정보의 기준이 다르고, 실제 ` +
          `서비스의 내용이나 비용을 객관적으로 비교하기도 쉽지 않습니다.\n\n` +
          `${SITE_NAME}는 이러한 돌봄 시장의 정보 비대칭을 해소하고, 보호자의 합리적인 의사결정을 ` +
          `돕기 위해 만들어졌습니다. 국민건강보험공단·건강보험심사평가원이 공개한 자료를 바탕으로 ` +
          `전국 요양시설 28,000여 곳의 위치·비용·인력 현황·평가 정보·제공 서비스를 한곳에 모아, ` +
          `보호자가 쉽고 투명하게 확인할 수 있도록 제공합니다.\n\n` +
          `어느 시설을 선택할지는 보호자와 시설이 직접 상담해 정하시며, ${SITE_NAME}는 그 사이에 ` +
          `개입하거나 순위를 임의로 바꾸지 않습니다.\n\n` +
          `[혹시 정보가 실제와 다르다면]\n` +
          `공공데이터를 기준으로 하다 보니 갱신 시점에 따라 현황과 차이가 생길 수 있습니다. ` +
          `귀 시설을 찾는 보호자에게 정확한 정보가 닿는 일이 무엇보다 중요하기에, 바로잡을 내용이 ` +
          `있으시면 이 메일에 회신해 주십시오. 확인 후 신속히 반영하겠습니다.\n\n` +
          `[문의 전달을 원하지 않으시면]\n` +
          `"수신거부"라고 회신해 주시면 이후 귀 시설로는 문의를 전달하지 않습니다. ` +
          `번거롭게 해 드리지 않겠습니다.\n\n` +
          `요양의 하루는 밖에서 잘 보이지 않습니다. 새벽에 불을 켜고, 식사를 챙기고, 밤사이 몇 번씩 ` +
          `살피는 일들은 기록에도 잘 남지 않지요. 저희는 그 보이지 않는 시간이 쌓여 우리 사회를 ` +
          `조금씩 더 따뜻하게 만들고 있다고 믿습니다.\n` +
          `오늘 도착한 이 문의도, 그 시간을 믿고 문을 두드린 한 가족의 마음입니다. ` +
          `귀 시설이 걸어가시는 길을 진심으로 응원합니다.\n\n` +
          `본 메일은 ${SITE_NAME} 이용자가 귀 시설 정보를 열람하고 남긴 상담 신청을 그대로 전달하는 ` +
          `안내 메일이며, 광고성 정보가 아닙니다.\n` +
          `${SITE_URL} · 운영 주체와 데이터 출처: ${SITE_URL}/about, ${SITE_URL}/data-policy`,
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
        from: `돌보다 상담신청 <${MAIL_FROM}>`,
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

  // 운영자 텔레그램 알림 — 메일함을 안 보고 있어도 폰으로 바로 뜬다.
  // 이메일이 없어 직접 연락해야 하는 건은 몇 분이 지나면 문의자가 다른 곳을 알아보기 때문에,
  // 도착 사실을 즉시 아는 게 실제로 중요하다.
  //
  // ⚠️ 어르신 건강 정보(profileLines)는 여기 담지 않는다 — 민감정보라 전달 경로를 늘리지
  // 않는 게 원칙이다(§민감정보 동의는 사전 체크하지 않는다와 같은 계열의 판단).
  // 상세 내용은 운영자 메일에 그대로 있으니 필요하면 거기서 본다.
  await sendTelegram(
    [
      facilityNotified ? "📩 새 상담 신청" : "⚠️ 새 상담 신청 (직접 연락 필요)",
      `· 시설: ${facility.name}`,
      `· 문의자: ${name} / ${phone}`,
      `· 접수: ${receivedAt}`,
      `· 시설 자동안내: ${
        facilityNotified
          ? `발송됨 (${facilityEmail})`
          : facilityEmail
          ? "발송 실패 — 직접 연락 필요"
          : "시설 이메일 없음 — 직접 연락 필요"
      }`,
      profileLines ? "· 어르신 정보 동의됨 — 메일 참고" : "",
      `${SITE_URL}/facility/${facilityId}`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  return NextResponse.json({ ok: true, facilityNotified });
}
