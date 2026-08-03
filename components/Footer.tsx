import Link from "next/link";
import { getActiveRegions, getRegionIndex } from "@/lib/regionData";
import { FACILITY_TYPE_SEO } from "@/lib/facilityTypeSeo";

export async function Footer() {
  // 시설 데이터가 있는 지역만 노출 (하루 캐시) — 검색엔진 크롤 경로 겸 바로가기
  let regions: { slug: string; label: string }[] = [];
  // 전국 유형 허브(/요양원 등)로 가는 사이트 전역 링크. 모든 페이지에 있는 링크라
  // 허브가 색인·평가받는 데 가장 큰 도움이 되고, 사용자에게도 실제 바로가기가 된다.
  let hubs: { slug: string; label: string }[] = [];
  try {
    regions = await getActiveRegions();
    // 시설이 0곳인 유형은 페이지가 없다 — 링크하면 404다(허브 페이지와 같은 기준)
    const index = await getRegionIndex();
    const present = new Set(index.filter((r) => r.count > 0).map((r) => r.facilityType));
    hubs = FACILITY_TYPE_SEO.filter((t) => present.has(t.type)).map((t) => ({
      slug: t.slug,
      label: t.short,
    }));
  } catch {
    // DB 일시 장애 시에도 푸터 자체는 떠야 한다
  }

  return (
    <footer className="border-t border-ink-100 bg-white/60 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-3 text-center text-xs text-ink-300 sm:flex-row sm:justify-between sm:text-left">
          <p>&copy; {new Date().getFullYear()} 돌보다. 표시된 시설 정보는 공공데이터 기반으로 실제와 다를 수 있습니다.</p>
          {/* 푸터 링크도 실제로 누르는 링크다 — 26px면 40~60대 사용자가 옆 링크를
              잘못 누르기 쉬워서, 세로 여백으로 44px 터치 영역을 만든다(글자 크기는 유지) */}
          <div className="flex flex-wrap justify-center gap-x-4">
            {[
              { href: "/services", label: "돌봄 서비스" },
              { href: "/grade-test", label: "등급 테스트" },
              { href: "/guide", label: "요양 가이드" },
              { href: "/welfare-equipment", label: "복지용구 혜택" },
              { href: "/about", label: "돌보다 소개" },
              { href: "/business", label: "시설 운영자" },
              { href: "/data-policy", label: "데이터 출처" },
              { href: "/terms", label: "이용약관" },
              { href: "/privacy", label: "개인정보처리방침", bold: true },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`inline-flex min-h-[44px] items-center transition-colors duration-150 hover:text-ink-700 ${
                  l.bold ? "font-semibold" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {hubs.length > 0 && (
          <nav
            aria-label="시설 유형별 전국 현황"
            className="mt-4 border-t border-ink-100/60 pt-3 text-center sm:text-left"
          >
            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 sm:justify-start">
              {hubs.map((h) => (
                <li key={h.slug}>
                  <Link
                    href={`/${encodeURIComponent(h.slug)}`}
                    className="inline-flex min-h-[44px] items-center text-xs text-ink-300 transition-colors duration-150 hover:text-ink-700"
                  >
                    전국 {h.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* 검색엔진 크롤 경로용 지역 링크 — 서비스 동선에는 없는 SEO 전용 랜딩으로 연결.
            숨김 처리하면 스팸 신호가 되므로, 보이되 최대한 존재감 없게 둔다. */}
        {regions.length > 0 && (
          <nav
            aria-label="지역별 요양시설"
            className="mt-4 border-t border-ink-100/60 pt-3 text-center sm:text-left"
          >
            <ul className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 sm:justify-start">
              {regions.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/region/${encodeURIComponent(r.slug)}`}
                    className="text-[10px] text-ink-300/50 transition-colors duration-150 hover:text-ink-500"
                  >
                    {r.label} 요양시설
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </footer>
  );
}
