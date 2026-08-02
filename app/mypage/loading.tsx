import { PageLoader } from "@/components/PageLoader";

// 페이지 전환 중 화면. 예전에는 app/loading.tsx 하나로 전 페이지에 걸려 있었는데,
// 루트에 두면 Next가 모든 페이지를 Suspense로 감싸서 서버 HTML이
// "헤더 → 로딩 스피너 → 푸터"로 먼저 나가고 진짜 본문은 뒤쪽 <div hidden>에 실린다
// (실측: 지역 페이지에서 <footer>가 8천번째, <main>이 8만6천번째 글자).
// 구글은 JS를 실행해 읽지만 AI 크롤러 대부분은 스피너만 보고 가서 GEO에 그대로 손해였다.
//
// 그래서 검색으로 들어오는 화면(홈·지역·시설상세·가이드·서비스·소개)에서는 걷어내고,
// 로더가 실제로 도움이 되는 로그인 후 화면에만 남긴다. 여기는 세션 확인 + 여러 쿼리를
// 기다리는 구간이라 로더가 없으면 이전 화면에 멈춰 있는 것처럼 보인다.
export default function Loading() {
  return <PageLoader />;
}
