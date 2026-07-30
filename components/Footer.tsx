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
        {regions.length > 0 && (
          <nav aria-label="지역별 요양시설" className="mb-6 text-center sm:text-left">
            <p className="mb-2 text-xs font-semibold text-ink-500">지역별 요양시설 찾기</p>
            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 sm:justify-start">
              {regions.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/region/${encodeURIComponent(r.slug)}`}
                    className="text-xs text-ink-300 transition-colors duration-150 hover:text-primary-600"
                  >
                    {r.label} 요양시설
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="flex flex-col items-center gap-3 text-center text-xs text-ink-300 sm:flex-row sm:justify-between sm:text-left">
          <p>&copy; {new Date().getFullYear()} 돌보다. 표시된 시설 정보는 공공데이터 기반으로 실제와 다를 수 있습니다.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="transition-colors duration-150 hover:text-ink-700">
              이용약관
            </Link>
            <Link href="/privacy" className="font-semibold transition-colors duration-150 hover:text-ink-700">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
