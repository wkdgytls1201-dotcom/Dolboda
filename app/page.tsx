import HomeClient from "./HomeClient";
import type { HeroSlide } from "@/components/HeroBanner";
import { getFacilityStats, getHeroSlides } from "@/lib/facilityStats";

// 통계·배너는 서버에서 미리 집계해 넘긴다. 클라이언트에서만 불러오면 검색봇과 첫 화면이
// "등록된 시설 0곳"을 보게 되는데, 실제로는 28,000여 곳이라 신뢰에 그대로 타격이 된다.
// 집계 쿼리는 lib/facilityStats.ts에서 하루 캐시로 공유한다(/api/facilities/stats와 동일 캐시).
export const revalidate = 3600;

export default async function HomePage() {
  const [initialStats, heroSlides] = await Promise.all([getFacilityStats(), getHeroSlides()]);
  return <HomeClient initialStats={initialStats} heroSlides={heroSlides as HeroSlide[]} />;
}
