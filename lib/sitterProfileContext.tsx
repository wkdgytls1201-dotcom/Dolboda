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

  const isSitter = profile === undefined ? null : profile !== null;

  return (
    <SitterProfileContext.Provider value={{ profile, isSitter, refetch }}>
      {children}
    </SitterProfileContext.Provider>
  );
}

export function useSitterProfileContext() {
  const ctx = useContext(SitterProfileContext);
  if (!ctx) throw new Error("useSitterProfileContext must be used within SitterProfileProvider");
  return ctx;
}
