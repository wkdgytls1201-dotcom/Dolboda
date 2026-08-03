import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { resend, CONSULT_NOTIFY_EMAIL } from "@/lib/resend";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { REGION_SEO } from "@/lib/regionSeo";
import { allEquipmentItems } from "@/lib/welfareEquipment";
import { SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";

// 복지용구 상담 신청 접수 — 로그인 없이도 부를 수 있는 쓰기 엔드포인트다(app/api/consult와
// 같은 위험이 있어 같은 방어를 그대로 쓴다).
//
// 복지용구 사업소(Institution)는 이메일이 없어(전화번호만 100% 보유) 시설처럼 자동
// 이메일 전달을 할 수 없다. 그래서 여기서는 DB 저장 + 운영자 알림(텔레그램·메일)까지만
// 하고, 신청자 연결은 운영자가 수동으로 한다(가까운 사업소 전화번호 안내 또는 직접 연락).
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const ITEM_NAMES = new Set(allEquipmentItems().map((i) => i.name));

export async function POST(req: Request) {
  const limited = rateLimit(`welfare-consult:${clientIp(req)}`, LIMIT, WINDOW_MS);
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const sidoSlug = typeof body.sido === "string" ? body.sido.trim() : "";
  const sigungu = typeof body.sigungu === "string" ? body.sigungu.trim() : "";
  const items = Array.isArray(body.items)
    ? body.items.filter((v): v is string => typeof v === "string" && ITEM_NAMES.has(v)).slice(0, 20)
    : [];

  if (!name || !phone || !sidoSlug || !sigungu) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }
  if (name.length > 20) {
    return NextResponse.json({ error: "이름이 너무 길어요." }, { status: 400 });
  }
  if (!PHONE_RE.test(phone.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "연락처 형식을 확인해주세요." }, { status: 400 });
  }
  // 클라이언트가 select value로 보내는 건 slug — 저장·알림에는 사람이 읽는 label을 쓴다
  const region = REGION_SEO.find((r) => r.slug === sidoSlug);
  if (!region) {
    return NextResponse.json({ error: "지역을 확인해주세요." }, { status: 400 });
  }
  const sido = region.label;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const request = await prisma.welfareConsultRequest.create({
    data: { name, phone, sido, sigungu, items, userId },
  });

  const receivedAt = request.createdAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const itemLine = items.length > 0 ? items.join(", ") : "품목 미지정";

  if (resend) {
    try {
      await resend.emails.send({
        from: `${SITE_NAME} 복지용구 상담신청 <${MAIL_FROM}>`,
        to: CONSULT_NOTIFY_EMAIL,
        subject: `[복지용구 상담신청] ${sido} ${sigungu} · ${name}`,
        text:
          `이름: ${name}\n연락처: ${phone}\n지역: ${sido} ${sigungu}\n관심품목: ${itemLine}\n` +
          `접수시각: ${receivedAt}\n로그인: ${userId ? "예" : "아니오"}`,
      });
    } catch (err) {
      console.error("복지용구 상담신청 운영자 메일 실패", err);
    }
  }

  await sendTelegram(
    [
      "🦽 새 복지용구 상담 신청",
      `· 신청자: ${name} / ${phone}`,
      `· 지역: ${sido} ${sigungu}`,
      `· 관심품목: ${itemLine}`,
      `· 접수: ${receivedAt}`,
    ].join("\n")
  );

  return NextResponse.json({ ok: true, id: request.id });
}
