import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/siteConfig";

// 시설 22,000여 건 전체를 포함 (sitemap 한도 5만 URL 이내). 하루 한 번 재생성.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/compare`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const facilities = await prisma.facility.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { id: "asc" },
  });

  return [
    ...staticPages,
    ...facilities.map((f) => ({
      url: `${SITE_URL}/facility/${f.id}`,
      lastModified: f.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
