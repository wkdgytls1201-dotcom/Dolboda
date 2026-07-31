"use client";

import { useSession } from "next-auth/react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";

export default function MyPageEditPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <PageLoader />;

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
      </main>
    );
  }

  return (
    <MyPageShell>
      <h2 className="mb-1 text-xl font-bold text-ink-900">정보 수정</h2>
      <p className="mb-6 text-sm text-ink-500">
        이름·프로필 사진은 카카오 계정 정보를 그대로 가져와요. 카카오 계정에서 바꾸시면 다음
        로그인 시 자동으로 반영돼요.
      </p>
      <div className="rounded-2xl border border-ink-100 bg-ink-100/30 p-5 text-sm text-ink-500">
        아직 돌보다 안에서 직접 수정할 수 있는 정보는 없어요. 모심시터로 등록하셨다면 프로필
        정보는{" "}
        <a href="/mypage/sitter/profile" className="font-semibold text-primary-600 underline">
          프로필 관리
        </a>
        에서 수정할 수 있어요.
      </div>
    </MyPageShell>
  );
}
