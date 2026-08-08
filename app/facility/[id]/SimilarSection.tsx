import { DetailSection } from "@/components/DetailSection";
import { SimilarFacilities } from "@/components/SimilarFacilities";
import { getSimilar } from "@/lib/similarFacilities";

// "이 시설과 비슷한 곳" 섹션 — 페이지 본문에서 떼어내 <Suspense>로 흘려보내는 조각.
//
// 왜 떼어냈나: 이 섹션은 상세 페이지 **맨 아래**에 있어 첫 화면에 보이지도 않는데,
// 여기 필요한 조회가 끝날 때까지 시설명·등급·비용 같은 본문 전체가 함께 기다리고 있었다.
// 서버 컴포넌트를 <Suspense>로 감싸면 본문 HTML이 먼저 나가고 이 부분만 뒤이어 채워진다.
//
// ★ SEO는 영향받지 않는다. "클라이언트에서 불러오면 크롤러가 링크를 못 탄다"는 건
//   *브라우저 fetch*일 때 얘기고, RSC 스트리밍은 서버가 최종 HTML을 이어서 흘려보내므로
//   크롤러도 인접 시설 링크를 그대로 받는다.
export async function SimilarSection({
  facilityId,
  regionHref,
  regionLabel,
}: {
  facilityId: string;
  /** 지역+유형 허브 링크 — page.tsx가 facility.address로 미리 계산해 넘긴다(2026-08-07) */
  regionHref?: string;
  regionLabel?: string;
}) {
  const all = await getSimilar(facilityId);
  const items = all?.similar ?? [];

  // 인근에 같은 유형 시설이 하나도 없으면 섹션 자체를 그리지 않는다.
  // (조건 판단이 이 안에 있어야 부모가 결과를 기다리지 않는다.)
  if (items.length === 0) return null;

  return (
    <DetailSection id="related" title="이 시설과 비슷한 곳">
      <p className="mb-3 text-xs leading-relaxed text-ink-500">
        규모·프로그램 구성·평가등급·비용대를 비교해 비슷한 시설을 찾았어요. 이 시설과 무엇이
        다른지 함께 보여드려요.
      </p>
      <SimilarFacilities
        facilityId={facilityId}
        initialItems={items}
        regionHref={regionHref}
        regionLabel={regionLabel}
      />
    </DetailSection>
  );
}

/**
 * 스트리밍 중 자리를 지키는 뼈대. 실제 섹션과 같은 높이로 두어야 도착할 때 화면이 튀지 않는다.
 * loading.tsx의 뼈대와 같은 문법(animate-pulse + bg-ink-100)을 쓴다.
 */
export function SimilarSectionSkeleton() {
  return (
    <section className="border-t border-ink-100 py-9" aria-hidden="true">
      <div className="mb-5 h-7 w-40 animate-pulse rounded bg-ink-100" />
      <div className="mb-3 h-4 w-full animate-pulse rounded bg-ink-100" />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {[64, 88, 80, 72, 88].map((w, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-full bg-ink-100"
            style={{ width: w }}
          />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-ink-100" />
        ))}
      </div>
    </section>
  );
}
