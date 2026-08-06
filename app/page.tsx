import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import type { HeroSlide } from "@/components/HeroBanner";
import { getFacilityStats, getHeroSlides } from "@/lib/facilityStats";

// 통계·배너는 서버에서 미리 집계해 넘긴다. 클라이언트에서만 불러오면 검색봇과 첫 화면이
// "등록된 시설 0곳"을 보게 되는데, 실제로는 28,000여 곳이라 신뢰에 그대로 타격이 된다.
// 집계 쿼리는 lib/facilityStats.ts에서 하루 캐시로 공유한다(/api/facilities/stats와 동일 캐시).
export const revalidate = 3600;

// 메인만 canonical이 없었다(2026-08-06 프로덕션 실측). 다른 페이지는 각자 갖고 있다.
//
// 루트 레이아웃에 넣지 않는 이유: Next는 `alternates.canonical`을 자식이 상속하므로,
// 레이아웃에 "/"를 두면 canonical을 따로 안 준 페이지가 전부 메인을 가리키게 된다.
// 그래서 메인 페이지에만 붙인다.
//
// dolboda.kr은 www로 308 리디렉션되지만(실측), 검색엔진이 파라미터가 붙은 주소나
// 외부 링크로 들어왔을 때 대표 주소를 명시해두는 편이 안전하다.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [initialStats, heroSlides] = await Promise.all([getFacilityStats(), getHeroSlides()]);
  return <HomeClient initialStats={initialStats} heroSlides={heroSlides as HeroSlide[]} />;
}
