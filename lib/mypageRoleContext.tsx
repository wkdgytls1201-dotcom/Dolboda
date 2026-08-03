"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSitterProfileContext } from "./sitterProfileContext";

// 마이페이지 역할 전환 (보호자 ↔ 돌보다 매니저).
//
// 한 계정이 두 얼굴을 갖는다: 어머니를 모실 시설을 찾는 보호자이면서, 동시에
// 돌봄 일을 하는 매니저일 수 있다. 예전엔 두 영역이 한 화면에 세로로 쌓여 있어서
// 매니저로 들어온 사람도 보호자 메뉴를 지나쳐야 했고, 보호자는 쓰지도 않는
// 매니저 메뉴가 화면 절반을 차지했다.
//
// 서버에 저장하지 않고 브라우저에만 둔다 — 이건 "이 사람이 누구인가"가 아니라
// "지금 어느 화면을 보고 싶은가"라서, 계정 데이터로 만들면 기기마다 강제로 같아진다.

export type MyPageRole = "guardian" | "manager";

const STORAGE_KEY = "dolboda-mypage-role";

interface MyPageRoleContextValue {
  role: MyPageRole;
  setRole: (role: MyPageRole) => void;
  /** 매니저로 등록돼 있어 전환이 가능한지 (미등록이면 전환 대신 가입 안내를 띄운다) */
  canSwitch: boolean;
}

const MyPageRoleContext = createContext<MyPageRoleContextValue | null>(null);

export function MyPageRoleProvider({ children }: { children: React.ReactNode }) {
  const { isSitter } = useSitterProfileContext();
  // 첫 가입자는 무조건 보호자다 — 매니저는 별도 등록을 거쳐야 하는 역할이라
  // 기본값이 매니저면 등록도 안 한 사람이 빈 매니저 화면을 보게 된다.
  const [role, setRoleState] = useState<MyPageRole>("guardian");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "manager" || saved === "guardian") setRoleState(saved);
    } catch {
      /* 시크릿 모드 등에서 localStorage가 막혀 있어도 기본값(보호자)으로 동작해야 한다 */
    }
  }, []);

  // 매니저 등록을 안 했거나 탈퇴한 계정이 저장된 "manager"로 남아 있으면
  // 빈 매니저 화면에 갇힌다. isSitter가 false로 **확정**됐을 때만 되돌린다
  // (로딩 중 null에서 되돌리면 매니저가 열 때마다 보호자로 튕긴다).
  useEffect(() => {
    if (isSitter === false && role === "manager") setRoleState("guardian");
  }, [isSitter, role]);

  const setRole = useCallback((next: MyPageRole) => {
    setRoleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 저장 실패해도 이번 세션 동안은 전환이 유지된다 */
    }
  }, []);

  return (
    <MyPageRoleContext.Provider value={{ role, setRole, canSwitch: isSitter === true }}>
      {children}
    </MyPageRoleContext.Provider>
  );
}

export function useMyPageRole() {
  const ctx = useContext(MyPageRoleContext);
  if (!ctx) throw new Error("useMyPageRole must be used within MyPageRoleProvider");
  return ctx;
}
