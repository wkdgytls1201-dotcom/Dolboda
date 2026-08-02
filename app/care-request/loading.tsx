import { PageLoader } from "@/components/PageLoader";

// 로그인 후 화면이라 색인 대상이 아니다 — 로더를 그대로 둔다(이유는 app/mypage/loading.tsx 주석).
export default function Loading() {
  return <PageLoader />;
}
