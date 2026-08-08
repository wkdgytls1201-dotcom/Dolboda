"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// App Router 페이지뷰 전송.
//
// 왜 필요한가: App Router의 화면 이동은 새로고침이 아니라 클라이언트 라우팅이다.
// gtag의 자동 페이지뷰는 스크립트가 처음 실행될 때 한 번만 잡히므로, 그대로 두면
// **첫 진입 화면만 기록되고 이후 이동이 통째로 누락된다** — "홈만 조회수가 있는"
// 통계가 나온다. 그래서 Analytics.tsx에서 자동 전송을 끄고(send_page_view: false)
// 여기서 경로가 바뀔 때마다 직접 보낸다.
//
// 검색어(searchParams)까지 포함하는 이유: /search는 경로가 하나뿐이라 쿼리를 빼면
// 어떤 조건으로 찾는지가 전부 한 줄로 뭉개진다. 다만 **개인정보는 쿼리에 실리지
// 않는다** — 이 서비스의 쿼리는 지역·유형·정렬 같은 검색 조건뿐이다.
function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (!gtag) return; // 측정 ID가 없거나 스크립트가 아직 안 붙은 상태
    const qs = searchParams.toString();
    gtag("event", "page_view", {
      page_path: qs ? `${pathname}?${qs}` : pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

// useSearchParams는 반드시 Suspense로 감싼다. 안 감싸면 이 컴포넌트가 루트 레이아웃에
// 있는 탓에 **전 페이지가 정적 생성에서 빠져 CSR로 밀린다**(1,290개가 전부 영향).
// 화면에 그리는 게 없으므로 fallback은 null이다.
export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
