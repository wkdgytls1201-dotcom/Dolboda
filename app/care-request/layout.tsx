import type { Metadata } from "next";

// 로그인 전용 영역 — 색인 제외 (robots.txt disallow와 이중 안전장치)
export const metadata: Metadata = {
  title: "돌봄 요청",
  robots: { index: false, follow: false },
};

export default function CareRequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
