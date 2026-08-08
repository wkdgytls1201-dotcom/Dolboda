"use client";

import { useEffect } from "react";

// 최후의 방어선 — 루트 레이아웃 자체가 렌더에 실패했을 때만 뜬다.
//
// app/error.tsx는 레이아웃 **안쪽**의 에러를 잡는다. 반대로 레이아웃(헤더·푸터·
// 전역 Provider들)이 터지면 그 경계까지 함께 무너져서, 그때는 이 파일이 대신 나온다.
// 그래서 여기서는 <html>·<body>를 직접 그려야 한다 — 우리 레이아웃이 없는 상태다.
//
// 스타일을 Tailwind 클래스가 아니라 인라인으로 쓴 이유: 이 화면이 뜨는 상황은
// "무엇이 살아 있는지 보장할 수 없는" 상태다. 마지막 안내문만큼은 CSS 로딩 여부와
// 무관하게 읽혀야 한다. 여기서만 쓰는 예외이고, 다른 화면은 전부 Tailwind를 쓴다.
//
// 개발 중에는 Next 에러 오버레이가 먼저 뜨므로 이 화면은 프로덕션에서만 보인다.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFBF3",
          color: "#1B1730",
          fontFamily:
            "Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
          wordBreak: "keep-all",
          padding: "24px",
        }}
      >
        <main style={{ textAlign: "center", maxWidth: "420px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 12px" }}>
            잠시 문제가 생겼어요
          </h1>
          <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#6B647F", margin: "0 0 28px" }}>
            잠깐 사이에 생긴 문제일 수 있어요.
            <br />
            아래 버튼을 눌러 다시 열어보세요.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "52px",
              padding: "0 28px",
              border: "none",
              borderRadius: "16px",
              backgroundColor: "#FF6250",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
          {error.digest && (
            <p style={{ fontSize: "11px", color: "#A9A3BC", marginTop: "24px" }}>
              오류 코드: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
