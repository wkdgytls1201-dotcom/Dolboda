"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
