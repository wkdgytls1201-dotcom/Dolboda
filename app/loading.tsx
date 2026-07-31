import { PageLoader } from "@/components/PageLoader";

// Next.js가 페이지 전환(RSC 응답을 기다리는 동안) 자동으로 보여주는 화면.
// 이게 없으면 그 사이엔 헤더·푸터만 붙어있는 빈 화면이 잠깐 보인다.
export default function Loading() {
  return <PageLoader />;
}
