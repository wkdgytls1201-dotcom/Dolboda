import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, CONSULT_NOTIFY_EMAIL } from "@/lib/resend";
import { sendTelegram } from "@/lib/telegram";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { findPlan, formatPlanPrice } from "@/lib/businessPlans";
import { SITE_URL, SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";

// 시설 운영자 입점·제휴 신청 (/business).
//
// 로그인을 요구하지 않는다 — 시설 담당자는 아직 우리 계정이 없고, 계정부터 만들라고 하면
// 거기서 대부분 떠난다. 계정 연결은 확인 전화를 마친 뒤 마지막 단계다.
// 대신 상담 신청과 같은 방식으로 IP당 상한을 둔다.
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 공단 기관기호는 11자리, 사업자등록번호는 10자리 숫자다. 하이픈은 지우고 본다. */
function normalizeRegistryNo(raw: string): { type: "instCode" | "bizNo"; no: string } | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return { type: "instCode", no: digits };
  if (digits.length === 10) return { type: "bizNo", no: digits };
  return null;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  const limited = rateLimit(`business:${clientIp(req)}`, LIMIT, WINDOW_MS);
  if (!limited.ok) {
    return tooManyRequests(
      "신청이 잠시 제한됐어요. 시간을 두고 다시 시도해주세요.",
      limited.retryAfter
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const facilityName = str(body.facilityName, 60);
  const registryRaw = str(body.registryNo, 40);
  const managerName = str(body.managerName, 20);
  const managerRole = str(body.managerRole, 30);
  const phone = str(body.phone, 20);
  const email = str(body.email, 100);
  const planId = str(body.plan, 30);
  const message = str(body.message, 1000);

  if (!facilityName || !registryRaw || !managerName || !phone || !email) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }
  const registry = normalizeRegistryNo(registryRaw);
  if (!registry) {
    return NextResponse.json(
      { error: "기관기호(11자리) 또는 사업자등록번호(10자리)를 확인해주세요." },
      { status: 400 }
    );
  }
  if (!PHONE_RE.test(phone.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "연락처 형식을 확인해주세요." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "이메일 형식을 확인해주세요." }, { status: 400 });
  }
  const plan = findPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "관심 상품을 선택해주세요." }, { status: 400 });
  }
  // 개인정보 수집 동의는 서버에서도 확인한다 — 화면 체크박스만 믿으면
  // 동의 없이 들어온 개인정보를 우리가 저장하게 된다.
  if (body.agreed !== true) {
    return NextResponse.json({ error: "개인정보 수집·이용 동의가 필요해요." }, { status: 400 });
  }

  // 기관기호로 우리 DB의 시설을 찾아 붙여둔다 — 운영자가 어느 페이지인지 바로 열어볼 수 있다.
  // 못 찾아도 신청은 그대로 받는다(신규 개설이라 아직 공단 자료에 없을 수 있다).
  let facilityId: string | null = null;
  let matchedName: string | null = null;
  if (registry.type === "instCode") {
    const found = await prisma.facility.findFirst({
      where: { extra: { path: ["institutionInfo", "instCode"], equals: registry.no } },
      select: { id: true, name: true },
    });
    if (found) {
      facilityId = found.id;
      matchedName = found.name;
    }
  }

  const inquiry = await prisma.businessInquiry.create({
    data: {
      facilityName,
      registryType: registry.type,
      registryNo: registry.no,
      facilityId,
      managerName,
      managerRole: managerRole || null,
      phone,
      email,
      plan: plan.id,
      message: message || null,
    },
  });

  const receivedAt = inquiry.createdAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const registryLabel = registry.type === "instCode" ? "기관기호" : "사업자등록번호";
  const lines = [
    `시설: ${facilityName}`,
    `${registryLabel}: ${registry.no}`,
    facilityId ? `돌보다 시설: ${matchedName} (${SITE_URL}/facility/${facilityId})` : "돌보다 시설: 매칭 안 됨 — 직접 확인 필요",
    `담당자: ${managerName}${managerRole ? ` (${managerRole})` : ""}`,
    `연락처: ${phone}`,
    `이메일: ${email}`,
    `관심 상품: ${plan.name} (${formatPlanPrice(plan)})`,
    `접수: ${receivedAt}`,
    message ? `\n[남긴 말]\n${message}` : "",
  ].filter(Boolean);

  // 운영자 알림 — 실패해도 접수 자체는 이미 끝난 상태다(상담 신청과 같은 원칙).
  if (resend) {
    try {
      await resend.emails.send({
        from: `${SITE_NAME} 제휴신청 <${MAIL_FROM}>`,
        to: CONSULT_NOTIFY_EMAIL,
        subject: `[제휴신청] ${facilityName} — ${plan.name}`,
        text: `${lines.join("\n")}\n\n다음 단계: 공단 공개 대표번호로 확인 전화 → 서류 1건 수령 → 계정 연결`,
      });
    } catch (err) {
      console.error("제휴신청 운영자 알림 실패", err);
    }
  }

  await sendTelegram(["🏢 새 제휴 신청", ...lines].join("\n"));

  return NextResponse.json({ ok: true });
}
