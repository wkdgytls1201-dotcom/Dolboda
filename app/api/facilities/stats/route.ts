import { NextResponse } from "next/server";
import { getFacilityStats } from "@/lib/facilityStats";

// 홈 화면 통계 — 집계·캐시는 lib/facilityStats.ts에서 홈 페이지(서버)와 공유한다.
export async function GET() {
  const stats = await getFacilityStats();
  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
