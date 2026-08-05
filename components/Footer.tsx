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
        {/* 링크를 성격별로 묶어 세로로 세운다.
            예전엔 9개를 한 줄에 flex-wrap으로 흘려서 좁은 화면에서 4/4/1처럼 어긋나게
            접혔다 — 줄 끝이 들쭉날쭉해 정돈돼 보이지 않았다. 묶음으로 나누면 개수가
            맞지 않아도 의도된 배치로 읽힌다.
            터치 영역: 세로로 늘어선 링크라 44px 높이가 그대로 안전한 간격이 된다
            (40~60대 사용자가 옆 링크를 잘못 누르지 않게 — 글자 크기는 그대로 둔다). */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 text-xs sm:grid-cols-3">
          {[
            {
              title: "서비스",
              links: [
                { href: "/services", label: "돌봄 서비스" },
                { href: "/grade-test", label: "등급 테스트" },
                { href: "/guide", label: "요양 가이드" },
                { href: "/welfare-equipment", label: "복지용구 혜택" },
              ],
            },
            {
              title: "돌보다",
              links: [
                { href: "/about", label: "돌보다 소개" },
                { href: "/business", label: "기업회원" },
                { href: "/data-policy", label: "데이터 출처" },
                { href: "/editorial-policy", label: "콘텐츠 원칙" },
              ],
            },
            {
              title: "이용 안내",
              links: [
                { href: "/terms", label: "이용약관" },
                { href: "/privacy", label: "개인정보처리방침", bold: true },
              ],
            },
          ].map((group) => (
            <div key={group.title}>
              <p className="mb-1 font-bold text-ink-500">{group.title}</p>
              <ul>
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`inline-flex min-h-[44px] items-center text-ink-300 transition-colors duration-150 hover:text-ink-700 ${
                        l.bold ? "font-semibold" : ""
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 border-t border-ink-100/60 pt-5 text-xs leading-relaxed text-ink-300">
          &copy; {new Date().getFullYear()} 돌보다. 표시된 시설 정보는 공공데이터 기반으로 실제와
          다를 수 있습니다.
        </p>

        {/* 아래 지역 링크와 같은 성격(검색엔진 크롤 경로)이라 같은 무게로 낮췄다.
            서비스 동선에서 실제로 누르는 링크가 아닌데 본문 링크와 같은 크기·진하기로
            두면 정작 위쪽 메뉴가 묻힌다. 숨기면 스팸 신호가 되므로 보이되 최대한
            존재감 없게 둔다(지역 링크와 동일한 처리). */}
        {hubs.length > 0 && (
          <nav
            aria-label="시설 유형별 전국 현황"
            className="mt-4 border-t border-ink-100/60 pt-3 text-center sm:text-left"
          >
            <ul className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 sm:justify-start">
              {hubs.map((h) => (
                <li key={h.slug}>
                  <Link
                    href={`/${encodeURIComponent(h.slug)}`}
                    // inline-block + py-1: 보이는 크기는 그대로 두고 탭 영역만 넓힌다.
                    // 16px짜리 링크는 손가락으로 정확히 누르기 어렵고 WCAG 2.2 AA(24px)에도
                    // 못 미쳤다. 패딩은 눈에 안 보이니 "존재감 없게 둔다"는 원래 의도도 유지된다.
                    className="inline-block py-1 text-[10px] text-ink-300/50 transition-colors duration-150 hover:text-ink-500"
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
                    // inline-block + py-1: 보이는 크기는 그대로 두고 탭 영역만 넓힌다.
                    // 16px짜리 링크는 손가락으로 정확히 누르기 어렵고 WCAG 2.2 AA(24px)에도
                    // 못 미쳤다. 패딩은 눈에 안 보이니 "존재감 없게 둔다"는 원래 의도도 유지된다.
                    className="inline-block py-1 text-[10px] text-ink-300/50 transition-colors duration-150 hover:text-ink-500"
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
