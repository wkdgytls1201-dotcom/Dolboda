import Link from "next/link";
import { getActiveRegions } from "@/lib/regionData";

export async function Footer() {
  // 시설 데이터가 있는 지역만 노출 (하루 캐시) — 검색엔진 크롤 경로 겸 바로가기
  let regions: { slug: string; label: string }[] = [];
  try {
    regions = await getActiveRegions();
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
              { href: "/about", label: "돌보다 소개" },
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
