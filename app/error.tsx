"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";

// 라우트 단위 에러 경계.
//
// 이 파일이 없던 동안에는 어느 컴포넌트든 렌더 중 에러가 나면 React가 트리를 통째로
// 버리고 Next 기본 에러 화면으로 떨어졌다 — 헤더도 푸터도 없고 돌아갈 링크도 없다.
// 보호자 입장에선 "앱이 죽었다"로 보이고, 할 수 있는 게 브라우저 뒤로가기뿐이었다.
//
// 여기서 잡으면 헤더·푸터·하단 탭바는 그대로 살아 있고(레이아웃은 이 경계 바깥이다),
// 본문만 이 화면으로 바뀐다. reset()은 같은 라우트를 다시 렌더해보는 것이라
// 일시적인 실패(네트워크 순간 끊김 등)는 새로고침 없이 그 자리에서 복구된다.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버 에러는 digest만 남고 내용은 클라이언트로 오지 않는다(Next가 가린다).
    // 콘솔에라도 남겨야 사용자가 스크린샷을 보내줬을 때 서버 로그와 맞춰볼 수 있다.
    console.error("[route error]", error.digest ?? "", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
      <h1 className="mb-3 break-keep text-xl font-extrabold text-ink-900 sm:text-2xl">
        화면을 불러오지 못했어요
      </h1>
      <p className="mb-8 break-keep text-sm leading-relaxed text-ink-500">
        일시적인 문제일 수 있어요. 다시 시도해 보시고,
        <br />
        계속 같은 화면이 나오면 잠시 후 방문해 주세요.
      </p>

      <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary-500 px-6 text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
        >
          <RotateCcw size={18} />
          다시 시도
        </button>
        <Link
          href="/"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-ink-700 shadow-card transition-transform active:scale-[0.98]"
        >
          <Home size={18} />
          홈으로
        </Link>
      </div>

      {/* digest는 서버 로그와 대조할 수 있는 유일한 단서다 — 문의가 오면 이 값을 물어본다 */}
      {error.digest && (
        <p className="mt-6 text-[11px] text-ink-300">오류 코드: {error.digest}</p>
      )}
    </main>
  );
}
