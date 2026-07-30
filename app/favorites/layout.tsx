import type { Metadata } from "next";

// 개인별 관심시설 목록 — 검색엔진에 노출할 내용이 아니므로 색인 제외
export const metadata: Metadata = {
  title: "관심시설",
  robots: { index: false, follow: true },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
