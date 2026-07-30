"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { signOutAndClear } from "@/lib/signOutAndClear";
import { LogOut, User } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";

export default function MyPageAccountPage() {
  const { data: session, status } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (status === "loading") return null;

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

      <div className="mt-10 text-right">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[11px] text-ink-300 hover:text-ink-400"
          >
            회원탈퇴
          </button>
        ) : (
          <div className="rounded-xl bg-primary-50 p-4 text-center">
            <p className="mb-3 text-sm text-ink-700">
              정말 탈퇴하시겠어요? 관심시설·비교함·모심시터 프로필 등 계정 정보가 모두
              삭제되고 되돌릴 수 없어요.
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-500 hover:bg-white"
              >
                취소
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-bold text-white hover:bg-primary-600 disabled:opacity-60"
              >
                {deleting ? "탈퇴 처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </MyPageShell>
  );
}
