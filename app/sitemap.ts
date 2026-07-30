import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/siteConfig";
import { REGION_SEO } from "@/lib/regionSeo";
import { getActiveRegions, getRegionSummary } from "@/lib/regionData";

// 시설 22,000여 건 + 지역 랜딩 전체 포함 (sitemap 한도 5만 URL 이내). 하루 한 번 재생성.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/compare`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // 지역 랜딩: 시/도 + 그 아래 시/군/구 (데이터 있는 곳만)
  const regionPages: MetadataRoute.Sitemap = [];
  const activeRegions = await getActiveRegions();
  for (const active of activeRegions) {
    const region = REGION_SEO.find((r) => r.slug === active.slug);
    if (!region) continue;
    const sidoUrl = `${SITE_URL}/region/${encodeURIComponent(region.slug)}`;
    regionPages.push({ url: sidoUrl, changeFrequency: "weekly", priority: 0.8 });
    const summary = await getRegionSummary(region);
    for (const sg of summary.sigunguList) {
      regionPages.push({
        url: `${sidoUrl}/${encodeURIComponent(sg.name)}`,
        changeFrequency: "weekly",
        priority: 0.75,
      });
    }
  }

  const facilities = await prisma.facility.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { id: "asc" },
  });

  return [
    ...staticPages,
    ...regionPages,
    ...facilities.map((f) => ({
      url: `${SITE_URL}/facility/${f.id}`,
      lastModified: f.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
