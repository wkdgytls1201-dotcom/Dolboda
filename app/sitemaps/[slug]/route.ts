import { entriesFor, renderUrlSet, sitemapNames } from "@/lib/sitemapData";

// /sitemaps/static.xml, /sitemaps/regions.xml, /sitemaps/facilities-1.xml …
export const revalidate = 86400;

export async function generateStaticParams() {
  const names = await sitemapNames();
  return names.map((n) => ({ slug: `${n}.xml` }));
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const name = decodeURIComponent(params.slug).replace(/\.xml$/, "");
  const entries = await entriesFor(name);
  if (!entries) return new Response("Not found", { status: 404 });

  return new Response(renderUrlSet(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
