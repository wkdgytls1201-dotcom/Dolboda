"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, ClipboardList, PhoneCall } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { WelfareConsultForm } from "@/components/WelfareConsultForm";

// 복지용구 상담 신청 앞단의 갈림길.
//
// 예전엔 이 자리에 상담 폼이 바로 놓여 있었고 "회원가입 없이도 신청할 수 있어요"라고
// 안내했다. 그런데 복지용구 급여는 장기요양등급이 있어야 받는 제도라서, 등급이 없는
// 사람이 연락처를 남겨도 운영자가 해줄 수 있는 게 없다. 검색으로 처음 들어오는 사람
// 대부분이 아직 등급이 없다 — 그 사람들을 접수함이 아니라 등급 테스트로 보내는 게
// 서로에게 낫다.
//
// 그래서 두 갈래로 나눈다:
//   등급 있음 → 로그인 후 상담 신청(연락처를 남기는 일이라 계정이 붙어 있어야
//               나중에 진행 상황을 되짚을 수 있다)
//   등급 없음/모름 → 예상 등급 테스트
export function WelfareConsultGate({ defaultItem }: { defaultItem?: string }) {
  const { status } = useSession();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <p className="mb-1.5 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
        <ClipboardList size={16} className="shrink-0 text-royal-500" />
        상담 전에 확인해주세요
      </p>
      <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
        복지용구는 장기요양등급을 받으신 분만 지원돼요.
        <br />
        상담을 신청하시려면 어르신의 요양인정번호가 필요해요.
      </p>

      {status === "authenticated" ? (
        <WelfareConsultForm defaultItem={defaultItem} compact />
      ) : (
        <button
          type="button"
          onClick={() => setShowAuth(true)}
          className="flex min-h-[52px] w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-royal-600 via-royal-500 to-royal-400 text-sm font-bold text-white shadow-royal transition-all duration-200 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          <PhoneCall size={16} />
          로그인하고 상담 신청하기
        </button>
      )}

      {/* 등급이 없는 사람이 이 페이지 방문자의 다수다 — 막다른 길로 두지 않는다 */}
      <div className="mt-4 border-t border-ink-100 pt-4">
        <p className="mb-2 text-[13px] leading-relaxed text-ink-500">
          아직 등급이 없거나 잘 모르시겠나요?
          <br />
          3분이면 예상 등급을 확인할 수 있어요.
        </p>
        <Link
          href="/grade-test"
          className="flex min-h-[46px] w-full items-center justify-center gap-1 rounded-xl bg-ivory-100 text-[13px] font-bold text-ink-700 transition-colors hover:bg-ink-100"
        >
          예상 등급 무료로 확인하기
          <ArrowRight size={14} />
        </Link>
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          reason="상담 신청에는 연락처가 남아요. 로그인하시면 신청 내역을 마이페이지에서 다시 확인하실 수 있어요."
        />
      )}
    </div>
  );
}
