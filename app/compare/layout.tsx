import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요양시설 비교",
  description:
    "관심 있는 요양병원·요양시설을 최대 3곳까지 나란히 놓고 평가등급, 비급여 비용, 인력 현황을 항목별로 비교해보세요.",
  alternates: { canonical: "/compare" },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
