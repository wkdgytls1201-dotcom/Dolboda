import { PageLoader } from "@/components/PageLoader";

// robots에서 색인 제외한 화면이라 로더를 그대로 둔다(이유는 app/mypage/loading.tsx 주석).
export default function Loading() {
  return <PageLoader />;
}
