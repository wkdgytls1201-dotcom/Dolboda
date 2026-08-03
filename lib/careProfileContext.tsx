"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// 어르신 돌봄 프로필 — 시설 상세(CareMatchPoints)·마이페이지 대시보드·돌봄 요청 마법사·
// 상담 신청 모달이 함께 쓰는 공유 상태.
//
// 이 Provider가 있기 전엔 각 화면이 useCareProfiles()라는 훅을 각자 마운트해 매번
// /api/care-profile을 새로 불렀다. 시설 상세는 28,000여 페이지가 있고 보호자는
// 그 사이를 계속 오가므로, 페이지를 옮길 때마다(=컴포넌트가 다시 마운트될 때마다)
// 같은 작은 데이터를 다시 받아오고 있었다. 세션(전체 페이지 로드)당 한 번만 받아
// 루트에서 공유하면, 하위 라우트를 아무리 옮겨다녀도 다시 요청하지 않는다
// (FavoritesProvider·CompareProvider와 같은 자리, 같은 원칙).
export interface CareProfileSummary {
  id: string;
  relation: string;
  gender: string | null;
  ageBand: string | null;
  weightBand: string | null;
  mobilityLevel: string | null;
  mealAssistLevel: string | null;
  toiletAssistLevel: string | null;
  conditions: string[];
  ltcGrade: string | null;
  estimatedBand: string | null;
  estimatedAt: string | null;
  /** 요양인정번호(본인 신고값) — 복지용구 혜택 화면에서만 쓴다. 실시간 조회 연동 아님 */
  ltcCertNumber: string | null;
  /** 어르신 생년월일 YYYY-MM-DD — 요양인정번호 등록 화면에서만 받는다 */
  birthDate: string | null;
  /** 장기요양 인정유효기간 시작일 YYYY-MM-DD */
  ltcCertValidFrom: string | null;
}

interface CareProfileContextValue {
  profiles: CareProfileSummary[];
  /** 최초 조회가 끝났는지(비로그인은 즉시 true) — 로딩 중 빈 상태로 잘못 판단하지 않게 */
  loaded: boolean;
  refetch: () => void;
  /** 마이페이지에서 생성 직후 목록에 더한다 */
  add: (p: CareProfileSummary) => void;
  /** 마이페이지에서 수정 직후 해당 항목만 갈아끼운다 */
  replace: (p: CareProfileSummary) => void;
  /** 마이페이지에서 삭제 직후 목록에서 뺀다 */
  remove: (id: string) => void;
}

const CareProfileContext = createContext<CareProfileContextValue | null>(null);

export function CareProfileProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [profiles, setProfiles] = useState<CareProfileSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(() => {
    fetch("/api/care-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setProfiles(Array.isArray(d?.items) ? d.items : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setProfiles([]);
      setLoaded(true);
      return;
    }
    refetch();
  }, [status, refetch]);

  const add = useCallback((p: CareProfileSummary) => {
    setProfiles((prev) => [...prev, p]);
  }, []);
  const replace = useCallback((p: CareProfileSummary) => {
    setProfiles((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  }, []);
  const remove = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <CareProfileContext.Provider value={{ profiles, loaded, refetch, add, replace, remove }}>
      {children}
    </CareProfileContext.Provider>
  );
}

export function useCareProfiles() {
  const ctx = useContext(CareProfileContext);
  if (!ctx) throw new Error("useCareProfiles must be used within CareProfileProvider");
  return ctx;
}
