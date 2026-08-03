import type { RegionBanner as RegionBannerData } from "@/lib/sponsor";
import { AdImpressionBeacon, TrackedLink } from "./AdTracking";

// 지역 배너 — 지역 프리미엄 이상 전용, 시·군·구당 1곳.
//
// 스폰서 목록(SponsorSlots)보다 위에 둔다: 이미지 한 장짜리라 시선을 가장 먼저 받고,
// 그게 프리미엄 값어치의 핵심이다. 그래도 '광고' 라벨은 똑같이 단다 — 자리가
// 비싸다고 표시 의무가 없어지지 않는다.
export function RegionBanner({ banner }: { banner: RegionBannerData | null }) {
  if (!banner) return null;

  return (
    <TrackedLink
      href={`/facility/${banner.facilityId}`}
      facilityId={banner.facilityId}
      kind="banner"
      className="group relative mb-6 block overflow-hidden rounded-2xl shadow-card"
      ariaLabel={`광고: ${banner.facilityName}`}
    >
      <AdImpressionBeacon facilityId={banner.facilityId} kind="banner" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.imageUrl}
        alt={`${banner.facilityName} 광고 배너`}
        loading="lazy"
        className="aspect-[4/1] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <span className="absolute right-2 top-2 rounded-full bg-ink-900/70 px-2 py-0.5 text-[11px] font-bold text-white">
        광고
      </span>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/60 to-transparent px-3 pb-2 pt-6 text-xs font-semibold text-white">
        {banner.facilityName}
      </span>
    </TrackedLink>
  );
}
