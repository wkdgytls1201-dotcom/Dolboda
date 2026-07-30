"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { X, Lock } from "lucide-react";

type AuthProviderId = "kakao" | "naver" | "google";
const READY_PROVIDERS: AuthProviderId[] = ["kakao"]; // 네이버/구글은 아직 미연동

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#391B1B"
        d="M12 3C6.48 3 2 6.48 2 10.8c0 2.73 1.8 5.13 4.52 6.52-.2.72-.72 2.6-.82 3-.13.5.18.5.38.36.16-.1 2.5-1.7 3.52-2.38.45.06.92.1 1.4.1 5.52 0 10-3.48 10-7.8C21 6.48 17.52 3 12 3z"
      />
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <rect width="24" height="24" rx="5" fill="#03C75A" />
      <path fill="#FFFFFF" d="M13.7 7v5.2L10.3 7H7v10h3.3v-5.2l3.4 5.2H17V7z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.68-.06-1.36-.18-2h-9.2v3.79h5.28a4.52 4.52 0 0 1-1.96 2.96v2.46h3.17c1.85-1.71 2.9-4.23 2.9-7.21z"
      />
      <path
        fill="#34A853"
        d="M12.22 22c2.64 0 4.86-.87 6.48-2.36l-3.17-2.46c-.88.59-2.01.94-3.31.94-2.54 0-4.7-1.72-5.47-4.02H3.48v2.53A9.99 9.99 0 0 0 12.22 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.75 14.1a6 6 0 0 1 0-3.84V7.73H3.48a10.02 10.02 0 0 0 0 8.9l3.27-2.53z"
      />
      <path
        fill="#EA4335"
        d="M12.22 6.24c1.44 0 2.72.5 3.74 1.46l2.8-2.8C17.07 3.24 14.86 2.24 12.22 2.24A9.99 9.99 0 0 0 3.48 7.73l3.27 2.53c.77-2.3 2.93-4.02 5.47-4.02z"
      />
    </svg>
  );
}

const SOCIAL_BUTTONS: {
  id: AuthProviderId;
  label: string;
  icon: () => React.ReactNode;
  className: string;
}[] = [
  {
    id: "kakao",
    label: "카카오로 계속하기",
    icon: KakaoIcon,
    className: "bg-[#FEE500] text-[#391B1B] hover:brightness-95",
  },
  {
    id: "naver",
    label: "네이버로 계속하기",
    icon: NaverIcon,
    className: "bg-[#03C75A] text-white hover:brightness-95",
  },
  {
    id: "google",
    label: "Google로 계속하기",
    icon: GoogleIcon,
    className: "border border-ink-100 bg-white text-ink-700 hover:bg-ink-100/50",
  },
];

export function AuthModal({
  onClose,
  reason,
}: {
  onClose: () => void;
  reason?: string;
}) {
  function handleSocial(provider: AuthProviderId) {
    if (!READY_PROVIDERS.includes(provider)) return;
    signIn(provider);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-900/40 px-4 py-8">
      <div className="my-auto max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-900">로그인</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1 text-ink-300 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-700 active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {reason && (
          <div className="mb-5 rounded-xl bg-primary-50 px-4 py-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-primary-700">
              <Lock size={14} className="shrink-0" />
              <span className="text-xs font-bold">안내</span>
            </div>
            <p className="pl-[21px] text-sm leading-relaxed text-primary-700">{reason}</p>
          </div>
        )}

        <div className="space-y-2">
          {SOCIAL_BUTTONS.map(({ id, label, icon: Icon, className }) => {
            const ready = READY_PROVIDERS.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={!ready}
                onClick={() => handleSocial(id)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ease-snappy ${className} ${
                  ready
                    ? "hover:-translate-y-0.5 hover:shadow-card active:translate-y-0 active:scale-[0.98]"
                    : "cursor-not-allowed opacity-40"
                }`}
              >
                <Icon />
                {label}
                {!ready && <span className="text-xs font-normal">(준비 중)</span>}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px] text-ink-300">
          아직 계정이 없으신가요? 위 버튼으로 계속하면 자동으로 회원가입되며,{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="underline hover:text-ink-500">
            이용약관
          </a>{" "}
          및{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="underline hover:text-ink-500">
            개인정보처리방침
          </a>
          에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
