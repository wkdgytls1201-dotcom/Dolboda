"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
// next/navigation의 useRouter 대신 next-view-transitions의 것을 쓴다 — push 앞뒤로
// document.startViewTransition을 걸어줘서, 카드 이미지 → 상세 이미지로 이어지는
// 전환 애니메이션(view-transition-name 짝 맞추기)이 동작하게 된다.
import { useTransitionRouter } from "next-view-transitions";
import { useSession } from "next-auth/react";
import { canViewFacility, registerFacilityView } from "./viewLimit";
import { AuthModal } from "@/components/AuthModal";

interface ViewGateContextValue {
  requestFacilityView: (facilityId: string) => void;
}

const ViewGateContext = createContext<ViewGateContextValue | null>(null);

const GATE_REASON = "로그인하면 제한 없이 볼 수 있어요.";

export function ViewGateProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useTransitionRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const requestFacilityView = useCallback(
    (facilityId: string) => {
      if (user || canViewFacility(facilityId)) {
        if (!user) registerFacilityView(facilityId);
        router.push(`/facility/${facilityId}`);
        return;
      }
      setPendingId(facilityId);
    },
    [user, router]
  );

  // 모달에서 로그인에 성공하면 원래 보려던 시설로 바로 이동시킨다.
  useEffect(() => {
    if (user && pendingId) {
      router.push(`/facility/${pendingId}`);
      setPendingId(null);
    }
  }, [user, pendingId, router]);

  return (
    <ViewGateContext.Provider value={{ requestFacilityView }}>
      {children}
      {pendingId && <AuthModal reason={GATE_REASON} onClose={() => setPendingId(null)} />}
    </ViewGateContext.Provider>
  );
}

export function useViewGate() {
  const ctx = useContext(ViewGateContext);
  if (!ctx) throw new Error("useViewGate must be used within ViewGateProvider");
  return ctx;
}
