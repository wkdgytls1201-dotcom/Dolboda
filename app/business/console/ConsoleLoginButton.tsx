"use client";

import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";

// 콘솔의 "로그인" 버튼 — 서버 컴포넌트인 page.tsx에서 쓰려고 최소한만 클라이언트로 뺀다.
// WelfareLoginCta와 같은 방식(그 자리에서 모달을 띄워 한 단계를 줄인다).
export function ConsoleLoginButton() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowAuth(true)}
        className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-primary-500 px-6 text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-600"
      >
        로그인하기
      </button>
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          reason="시설 인증을 신청하실 때 쓰신 계정으로 로그인하시면 콘솔이 열립니다."
        />
      )}
    </>
  );
}
