import type { Metadata } from "next";
import { SitterProfileProvider } from "@/lib/sitterProfileContext";

// 로그인 전용 영역 — 색인 제외 (robots.txt disallow와 이중 안전장치)
export const metadata: Metadata = {
  title: "마이페이지",
  robots: { index: false, follow: false },
};

// 시터 프로필을 여기(레이아웃)에서 한 번만 불러온다. 레이아웃은 /mypage/* 안에서
// 페이지를 옮겨다녀도 다시 마운트되지 않으니, 프로필관리↔정산관리처럼 화면을 오가도
// /api/sitter-profile를 또 부르지 않고 그대로 재사용한다.
export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return <SitterProfileProvider>{children}</SitterProfileProvider>;
}
