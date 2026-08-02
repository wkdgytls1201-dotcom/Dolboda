import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// 시설 상세 조회수 비컨. 상세 화면이 뜰 때 클라이언트가 한 번 쏜다(navigator.sendBeacon).
//
// 개인 식별 정보는 아무것도 받지 않는다 — (시설, 날짜)별 합계에 +1 할 뿐이다.
// 시설 콘솔의 "페이지 조회수" 숫자가 여기서 나온다.
//
// 실패해도 사용자 경험에는 아무 영향이 없어야 하므로 응답은 항상 가볍게 끝낸다.

export async function POST(req: Request) {
  // 봇·스크립트가 한 IP에서 조회수를 부풀리는 것을 느슨하게 막는다.
  // 정교한 부정 방지가 아니라 "루프 한 방에 수만 뷰"를 끊는 선이다.
  const limited = rateLimit(`view:${clientIp(req)}`, 120, 60 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ ok: true });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  // 시설 id 형식만 통과 — 아무 문자열이나 행으로 쌓이면 안 된다
  if (!/^[a-z0-9-]{6,64}$/i.test(id)) return NextResponse.json({ ok: true });

  try {
    // 실재하는 시설인지 가볍게 확인(쓰레기 행 방지) 후 하루 단위 upsert 증가
    const exists = await prisma.facility.findUnique({ where: { id }, select: { id: true } });
    if (exists) {
      // 날짜는 한국 기준 — CURRENT_DATE(UTC)로 쌓으면 오전 9시 전 조회가 전날로 잡혀
      // 콘솔의 "오늘" 숫자가 운영자 감각과 어긋난다(실측으로 확인하고 바꿈)
      await prisma.$executeRaw`
        INSERT INTO "FacilityDailyView" ("facilityId", date, count)
        VALUES (${id}, (now() AT TIME ZONE 'Asia/Seoul')::date, 1)
        ON CONFLICT ("facilityId", date) DO UPDATE SET count = "FacilityDailyView".count + 1
      `;
    }
  } catch (e) {
    // 집계 실패가 페이지에 새어나가면 안 된다
    console.error("조회수 집계 실패:", e);
  }
  return NextResponse.json({ ok: true });
}
