// 검색 결과가 도착하기 전 자리를 지키는 카드 뼈대.
//
// 왜 로고 로더가 아니라 뼈대인가(§11차 1-B와 같은 이유): 곧 나올 화면과 같은 모양이
// 보이면 이미 도착한 것처럼 느껴진다. 돌아가는 로고는 "지금부터 기다려라"는 신호다.
//
// 여기엔 이유가 하나 더 있다 — 예전엔 로딩 중 이 자리에 `PageLoader compact`(py-12)만
// 있어서 높이가 거의 없었고, 그 바로 아래에 있는 검색봇용 안내문("전국 요양병원·요양원·
// 주야간보호·방문요양 검색" + 유형 설명 4개)이 결과보다 먼저 화면에 올라와 보였다.
// 검색을 누른 사람에게 첫 화면이 설명문이면 "결과가 없다"로 읽힌다. 뼈대가 결과와 같은
// 높이를 차지하므로 그 안내문은 원래 자리인 화면 아래로 다시 내려간다.
// (안내문은 지우지 않는다 — /search의 h1이자 색인용 본문이다.)

function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-ink-100 ${className}`} />;
}

/** 실제 FacilityCard와 같은 골격 — 사진 16:9 · 배지 줄 · 이름 · 주소 · 정보 바 */
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-4 shadow-card">
      <div className="-mx-4 -mt-4 mb-3 aspect-[16/9] rounded-t-2xl bg-ink-100" />
      <div className="mb-3 flex gap-1">
        <Bar className="h-5 w-16" />
        <Bar className="h-5 w-12" />
        <Bar className="h-5 w-10" />
      </div>
      <Bar className="mb-1 h-6 w-3/4" />
      <Bar className="mb-1 h-5 w-full" />
      <Bar className="mt-3 h-9 w-full rounded-xl" />
    </div>
  );
}

/**
 * 결과 그리드와 같은 배치로 뼈대를 깐다.
 * 기본 6장 — 1열(모바일)에서 뷰포트를 넘기고, 3열(데스크톱)에서도 두 줄이 차서
 * 아래 안내문이 첫 화면에 올라오지 않는다.
 */
export function FacilityCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="시설을 불러오는 중"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
