"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { signOutAndClear } from "@/lib/signOutAndClear";
import { LogOut, User } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";

export default function MyPageAccountPage() {
  const { data: session, status } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (status === "loading") return <PageLoader />;

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm text-ink-500">마이페이지는 로그인 후 확인할 수 있어요.</p>
      </main>
    );
  }

  const user = session.user;

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOutAndClear();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <MyPageShell>
      <h2 className="mb-1 text-xl font-bold text-ink-900">계정 설정</h2>
      <p className="mb-6 text-sm text-ink-500">돌보다 로그인 정보를 확인해요.</p>

      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
        <div className="mb-5 flex items-center gap-3">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-500">
              <User size={24} />
            </span>
          )}
          <div>
            <p className="font-bold text-ink-900">{user.name ?? "이름 없음"}</p>
            <p className="text-xs text-ink-300">카카오 계정으로 로그인 중</p>
          </div>
        </div>

        <dl className="space-y-3 border-t border-ink-100 pt-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-500">이름</dt>
            <dd className="font-medium text-ink-900">{user.name ?? "정보 없음"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-500">이메일</dt>
            <dd className="font-medium text-ink-900">
              {user.email ?? <span className="text-ink-300">동의 안 함</span>}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-500">로그인 방식</dt>
            <dd className="font-medium text-ink-900">카카오</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={signOutAndClear}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink-100 px-4 py-3 text-sm font-semibold text-ink-700 transition-colors duration-150 hover:bg-ink-100"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>

      {/* 회원탈퇴 — 일부러 화면 한참 아래, 푸터 직전에 흐린 글씨로 둔다.
          찾는 사람만 찾을 수 있으면 충분한 기능이라 시각적 무게를 최소화. */}
      <div className="mt-32 border-t border-ink-100/60 pt-6 text-right sm:mt-40">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[10px] text-ink-100 transition-colors duration-150 hover:text-ink-300"
          >
            회원탈퇴
          </button>
        ) : (
          <div className="rounded-2xl border border-ink-100 bg-white p-5 text-center shadow-card">
            <p className="mb-1 text-sm font-bold text-ink-900">잠깐만요, 탈퇴하시면</p>
            <ul className="mx-auto mb-4 max-w-[280px] space-y-1 text-left text-xs leading-relaxed text-ink-500">
              <li>· 관심시설과 비교함 기록이 모두 삭제돼요</li>
              <li>· 돌보다 매니저 프로필과 지원 내역이 사라져요</li>
              <li>· 진행 중인 돌봄 요청도 함께 취소돼요</li>
              <li>· 삭제된 정보는 되돌릴 수 없어요</li>
            </ul>
            <p className="mb-4 text-xs text-ink-500">
              잠시 쉬고 싶으신 거라면 로그아웃만 해도 충분해요.
            </p>
            {/* 눈에 띄는 큰 버튼 = 취소(안전한 선택), 탈퇴는 작은 텍스트로 */}
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-[48px] w-full rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600 active:scale-[0.98]"
            >
              계속 이용할게요
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteAccount}
              className="mt-3 text-[11px] text-ink-300 underline underline-offset-2 transition-colors duration-150 hover:text-ink-500 disabled:opacity-60"
            >
              {deleting ? "탈퇴 처리 중..." : "그래도 탈퇴할게요"}
            </button>
          </div>
        )}
      </div>
    </MyPageShell>
  );
}
