"use client";

import { signOut } from "next-auth/react";

// 로그아웃 시 함께 비워야 하는 로컬 저장 키.
// 비교함·관심시설·검색조건은 개인 활동 기록이라, 로그아웃 뒤 다음 사람에게 그대로
// 보이면 안 된다(공용 PC 대비).
const KEYS_TO_CLEAR = [
  "compare-ids",
  "mosim-favorite-ids",
  "dolboda-search-state",
  "dolboda-user-location",
];

export async function signOutAndClear() {
  try {
    for (const key of KEYS_TO_CLEAR) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  } catch {
    // 저장소 접근이 막혀 있어도 로그아웃 자체는 진행한다
  }
  await signOut({ callbackUrl: "/" });
}
