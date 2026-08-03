import { NextResponse } from "next/server";
import { getWelfareProviders, getWelfareSigunguList } from "@/lib/welfareProviders";
import { REGION_SEO } from "@/lib/regionSeo";

// 복지용구 혜택 화면(마이페이지)의 지역 선택기가 부르는 API.
// 로그인 없이도 동작한다 — 사업소 목록 자체는 공개 정보라 게이트를 걸 이유가 없다
// (이 화면 진입 자체는 마이페이지 하위라 이미 로그인 뒤다).

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sido = searchParams.get("sido") ?? "";
  const sigungu = searchParams.get("sigungu");

  if (!REGION_SEO.some((r) => r.slug === sido)) {
    return NextResponse.json({ error: "지역을 확인해주세요." }, { status: 400 });
  }

  if (!sigungu) {
    const list = await getWelfareSigunguList(sido);
    return NextResponse.json({ sigunguList: list });
  }

  const providers = await getWelfareProviders(sido, sigungu);
  return NextResponse.json({ providers });
}
