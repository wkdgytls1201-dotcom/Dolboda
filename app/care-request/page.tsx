"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CareRequestWizard } from "@/components/CareRequestWizard";
import { CareRequestDetail } from "@/components/CareRequestDetail";
import { CareRequestSignedOut } from "@/components/CareRequestSignedOut";
import type { CareRequestData } from "@/lib/careRequestTypes";
import { parseLocationTypeParam } from "@/lib/careLocationTypes";

function CareRequestContent() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  // /services에서 "가사 돌봄 요청하기"처럼 유형을 정해서 들어오면 그 유형으로 시작한다.
  const presetType = parseLocationTypeParam(params.get("type"));
  const [current, setCurrent] = useState<CareRequestData | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      // 로그인 전에도 화면이 그려져야 한다. 이 처리가 없으면 current가 undefined로 남아
      // 페이지 전체가 빈 화면이 된다.
      setCurrent(null);
      return;
    }
    fetch("/api/care-requests")
      .then((r) => (r.ok ? r.json() : null))
      .then(setCurrent);
  }, [status]);

  if (status === "loading" || current === undefined) return null;

  if (!session?.user) return <CareRequestSignedOut presetType={presetType} />;

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
      presetType={editing ? null : presetType}
      onSaved={(saved) => {
        setCurrent(saved);
        setEditing(false);
      }}
      onCancelEdit={editing ? () => setEditing(false) : undefined}
    />
  );
}

export default function CareRequestPage() {
  return (
    <Suspense fallback={null}>
      <CareRequestContent />
    </Suspense>
  );
}
