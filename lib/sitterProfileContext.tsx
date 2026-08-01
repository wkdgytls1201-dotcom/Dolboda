"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface SitterCertification {
  id: string;
  name: string;
  issuedBy: string | null;
}

export interface SitterProfileData {
  id: string;
  nickname: string;
  photoUrl: string | null;
  nationality: string;
  intro: string | null;
  experienceYears: number;
  regions: string[];
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  certifications: SitterCertification[];
}

interface SitterProfileContextValue {
  /** undefined = 아직 확인 중, null = 시터로 등록 안 됨 */
  profile: SitterProfileData | null | undefined;
  /** profile과 같은 정보를 boolean으로 — 사이드바 메뉴 분기 등에 편하게 쓰려고 */
  isSitter: boolean | null;
  refetch: () => void;
  /**
   * 저장 API가 돌려준 최신 프로필을 그대로 밀어 넣는다.
   * 레이아웃은 /mypage/* 안에서 다시 마운트되지 않으므로, 이걸 안 부르면
   * 프로필을 고쳐도 사이드바·대시보드·정산관리는 예전 값을 계속 보여준다
   * (계좌를 막 등록하고 정산관리에 가면 "등록된 계좌가 없어요"가 뜨던 원인).
   */
  update: (profile: SitterProfileData) => void;
}

const SitterProfileContext = createContext<SitterProfileContextValue | null>(null);

// 마이페이지의 돌보다 매니저 관련 화면들(사이드바·프로필관리·정산관리)이 각자
// /api/sitter-profile를 따로 불러서 화면 전환마다 같은 요청이 중복으로 나가던 걸
// 여기서 한 번만 불러 공유한다.
export function SitterProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<SitterProfileData | null | undefined>(undefined);

  const refetch = useCallback(() => {
    fetch("/api/sitter-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const update = useCallback((next: SitterProfileData) => setProfile(next), []);

  const isSitter = profile === undefined ? null : profile !== null;

  return (
    <SitterProfileContext.Provider value={{ profile, isSitter, refetch, update }}>
      {children}
    </SitterProfileContext.Provider>
  );
}

export function useSitterProfileContext() {
  const ctx = useContext(SitterProfileContext);
  if (!ctx) throw new Error("useSitterProfileContext must be used within SitterProfileProvider");
  return ctx;
}
