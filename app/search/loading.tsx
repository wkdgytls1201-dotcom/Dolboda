import { FacilityCardSkeleton } from "@/components/FacilityCardSkeleton";

// 시설찾기 진입 중 화면(라우트 전환 단계).
//
// 이게 없으면 본문이 비어 있는 동안 아래 것들이 화면 위로 올라와, 검색 결과가 뜨기 전에
// 푸터의 검색엔진용 링크("전국 요양병원 · 전국 요양원 …")와 page.tsx의 안내문
// ("전국 요양병원·요양원·주야간보호·방문요양 검색" + 유형 설명 4개)이 먼저 보였다.
// 실제로 두 번 지적받은 자리다.
//
// 로고 로더 대신 실제 검색 화면과 같은 골격(검색창 · 필터 줄 · 카드 그리드)을 그린다.
// SearchPageClient도 결과가 오기 전까지 같은 카드 뼈대를 보여주므로, 라우트 전환 →
// 데이터 로딩으로 넘어갈 때 화면 모양이 바뀌지 않는다.
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-4 pb-28 sm:py-6" aria-busy="true">
      {/* 검색창 자리 — 실제와 같은 h-11 */}
      <div className="mb-3 h-11 animate-pulse rounded-xl bg-white shadow-card" />
      {/* 필터 칩 줄 */}
      <div className="mb-3 flex gap-1.5">
        {[72, 56, 64, 88].map((w, i) => (
          <div key={i} className="h-8 animate-pulse rounded-full bg-ink-100" style={{ width: w }} />
        ))}
      </div>
      <FacilityCardSkeleton />
    </main>
  );
}
