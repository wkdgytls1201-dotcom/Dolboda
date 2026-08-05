import { NextResponse } from "next/server";
import { getSimilar } from "@/lib/similarFacilities";
import type { SimilarIntent } from "@/lib/similarity";

// 조회·채점·캐시는 lib/similarFacilities.ts에 있다. 시설 상세 페이지의 서버 렌더링도
// 같은 함수를 쓰므로, 상세를 한 번 연 시설은 여기서 탭을 눌러도 DB를 다시 타지 않는다.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id가 필요해요." }, { status: 400 });

  const all = await getSimilar(id);
  if (!all) return NextResponse.json({ error: "시설을 찾을 수 없어요." }, { status: 404 });

  // intent를 지정하면 그 탭 것만 보낸다(≈13KB). 예전엔 intent가 있어도 intents(5개 전부,
  // ≈60KB)를 함께 실어 보내서, 처음 다른 탭을 누르는 순간 필요 없는 나머지 4개 탭
  // 데이터까지 받아오느라 그 탭 전환이 느리게 느껴졌다(2026-08-02 실측: 60KB→13KB).
  // intent가 없을 때만(여러 탭을 한 번에 준비해두고 싶을 때) 5개 전부를 보낸다.
  const intent = searchParams.get("intent") as SimilarIntent | null;
  const body = intent && all[intent] ? { items: all[intent] } : { intents: all };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
