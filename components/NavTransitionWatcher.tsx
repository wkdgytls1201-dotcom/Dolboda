"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { completeNavTransition } from "@/lib/navTransition";

// 라우트가 커밋된 순간(loading.tsx 스켈레톤 포함) 대기 중인 View Transition을 끝낸다.
// 루트 레이아웃에 하나만 두면 모든 시설 상세 이동이 여기로 신호를 받는다.
// 렌더하는 것이 없어 번들·렌더 비용은 사실상 0이다.
export function NavTransitionWatcher() {
  const pathname = usePathname();
  useEffect(() => {
    completeNavTransition();
  }, [pathname]);
  return null;
}
