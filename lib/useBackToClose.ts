"use client";

import { useCallback, useEffect, useRef } from "react";

// 뒤로가기(안드로이드 하드웨어 back / 브라우저 뒤로) = 오버레이 닫기.
//
// 왜 필요한가: 이게 없으면 필터 시트나 로그인 창을 열어둔 채 뒤로가기를 눌렀을 때
// **오버레이는 그대로 있고 페이지가 통째로 pop된다** — 사용자는 "방금 연 걸 닫으려던
// 것"인데 목록이나 홈으로 튕긴다. 웹에서도 어색하지만, 안드로이드 앱으로 감싸면
// 하드웨어 back이 유일한 뒤로가기 수단이라 바로 "앱이 이상하다"가 된다.
//
// 이 패턴은 FacilityPhotoModal이 먼저 만들어 쓰던 것을 공용으로 뺀 것이다.
// 거기서 이미 밟은 함정 두 개를 그대로 물려받는다:
//
//  ① **닫힘의 경로를 하나로 모은다.** X 버튼·ESC·배경 탭도 곧바로 onClose를 부르지 않고
//     requestClose()로 history.back()을 태운다. 그래야 어느 쪽으로 닫아도 쌓아둔
//     히스토리 한 칸이 정확히 걷힌다. 직접 onClose만 부르면 그 한 칸이 남아서,
//     닫은 뒤 뒤로가기를 눌렀을 때 아무 일도 안 일어나는 "먹통 뒤로가기"가 생긴다.
//
//  ② **정리(cleanup)에서 history를 건드리지 않는다.** 리스너만 걷는다.
//     정리에서 back()을 부르면 StrictMode의 이중 실행에서 그 back()이 스스로 popstate를
//     쏴 모달을 여는 즉시 닫아버린다(실제로 겪은 버그). push도 이미 쌓여 있으면
//     건너뛰어 이중 실행에 안전하게 만든다.
//
// key: 오버레이마다 다른 값을 준다. history.state에 이 이름으로 표식을 남겨,
//      중첩됐을 때 서로의 칸을 잘못 걷지 않게 한다.
export function useBackToClose(key: string, onClose: () => void) {
  // onClose가 매 렌더 새 함수여도 effect가 다시 돌지 않게 ref로 받는다 —
  // effect가 재실행되면 히스토리를 또 쌓는다.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const state = window.history.state as Record<string, unknown> | null;
    if (state?.[key] !== true) {
      window.history.pushState({ ...(state ?? {}), [key]: true }, "");
    }
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // key는 컴포넌트마다 고정 상수라 의존성에 넣어도 재실행되지 않는다
  }, [key]);

  /** 오버레이를 닫을 때는 이걸 부른다(onClose 직접 호출 금지 — 위 ① 참고). */
  return useCallback(() => {
    const state = window.history.state as Record<string, unknown> | null;
    if (state?.[key] === true) window.history.back();
    else onCloseRef.current();
  }, [key]);
}
