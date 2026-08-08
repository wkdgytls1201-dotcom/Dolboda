import Script from "next/script";

// GA4 — 측정 ID(`NEXT_PUBLIC_GA_ID`)가 있을 때만 붙는다.
//
// ID가 없으면 **아무것도 렌더하지 않는다.** 그래서 ID를 넣기 전에 배포해도 무해하고,
// 나중에 Vercel 환경변수에 넣는 순간 그 배포부터 수집이 시작된다.
// (로컬 개발에서도 보통 ID가 없으니 내 클릭이 통계에 섞이지 않는다 — 넣고 싶으면
//  .env.local에 같은 이름으로 두면 된다.)
//
// strategy="afterInteractive": 페이지가 상호작용 가능해진 뒤에 불러온다.
// 통계 스크립트가 첫 화면 렌더를 막으면 안 된다 — 이 서비스는 50~70대가 주 사용자라
// 첫 로딩 체감이 특히 중요하고, 그건 CLAUDE.md의 성능 최우선 원칙이기도 하다.
//
// ⚠️ Next App Router에서는 **페이지 이동이 새로고침이 아니다.** gtag의 기본 자동
//    페이지뷰는 첫 진입 한 번만 잡히고 이후 화면 이동이 통째로 누락된다.
//    그래서 자동 전송을 끄고(send_page_view: false) 라우트 변화를 직접 보낸다
//    (아래 PageViewTracker). 이걸 빼먹으면 "홈만 조회되는" 통계가 나온다.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function Analytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}

export { GA_ID };
