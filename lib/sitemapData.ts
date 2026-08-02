import { prisma } from "./prisma";
import { SITE_URL } from "./siteConfig";
import { getRegionIndex } from "./regionData";
import { findTypeSeoByType, FACILITY_TYPE_SEO } from "./facilityTypeSeo";
import { GUIDES } from "./guides";

// 사이트맵을 종류별로 나눠 만든다. 한 파일에 3만 URL을 몰아넣으면 파일이 지나치게 크고,
// 서치콘솔에서 어느 묶음이 색인에 문제가 있는지 구분할 수 없다.
// Next 14의 generateSitemaps는 인덱스(/sitemap.xml)를 만들어주지 않아 직접 라우트로 구성한다.

export const FACILITIES_PER_SITEMAP = 10000;

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export async function facilityChunkCount(): Promise<number> {
  const total = await prisma.facility.count({ where: { dataSource: { not: "mock" } } });
  return Math.max(1, Math.ceil(total / FACILITIES_PER_SITEMAP));
}

/** 사이트맵 인덱스에 넣을 하위 사이트맵 이름들 */
export async function sitemapNames(): Promise<string[]> {
  const chunks = await facilityChunkCount();
  return [
    "static",
    "guides",
    "regions",
    ...Array.from({ length: chunks }, (_, i) => `facilities-${i + 1}`),
  ];
}

async function staticEntries(): Promise<SitemapEntry[]> {
  // 전국 유형 허브(/요양원 등) — 시설이 0곳인 유형은 페이지 자체가 없으므로 넣지 않는다.
  // 판단 기준을 app/[typeSlug]/page.tsx의 generateStaticParams와 똑같이 맞춰야
  // 사이트맵에만 있고 열면 404인 URL이 생기지 않는다.
  const index = await getRegionIndex();
  const present = new Set(index.filter((r) => r.count > 0).map((r) => r.facilityType));
  const hubEntries: SitemapEntry[] = FACILITY_TYPE_SEO.filter((t) => present.has(t.type)).map(
    (t) => ({
      loc: `${SITE_URL}/${encodeURIComponent(t.slug)}`,
      changefreq: "weekly",
      priority: 0.9,
    })
  );

  // 주의: /search는 noindex라 사이트맵에 넣지 않는다
  return [
    { loc: SITE_URL, changefreq: "daily", priority: 1 },
    ...hubEntries,
    { loc: `${SITE_URL}/grade-test`, changefreq: "monthly", priority: 0.9 },
    { loc: `${SITE_URL}/grade-helper`, changefreq: "monthly", priority: 0.9 },
    { loc: `${SITE_URL}/services`, changefreq: "monthly", priority: 0.9 },
    { loc: `${SITE_URL}/guide`, changefreq: "weekly", priority: 0.9 },
    { loc: `${SITE_URL}/services/hospital`, changefreq: "monthly", priority: 0.85 },
    { loc: `${SITE_URL}/services/home`, changefreq: "monthly", priority: 0.85 },
    { loc: `${SITE_URL}/services/housekeeping`, changefreq: "monthly", priority: 0.85 },
    { loc: `${SITE_URL}/services/family`, changefreq: "monthly", priority: 0.85 },
    { loc: `${SITE_URL}/business`, changefreq: "monthly", priority: 0.8 },
    { loc: `${SITE_URL}/about`, changefreq: "monthly", priority: 0.7 },
    { loc: `${SITE_URL}/data-policy`, changefreq: "monthly", priority: 0.7 },
    { loc: `${SITE_URL}/compare`, changefreq: "weekly", priority: 0.5 },
    { loc: `${SITE_URL}/terms`, changefreq: "yearly", priority: 0.2 },
    { loc: `${SITE_URL}/privacy`, changefreq: "yearly", priority: 0.2 },
  ];
}

function guideEntries(): SitemapEntry[] {
  return GUIDES.map((g) => ({
    loc: `${SITE_URL}/guide/${g.slug}`,
    lastmod: g.updated,
    changefreq: "monthly",
    priority: 0.8,
  }));
}

async function regionEntries(): Promise<SitemapEntry[]> {
  const index = await getRegionIndex();
  const sidoSet = new Set<string>();
  const sigunguSet = new Set<string>();
  const entries: SitemapEntry[] = [];

  for (const row of index) {
    const sidoPath = `/region/${encodeURIComponent(row.sidoSlug)}`;
    const sigunguPath = `${sidoPath}/${encodeURIComponent(row.sigungu)}`;

    if (!sidoSet.has(sidoPath)) {
      sidoSet.add(sidoPath);
      entries.push({ loc: `${SITE_URL}${sidoPath}`, changefreq: "weekly", priority: 0.8 });
    }
    if (!sigunguSet.has(sigunguPath)) {
      sigunguSet.add(sigunguPath);
      entries.push({ loc: `${SITE_URL}${sigunguPath}`, changefreq: "weekly", priority: 0.75 });
    }
    const typeSeo = findTypeSeoByType(row.facilityType);
    if (typeSeo) {
      entries.push({
        loc: `${SITE_URL}${sigunguPath}/${encodeURIComponent(typeSeo.slug)}`,
        changefreq: "weekly",
        priority: 0.7,
      });
    }
  }
  return entries;
}

async function facilityEntries(chunk: number): Promise<SitemapEntry[]> {
  // 데모 시설(mock)은 실재하지 않으므로 색인 대상에서 뺀다
  const rows = await prisma.facility.findMany({
    where: { dataSource: { not: "mock" } },
    select: { id: true, updatedAt: true },
    orderBy: { id: "asc" },
    skip: chunk * FACILITIES_PER_SITEMAP,
    take: FACILITIES_PER_SITEMAP,
  });
  return rows.map((f) => ({
    loc: `${SITE_URL}/facility/${f.id}`,
    lastmod: f.updatedAt.toISOString(),
    changefreq: "monthly",
    priority: 0.7,
  }));
}

export async function entriesFor(name: string): Promise<SitemapEntry[] | null> {
  if (name === "static") return staticEntries();
  if (name === "guides") return guideEntries();
  if (name === "regions") return regionEntries();
  const m = /^facilities-(\d+)$/.exec(name);
  if (m) {
    const n = Number(m[1]);
    const chunks = await facilityChunkCount();
    if (n < 1 || n > chunks) return null;
    return facilityEntries(n - 1);
  }
  return null;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderUrlSet(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${escapeXml(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod.slice(0, 10)}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined) parts.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export function renderSitemapIndex(names: string[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const items = names
    .map(
      (n) =>
        `  <sitemap>\n    <loc>${SITE_URL}/sitemaps/${n}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}
