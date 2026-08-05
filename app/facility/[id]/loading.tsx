// 시설 상세로 넘어가는 동안 보여주는 뼈대 화면.
//
// 왜 로고 로더(PageLoader)가 아니라 뼈대인가: 목록에서 카드를 누르는 순간 이 화면이
// 곧바로 뜨는데, 이때 "곧 나올 화면과 같은 모양"이 보이면 이미 도착한 것처럼 느껴진다.
// 빙글빙글 도는 로고는 "지금부터 기다려야 한다"는 신호라 오히려 더 느리게 느껴진다.
// 실제 본문이 도착하면 같은 자리에 내용이 채워지므로 화면이 튀지 않는다.
//
// 이 파일이 없을 때는 서버 응답이 올 때까지 이전 화면이 그대로 멈춰 있어서,
// 카드를 눌러도 아무 반응이 없는 것처럼 보였다(네이티브 앱과 가장 크게 달랐던 지점).

/** 회색 덩어리 하나. 실제 요소와 같은 크기로 두어야 내용이 채워질 때 안 튄다. */
function Bar({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-ink-100 ${className}`} style={style} />;
}

export default function Loading() {
  return (
    <main className="pb-28" aria-busy="true" aria-label="시설 정보를 불러오는 중">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 헤더 — 배지 줄 · 시설명 · 주소 */}
        <div className="mb-6">
          <div className="mb-2 flex gap-1.5">
            <Bar className="h-6 w-24" />
            <Bar className="h-6 w-16" />
          </div>
        {/* view-transition-name: 카드에서 넘어올 때 클릭한 카드의 시설명·사진이
            이 자리(제목 바·대표 사진 바)로 모핑해 들어온다 — 전환의 도착지가 본문이
            아니라 스켈레톤이라, 데이터가 늦어도 전환이 화면을 붙잡지 않는다. */}
          <Bar className="mb-2 h-9 w-3/4" style={{ viewTransitionName: "facility-title" }} />
          <Bar className="h-5 w-1/2" />
        </div>

        {/* 찜하기 · 공유하기 버튼 자리 */}
        <div className="mb-6 flex gap-2">
          <Bar className="h-11 w-24" />
          <Bar className="h-11 w-24" />
        </div>

        {/* 대표 사진 — 실제와 같은 21:9 */}
        <Bar
          className="mb-6 aspect-[21/9] w-full rounded-2xl"
          style={{ viewTransitionName: "facility-hero" }}
        />

        {/* 안심지수 카드 */}
        <Bar className="mb-6 h-44 w-full rounded-2xl" />

        {/* 본문 섹션 몇 개 */}
        <div className="space-y-4">
          <Bar className="h-28 w-full rounded-2xl" />
          <Bar className="h-28 w-full rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
