import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// 스폰서·배너 노출/클릭 비컨. components/AdTracking.tsx가 부른다.
//
// lib/monthlyReport.ts가 이 값을 읽어 "노출·클릭" 수치를 만든다 — 여기서 잘못 세면
// 유료 시설에게 보여주는 보고서 숫자가 틀어진다는 뜻이라 흔한 조회수 비컨보다 무게가 있다.

const VALID_KINDS = new Set([
  "sponsor_impression",
  "sponsor_click",
  "banner_impression",
  "banner_click",
]);

export async function POST(req: Request) {
  // 조회수 비컨과 같은 기준 — 봇 한 방에 수만 건이 쌓이는 것만 끊는다
  const limited = rateLimit(`adtrack:${clientIp(req)}`, 120, 60 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ ok: true });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("facilityId") ?? "";
  const kind = searchParams.get("kind") ?? "";
  if (!/^[a-z0-9-]{6,64}$/i.test(id) || !VALID_KINDS.has(kind)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const exists = await prisma.facility.findUnique({ where: { id }, select: { id: true } });
    if (exists) {
      // KST 날짜 기준 — 조회수 비컨과 같은 이유(자정 근처 카운트가 운영자 감각과 어긋나지 않게)
      await prisma.$executeRaw`
        INSERT INTO "AdEvent" ("facilityId", kind, date, count)
        VALUES (${id}, ${kind}, (now() AT TIME ZONE 'Asia/Seoul')::date, 1)
        ON CONFLICT ("facilityId", kind, date) DO UPDATE SET count = "AdEvent".count + 1
      `;
    }
  } catch (e) {
    console.error("광고 이벤트 집계 실패:", e);
  }
  return NextResponse.json({ ok: true });
}
