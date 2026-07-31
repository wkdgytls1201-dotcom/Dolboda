"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { X, LogIn } from "lucide-react";
import { AuthModal } from "./AuthModal";

const DISMISS_KEY = "dolboda-guest-banner-dismissed";

// 비회원에게 로그인 혜택을 항상 눈에 띄게 알려주는 맨 위 배너. 닫으면 이번 방문(세션)
// 동안만 숨기고, 새로 들어오면 다시 보인다 — 위치 동의 모달과 같은 패턴.
export function GuestLoginBanner() {
  const { data: session, status } = useSession();
  const [dismissed, setDismissed] = useState(true); // 세션 확인 전엔 깜빡임 방지로 숨김
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user) {
      setDismissed(true);
      return;
    }
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, [status, session]);

  if (status === "loading" || session?.user || dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <>
      <div className="flex items-center justify-center gap-3 bg-royal-500 px-4 py-2.5 text-center text-sm font-semibold text-white">
        <button
          type="button"
          onClick={() => setShowAuth(true)}
          className="flex flex-1 items-center justify-center gap-1.5 sm:flex-none"
        >
          <LogIn size={15} />
          <span>로그인하고 시설 정보 더 보기</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="배너 닫기"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 active:scale-90"
        >
          <X size={16} />
        </button>
      </div>
      {showAuth && <AuthModal reason="로그인하면 제한 없이 볼 수 있어요." onClose={() => setShowAuth(false)} />}
    </>
  );
}
