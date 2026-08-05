"use client";

// 추천 링크 처리(points-spec §5 2단계) — 어떤 페이지로 들어와도 ?ref=코드를 주워
// 로컬에 담아뒀다가, 로그인이 확인되는 순간 한 번만 귀속을 시도한다.
// 렌더는 null — 화면·성능에 아무 영향이 없다(레이아웃에 상시 마운트).

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const STORAGE_KEY = "dolboda-ref-code";

export function ReferralCatcher() {
  const { status } = useSession();
  const attempted = useRef(false);

  // 1) 링크의 ?ref= 를 주워 담는다(렌더 중이 아니라 effect에서 — 저장소 규칙)
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[A-Z0-9]{4,12}$/i.test(ref)) {
        localStorage.setItem(STORAGE_KEY, ref.toUpperCase());
      }
    } catch {
      /* 시크릿 모드 등 저장 불가 — 조용히 */
    }
  }, []);

  // 2) 로그인이 확인되면 한 번만 귀속 시도 — 성공·실패 어느 쪽이든 코드를 지운다
  //    (없는 코드를 계속 재시도해봐야 소용없고, 서버가 신규 여부·중복을 판정한다)
  useEffect(() => {
    if (status !== "authenticated" || attempted.current) return;
    let code: string | null = null;
    try {
      code = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (!code) return;
    attempted.current = true;
    fetch("/api/referral/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .catch(() => {})
      .finally(() => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* 무시 */
        }
      });
  }, [status]);

  return null;
}
