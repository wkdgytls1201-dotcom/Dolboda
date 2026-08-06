import type { Metadata } from "next";

// 로그인 전용 영역(로그인해야 알림을 설정할 수 있다) — robots.ts도 이 경로를 막고 있다.
// description·canonical은 색인용 문구였는데 애초에 크롤러가 못 들어오는 페이지라
// 죽은 코드였다(2026-08-07 감사) — mypage 레이아웃과 같은 방식으로 명시적으로 막는다.
export const metadata: Metadata = {
  title: "지역별 새 요양시설 알림",
  robots: { index: false, follow: false },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
