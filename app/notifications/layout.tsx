import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "지역별 새 요양시설 알림",
  description:
    "관심 지역에 새 요양병원·요양시설이 등록되면 알려드려요. 지역을 선택하고 알림을 신청하세요.",
  alternates: { canonical: "/notifications" },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
