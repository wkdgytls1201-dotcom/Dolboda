import { renderSitemapIndex, sitemapNames } from "@/lib/sitemapData";

// 사이트맵 인덱스 — 하위 사이트맵(static·guides·regions·facilities-N)을 가리킨다.
export const revalidate = 86400;

export async function GET() {
  const xml = renderSitemapIndex(await sitemapNames());
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
