"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CareRequestWizard } from "@/components/CareRequestWizard";
import { CareRequestDetail } from "@/components/CareRequestDetail";
import { CareReviewPrompt } from "@/components/CareReviewPrompt";
import { CareRequestSignedOut } from "@/components/CareRequestSignedOut";
import { PageLoader } from "@/components/PageLoader";
import type { CareRequestData } from "@/lib/careRequestTypes";
import { parseLocationTypeParam } from "@/lib/careLocationTypes";

function CareRequestContent() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  // /services에서 "가사 돌봄 요청하기"처럼 유형을 정해서 들어오면 그 유형으로 시작한다.
  const presetType = parseLocationTypeParam(params.get("type"));
  const [current, setCurrent] = useState<CareRequestData | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  // 완료 직후 화면에서 고른 다음 행동: "같은 조건으로 다시"(template) 또는 "새로"(blank)
  const [nextAction, setNextAction] = useState<"template" | "blank" | null>(null);

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

  if (status === "loading" || current === undefined) return <PageLoader />;

  if (!session?.user) return <CareRequestSignedOut presetType={presetType} />;

  const isActive = current && (current.status === "OPEN" || current.status === "MATCHED");

  // 완료된 직후 — 예전엔 곧바로 새 요청 폼으로 바뀌어서 후기를 남길 자리도,
  // 마무리 인사도 없었다. 후기·재요청·새요청을 한 화면에 모은다.
  if (current && current.status === "COMPLETED" && nextAction === null) {
    return (
      <CareReviewPrompt
        careRequest={current}
        onReviewed={setCurrent}
        onReuse={() => setNextAction("template")}
        onNewRequest={() => setNextAction("blank")}
      />
    );
  }

  if (isActive && current && !editing) {
    return (
      <CareRequestDetail
        careRequest={current}
        justCreated={justCreated}
        onEdit={() => {
          setJustCreated(false);
          setEditing(true);
        }}
        onChange={(r) => {
          setJustCreated(false);
          setCurrent(r);
        }}
      />
    );
  }

  return (
    <CareRequestWizard
      initial={editing ? current : null}
      template={!editing && nextAction === "template" ? current : null}
      presetType={editing ? null : presetType}
      onSaved={(saved) => {
        // 새로 등록한 경우에만 축하 배너를 보여준다 (수정 완료는 제외)
        setJustCreated(!editing);
        setCurrent(saved);
        setEditing(false);
        setNextAction(null);
        window.scrollTo({ top: 0, behavior: "instant" });
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
