"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";

// 복지용구 페이지의 "로그인하고 확인하기" 계열 CTA.
//
// 로그인 안 된 상태에서 그냥 <Link href="/mypage/welfare-benefit">를 쓰면
// "로그인이 필요해요"라는 문구만 있는 빈 페이지로 갔다가 다시 로그인해야 한다 —
// 여기서 곧장 로그인 모달을 띄우는 게 한 단계를 줄인다. 이미 로그인돼 있으면
// 그냥 실제 목적지로 이동한다(모달을 다시 보여줄 이유가 없다).
export function WelfareLoginCta({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const [showAuth, setShowAuth] = useState(false);

  if (status === "authenticated") {
    return (
      <Link href="/mypage/welfare-benefit" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setShowAuth(true)} className={className}>
        {children}
      </button>
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          reason="로그인하면 우리 어르신의 복지용구 혜택을 마이페이지에서 바로 확인할 수 있어요."
        />
      )}
    </>
  );
}
