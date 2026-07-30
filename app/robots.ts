import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 로그인해야 의미 있는 페이지와 API는 색인에서 제외
        disallow: ["/api/", "/mypage", "/account", "/care-request"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
