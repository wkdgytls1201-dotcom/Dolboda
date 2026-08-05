"use client";

import { useLayoutEffect } from "react";

// 모달·시트가 떠 있는 동안 배경 페이지가 스크롤되지 않게 잠근다.
//
// 왜 공용으로 뺐나: 시트 두 곳(ApplyConfirmSheet·FacilityPhotoModal)은 각자 같은 코드를
// 복붙해 갖고 있었고, 정작 폼이 들어간 모달 두 곳(AuthModal·ConsultModal)은 잠금이 아예
// 없었다 — 로그인 창이 떠 있는데 뒤 페이지가 자유롭게 스크롤되면 "덜 만든 웹"처럼 느껴진다.
//
// iOS Safari 주의 두 가지:
//  ① `overflow: hidden`만으로는 iOS에서 배경이 완전히 멈추지 않는다. 스크롤 위치를
//     기억했다가 `position: fixed`로 고정하고, 닫을 때 원래 위치로 되돌린다.
//     (이걸 안 하면 모달을 닫았을 때 페이지가 맨 위로 튀어 올라간다 — 가장 흔한 증상)
//  ② 잠글 때 사라지는 스크롤바 폭만큼 데스크톱 레이아웃이 밀린다. 그 폭을
//     padding-right로 채워 화면이 덜컥이지 않게 한다(모바일은 0이라 영향 없음).
//
// useLayoutEffect를 쓰는 이유: 페인트 전에 잠가야 모달이 뜨는 순간의 깜빡임이 없다.

export function useBodyScrollLock(active = true) {
  useLayoutEffect(() => {
    if (!active) return;

    const body = document.body;
    const scrollY = window.scrollY;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;

    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.paddingRight = prev.paddingRight;
      // 고정을 풀면 브라우저가 스크롤을 0으로 되돌리므로 직접 복원한다.
      // instant가 아니면 smooth 스크롤 설정(html { scroll-behavior: smooth })에 걸려
      // 닫을 때마다 화면이 주르륵 움직인다.
      window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
    };
  }, [active]);
}
