import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요양시설·요양병원 검색",
  description:
    "전국 요양병원, 요양원, 주야간보호센터, 방문요양센터를 지역·시설 유형·평가등급으로 검색하고 비급여 비용과 인력 현황까지 비교하세요.",
  alternates: { canonical: "/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
