import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScoreContext } from "@/lib/scoreContext";

// 돌보다 공공데이터 기반 안심지수의 맥락 데이터 조회 API.
//
// 시설 상세 페이지 자체는 더는 이 엔드포인트를 부르지 않는다(2026-08-07) — 클라이언트
// 마운트 후 fetch라 28,000여 페이지가 매번 왕복 하나씩을 더 기다렸는데, 지금은
// app/facility/[id]/ScoreContextSection.tsx가 lib/scoreContext.ts를 서버에서 직접
// 호출해 <Suspense>로 흘려보낸다. 계산 로직은 그 lib 함수로 옮겼고, 이 라우트는
// 얇은 래퍼로 남겨 외부(모바일 앱 등)에서 같은 데이터를 REST로도 받을 수 있게 유지한다.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id가 필요해요." }, { status: 400 });

  const target = await prisma.facility.findUnique({
    where: { id },
    select: { facilityType: true, address: true, lat: true, lng: true },
  });
  if (!target) return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });

  const context = await getScoreContext(target);

  return NextResponse.json(context, {
    // 같은 시설을 여러 사람이 볼 때 서버까지 오지 않게 CDN에서도 하루 재사용한다
    // (/api/facilities/stats와 같은 방식).
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
