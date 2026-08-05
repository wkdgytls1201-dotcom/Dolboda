"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";

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
  /** 공개 프로필(/manager/[id]) 동의 시각 — null이면 비공개 */
  publicProfileAt: string | null;
  /** 역경매 지원자 카드용(선택) — "여성"|"남성", "20대"~"70대 이상" */
  gender: string | null;
  ageBand: string | null;
  certifications: SitterCertification[];
}

interface SitterProfileContextValue {
  /** undefined = 아직 확인 중, null = 시터로 등록 안 됨 */
  profile: SitterProfileData | null | undefined;
  /** profile과 같은 정보를 boolean으로 — 사이드바 메뉴 분기 등에 편하게 쓰려고 */
  isSitter: boolean | null;
  /**
   * isSitter와 같지만, 확인 중일 때는 **지난번에 확인된 값**을 대신 돌려준다.
   *
   * 왜 필요한가: 매니저로 등록한 사람이 다른 화면에 있다가 마이페이지에 들어오면
   * /api/sitter-profile 응답이 올 때까지 매번 `isSitter === null`이라, 역할 세그먼트의
   * "매니저" 자리가 흐린 자리표시로 있다가 뒤늦게 채워졌다. 이 계정이 매니저인지는
   * 거의 바뀌지 않는 사실이라, 지난번 답을 먼저 그려두고 응답이 오면 확정하는 편이
   * 훨씬 자연스럽다.
   *
   * **확정 값이 아니다.** 되돌릴 수 없는 동작(권한 판단, 상태 변경 API 호출)에는
   * 쓰지 말고 isSitter를 볼 것. 이건 "무엇을 먼저 그릴까"에만 쓰는 값이다.
   */
  isSitterHint: boolean | null;
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

/** 계정마다 따로 기억한다 — 다른 계정으로 갈아탔을 때 앞 사람의 답을 물려받으면 안 된다. */
const cacheKey = (userId: string) => `dolboda:isSitter:${userId}`;

// 마이페이지의 돌보다 매니저 관련 화면들(사이드바·프로필관리·정산관리)이 각자
// /api/sitter-profile를 따로 불러서 화면 전환마다 같은 요청이 중복으로 나가던 걸
// 여기서 한 번만 불러 공유한다.
export function SitterProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<SitterProfileData | null | undefined>(undefined);
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  // 지난번에 확인된 매니저 등록 여부. 초기값은 서버와 같게(null) 두고 아래에서 복원한다 —
  // 렌더 도중 localStorage를 읽으면 서버엔 그 값이 없어 하이드레이션이 깨진다.
  const [cachedIsSitter, setCachedIsSitter] = useState<boolean | null>(null);
  // 복원이 끝나기 전에는 저장 effect가 돌지 않게 막는다. 안 막으면 첫 렌더의 초기값(null)이
  // 저장분을 덮어써 기억해둔 답이 매번 지워진다.
  const restored = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (!userId) return;
    restored.current = false;
    try {
      const raw = window.localStorage.getItem(cacheKey(userId));
      setCachedIsSitter(raw === "1" ? true : raw === "0" ? false : null);
    } catch {
      // 사파리 프라이빗 모드 등 — 기억을 못 해도 기능 자체는 그대로 돌아간다
      setCachedIsSitter(null);
    }
    restored.current = true;
  }, [userId]);

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

  // 확정된 답이 나오면 다음 방문을 위해 적어둔다.
  useEffect(() => {
    if (!userId || !restored.current || isSitter === null) return;
    try {
      window.localStorage.setItem(cacheKey(userId), isSitter ? "1" : "0");
    } catch {
      /* 저장 못 해도 무시 */
    }
  }, [userId, isSitter]);

  const isSitterHint = isSitter ?? cachedIsSitter;

  return (
    <SitterProfileContext.Provider
      value={{ profile, isSitter, isSitterHint, refetch, update }}
    >
      {children}
    </SitterProfileContext.Provider>
  );
}

export function useSitterProfileContext() {
  const ctx = useContext(SitterProfileContext);
  if (!ctx) throw new Error("useSitterProfileContext must be used within SitterProfileProvider");
  return ctx;
}
