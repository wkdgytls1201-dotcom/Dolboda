"use client";

import Link from "next/link";
import { maskAccount } from "@/lib/maskAccount";
import { Wallet } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";
import { useSitterProfileContext } from "@/lib/sitterProfileContext";

export default function SitterSettlementsPage() {
  // MyPageShell이 이미 불러온 데이터를 그대로 쓴다 — 이 화면에서 또 fetch하지 않는다.
  const { profile } = useSitterProfileContext();

  if (profile === undefined) {
    return (
      <MyPageShell>
        <PageLoader compact />
      </MyPageShell>
    );
  }

  if (profile === null) {
    return (
      <MyPageShell>
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50 p-8 text-center">
          <p className="mb-3 text-sm text-ink-700">아직 돌보다 매니저로 등록하지 않으셨어요.</p>
          <Link
            href="/mypage/sitter/register"
            className="inline-block rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
          >
            돌보다 매니저 등록하기
          </Link>
        </div>
      </MyPageShell>
    );
  }

  return (
    <MyPageShell>
      <h2 className="mb-2 text-xl font-bold text-ink-900">정산 관리</h2>
      <p className="mb-6 text-sm text-ink-500">돌봄 활동에 대한 정산 내역을 확인할 수 있어요.</p>

      <section className="mb-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <h3 className="mb-3 text-[15px] font-bold text-ink-900">정산 계좌</h3>
        {profile.bankName ? (
          /* 본인 화면이어도 계좌번호 전체는 띄우지 않는다 — 어깨너머·공용 기기·화면
             공유로 그대로 새어나간다. 뒤 4자리면 본인이 알아보기에 충분하다. */
          <p className="text-[15px] font-semibold text-ink-700">
            {profile.bankName} {maskAccount(profile.bankAccountNumber)}
            <span className="ml-1.5 font-normal text-ink-400">({profile.bankAccountHolder})</span>
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-ink-400">
            등록된 계좌가 없어요.{" "}
            <Link href="/mypage/sitter/profile" className="font-semibold text-primary-600 underline">
              프로필 관리
            </Link>
            에서 추가해주세요.
          </p>
        )}
      </section>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-100 bg-ink-100/20 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-300 shadow-card">
          <Wallet size={22} />
        </span>
        <p className="text-base font-bold text-ink-700">정산 내역이 아직 없어요</p>
        <p className="px-6 text-[13px] leading-relaxed text-ink-400">
          실제 정산·지급 기능은 준비 중이에요. 완료되면 여기서 내역을 확인할 수 있어요.
        </p>
      </div>
    </MyPageShell>
  );
}
