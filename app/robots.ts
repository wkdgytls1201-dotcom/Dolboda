import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 로그인해야 의미 있는 페이지와 API는 색인에서 제외.
        // /search는 noindex 메타로 처리한다 — 여기서 크롤링까지 막으면 그 메타를 읽지 못해
        // 이미 색인된 검색 URL이 오히려 안 빠진다.
        disallow: ["/api/", "/mypage", "/account", "/care-request", "/notifications", "/favorites"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
