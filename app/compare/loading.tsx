import { PageLoader } from "@/components/PageLoader";

// 저장해둔 비교 목록을 브라우저에서 읽어 시설을 다시 받아오는 화면이라 대기 구간이 있다.
// 사이트맵에는 들어 있지만 실제 내용은 사용자가 고른 시설이라 색인될 본문이 없다.
export default function Loading() {
  return <PageLoader />;
}
