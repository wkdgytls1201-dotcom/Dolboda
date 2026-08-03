"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { signOutAndClear } from "@/lib/signOutAndClear";
import { authProviderLabel } from "@/lib/authProviderLabel";
import { ChevronDown, LogOut, User } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { MyPageDashboard } from "@/components/MyPageDashboard";
import { PageLoader } from "@/components/PageLoader";

export default function MyPageAccountPage() {
  const { data: session, status } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  // 계정 정보는 기본적으로 접어둔다 — 한 번 확인하면 다시 볼 일이 드문 내용이라
  // 펼쳐두면 대시보드보다 아래에서 자리만 크게 차지한다.
  const [accountOpen, setAccountOpen] = useState(false);

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
  const providerLabel = authProviderLabel(user.provider);

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
      {/* 지금 할 일(진행 중 요청·프로필 완성도·새 일자리)을 계정 정보보다 먼저 보여준다 */}
      <MyPageDashboard />

      {/* 계정 설정 — 보호자·매니저 어느 역할이든 마지막에 오는 부수적인 영역이라
          작게, 그리고 위쪽 메뉴와 선으로 확실히 끊어서 둔다. 담고 있는 내용
          (이름·이메일·로그인 방식·로그아웃)은 그대로고, 기본만 접어뒀다. */}
      <section className="mt-10 border-t border-ink-100 pt-6">
        <p className="mb-2 px-1 text-[13px] font-semibold text-ink-300">계정</p>

        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-ivory-100/60 active:bg-ivory-100"
          >
            {user.image && !photoFailed ? (
              // 카카오 프로필 URL이 깨져도 기본 아바타로 대체(깨진 이미지 아이콘 방지)
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                onError={() => setPhotoFailed(true)}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                <User size={17} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink-900">
                {user.name ?? "이름 없음"}
              </span>
              <span className="block text-[12px] text-ink-300">
                {providerLabel} 계정으로 로그인 중
              </span>
            </span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-ink-300 transition-transform duration-200 ${
                accountOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {accountOpen && (
            <dl className="animate-fade-up space-y-2.5 border-t border-ink-100 px-4 py-3.5 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-400">이름</dt>
                <dd className="font-semibold text-ink-900">{user.name ?? "정보 없음"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-ink-400">이메일</dt>
                <dd className="min-w-0 truncate font-semibold text-ink-900">
                  {user.email ?? <span className="font-normal text-ink-300">동의 안 함</span>}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-400">로그인 방식</dt>
                <dd className="font-semibold text-ink-900">{providerLabel}</dd>
              </div>
            </dl>
          )}
        </div>

        <button
          type="button"
          onClick={signOutAndClear}
          className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-ink-400 transition-all duration-150 ease-snappy hover:bg-ink-100/60 hover:text-ink-700 active:scale-[0.98]"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </section>

      {/* 회원탈퇴 — 일부러 화면 한참 아래, 푸터 직전에 흐린 글씨로 둔다.
          찾는 사람만 찾을 수 있으면 충분한 기능이라 시각적 무게를 최소화. */}
      <div className="mt-32 border-t border-ink-100/60 pt-6 text-right sm:mt-40">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            // 시각적 무게는 최소로 두되(위 주석의 의도) 누를 수 있는 면적은 44px을 지킨다 —
            // 흐린 글씨 20px짜리는 "찾는 사람도 못 누르는" 크기였다(실측 45×20).
            className="-my-3 inline-flex min-h-[44px] items-center px-2 text-[10px] text-ink-100 transition-colors duration-150 hover:text-ink-300 active:text-ink-500"
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
              // 탈퇴는 눈에 덜 띄어야 하지만(파괴적 동작) 누르기 어려우면 안 된다 —
              // 글자 크기는 그대로 두고 누를 수 있는 면적만 44px로 넓힌다.
              className="mt-1 inline-flex min-h-[44px] items-center px-3 text-[11px] text-ink-300 underline underline-offset-2 transition-colors duration-150 hover:text-ink-500 active:text-ink-700 disabled:opacity-60"
            >
              {deleting ? "탈퇴 처리 중..." : "그래도 탈퇴할게요"}
            </button>
          </div>
        )}
      </div>
    </MyPageShell>
  );
}
