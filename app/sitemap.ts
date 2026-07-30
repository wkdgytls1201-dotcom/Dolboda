import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/siteConfig";
import { getRegionIndex } from "@/lib/regionData";
import { findTypeSeoByType } from "@/lib/facilityTypeSeo";

// 시설 22,000여 건 + 지역 랜딩 전체 포함 (sitemap 한도 5만 URL 이내). 하루 한 번 재생성.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/grade-test`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/services`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/compare`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // 지역 랜딩: 시/도 + 시/군/구 + 시/군/구×시설유형 (집계 인덱스 한 번으로 전부 생성)
  const index = await getRegionIndex();
  const sidoSet = new Set<string>();
  const sigunguSet = new Set<string>();
  const regionPages: MetadataRoute.Sitemap = [];

  for (const row of index) {
    const sidoPath = `/region/${encodeURIComponent(row.sidoSlug)}`;
    const sigunguPath = `${sidoPath}/${encodeURIComponent(row.sigungu)}`;

    if (!sidoSet.has(sidoPath)) {
      sidoSet.add(sidoPath);
      regionPages.push({ url: `${SITE_URL}${sidoPath}`, changeFrequency: "weekly", priority: 0.8 });
    }
    if (!sigunguSet.has(sigunguPath)) {
      sigunguSet.add(sigunguPath);
      regionPages.push({
        url: `${SITE_URL}${sigunguPath}`,
        changeFrequency: "weekly",
        priority: 0.75,
      });
    }

    const typeSeo = findTypeSeoByType(row.facilityType);
    if (typeSeo) {
      regionPages.push({
        url: `${SITE_URL}${sigunguPath}/${encodeURIComponent(typeSeo.slug)}`,
        changeFrequency: "weekly",
        priority: 0.7,
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
