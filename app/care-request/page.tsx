"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CareRequestWizard } from "@/components/CareRequestWizard";
import { CareRequestDetail } from "@/components/CareRequestDetail";
import type { CareRequestData } from "@/lib/careRequestTypes";

export default function CareRequestPage() {
  const { data: session, status } = useSession();
  const [current, setCurrent] = useState<CareRequestData | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/care-requests")
      .then((r) => (r.ok ? r.json() : null))
      .then(setCurrent);
  }, [status]);

  if (status === "loading" || current === undefined) return null;

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm text-ink-500">돌봄 요청은 로그인 후 등록할 수 있어요.</p>
      </main>
    );
  }

  const isActive = current && (current.status === "OPEN" || current.status === "MATCHED");

  if (isActive && current && !editing) {
    return (
      <CareRequestDetail
        careRequest={current}
        onEdit={() => setEditing(true)}
        onChange={setCurrent}
      />
    );
  }

  return (
    <CareRequestWizard
      initial={editing ? current : null}
      onSaved={(saved) => {
        setCurrent(saved);
        setEditing(false);
      }}
      onCancelEdit={editing ? () => setEditing(false) : undefined}
    />
  );
}
