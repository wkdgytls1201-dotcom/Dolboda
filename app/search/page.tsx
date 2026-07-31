import type { Metadata } from "next";
import SearchPageClient from "./SearchPageClient";

// 검색 조건(q·type)이 붙은 URL은 조합이 무한이라 색인시키면 안 된다 — 크롤 예산만 낭비하고
// 지역·유형 검색어는 /region/... 정적 페이지가 담당한다. 기본 /search만 색인을 허용한다.
export function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string; type?: string };
}): Metadata {
  const hasFilter = Boolean(searchParams.q || searchParams.type);
  return hasFilter ? { robots: { index: false, follow: true } } : {};
}

// 검색 UI는 클라이언트에서 그려지므로, 검색봇이 읽을 안내문은 서버에서 함께 내려준다.
const TYPE_GUIDE: { label: string; desc: string }[] = [
  { label: "요양병원", desc: "의사·간호사가 상주하며 치료와 요양을 함께 하는 의료기관이에요. 건강보험이 적용돼요." },
  { label: "요양원", desc: "장기요양등급이 있는 어르신이 생활하는 입소 시설이에요. 장기요양보험이 적용돼요." },
  { label: "주야간보호센터", desc: "낮 시간 동안 돌봄·프로그램을 제공하고 저녁에 집으로 돌아가요." },
  { label: "방문요양센터", desc: "요양보호사가 어르신 댁으로 방문해 일상생활을 도와드려요." },
];

export default function SearchPage() {
  return (
    <>
      <SearchPageClient />
      {/* 검색봇용 서버 렌더 안내 — 화면에서도 검색 결과 아래에 유형 설명으로 보인다 */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-4">
        <h2 className="mb-2 text-base font-bold text-ink-900">
          전국 요양병원·요양원·주야간보호·방문요양 검색
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-ink-500">
          돌보다는 국민건강보험공단·건강보험심사평가원 공공데이터 기반으로 전국 28,000여 개
          요양시설의 평가등급, 비급여 비용, 인력 현황, 프로그램 정보를 비교할 수 있는
          서비스예요. 지역이나 시설명으로 검색하고, 평가등급·거리·빈자리 필터로 좁혀보세요.
        </p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TYPE_GUIDE.map((t) => (
            <div key={t.label} className="rounded-2xl border border-ink-100 bg-white p-4">
              <dt className="mb-1 text-sm font-bold text-ink-900">{t.label}</dt>
              <dd className="text-xs leading-relaxed text-ink-500">{t.desc}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
