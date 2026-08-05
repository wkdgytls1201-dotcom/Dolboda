"use client";

// 가족 초대 수락(care-log-spec §9-5) — 보호자가 보낸 링크의 도착지.
// 로그인 필수: 일지는 민감정보라 "누가 보는지"가 남아야 한다. signIn은 기본적으로
// 현재 URL로 돌아오므로 로그인 후에도 토큰이 보존된다.

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { PageLoader } from "@/components/PageLoader";

export default function FamilyJoinPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <FamilyJoinInner />
    </Suspense>
  );
}

function FamilyJoinInner() {
  const { status } = useSession();
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"idle" | "accepting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const attempted = useRef(false); // StrictMode 이중 실행에도 수락 요청은 한 번만

  useEffect(() => {
    if (status !== "authenticated" || !token || attempted.current) return;
    attempted.current = true;
    setState("accepting");
    fetch("/api/care-log/family/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const d = await res.json();
        if (res.ok) setState("done");
        else {
          setState("error");
          setMessage(d.error ?? "초대를 수락하지 못했어요.");
        }
      })
      .catch(() => {
        setState("error");
        setMessage("잠시 후 다시 시도해주세요.");
      });
  }, [status, token]);

  if (status === "loading") return <PageLoader />;

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      {!token ? (
        <>
          <h1 className="mb-2 text-xl font-bold text-ink-900">초대 링크가 올바르지 않아요</h1>
          <p className="text-sm text-ink-500">보호자께 초대 링크를 다시 요청해주세요.</p>
        </>
      ) : status !== "authenticated" ? (
        <>
          <h1 className="mb-2 text-xl font-bold text-ink-900">돌봄일지 가족 초대를 받았어요</h1>
          <p className="mb-6 text-sm leading-relaxed text-ink-500">
            로그인하면 가족이 남기는 돌봄 기록을
            <br />
            함께 볼 수 있어요.
          </p>
          <button
            type="button"
            onClick={() => signIn("kakao")}
            className="w-full rounded-xl bg-[#FEE500] py-3 text-sm font-bold text-[#191919] transition-all duration-150 hover:brightness-95 active:scale-[0.98]"
          >
            카카오로 시작하기
          </button>
        </>
      ) : state === "done" ? (
        <>
          <h1 className="mb-2 text-xl font-bold text-ink-900">가족으로 함께 보게 됐어요</h1>
          <p className="mb-6 text-sm leading-relaxed text-ink-500">
            이제 돌봄일지를 열람할 수 있어요.
            <br />
            읽음 표시와 반응은 보호자만 남길 수 있어요.
          </p>
          <Link
            href="/care-request/care-log"
            className="inline-block w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white shadow-soft transition-all duration-150 hover:bg-primary-600 active:scale-[0.98]"
          >
            돌봄일지 보러 가기
          </Link>
        </>
      ) : state === "error" ? (
        <>
          <h1 className="mb-2 text-xl font-bold text-ink-900">수락하지 못했어요</h1>
          <p className="text-sm text-ink-500">{message}</p>
        </>
      ) : (
        <PageLoader />
      )}
    </main>
  );
}
