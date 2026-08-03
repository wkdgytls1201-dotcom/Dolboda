"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, Printer } from "lucide-react";
import { typeMeta } from "@/lib/careLocationTypes";
import { formatTimeRange, daysBetween } from "@/lib/careOptions";
import { PageLoader } from "@/components/PageLoader";
import type { CareRequestData } from "@/lib/careRequestTypes";

interface ConfirmationData {
  careRequest: CareRequestData;
  sitter: {
    nickname: string;
    experienceYears: number;
    certifications: { id: string; name: string }[];
  };
  guardianName: string | null;
}

// 이름 최소 노출 — 첫 글자만 남기고 마스킹.
function maskName(name: string | null) {
  if (!name || name.length === 0) return "보호자";
  if (name.length === 1) return name;
  return name[0] + "*".repeat(name.length - 1);
}

export default function CareConfirmationPage() {
  const { status } = useSession();
  const [data, setData] = useState<ConfirmationData | null | undefined>(undefined);

  useEffect(() => {
    if (status !== "authenticated") return;
    // 보호자/시터 어느 쪽이든 자기 매칭확정 건을 찾는다.
    (async () => {
      const [guardianRes, sitterRes] = await Promise.all([
        fetch("/api/care-requests"),
        fetch("/api/care-request-applications/mine"),
      ]);

      if (guardianRes.ok) {
        const r = await guardianRes.json();
        const confirmed = r?.applications?.find(
          (a: { status: string }) => a.status === "매칭확정"
        );
        if (r?.status === "MATCHED" && confirmed) {
          setData({
            careRequest: r,
            sitter: confirmed.sitterProfile,
            guardianName: null, // 보호자 본인 화면 — 아래에서 세션 이름으로 채움
          });
          return;
        }
      }

      if (sitterRes.ok) {
        const r = await sitterRes.json();
        if (r?.application) {
          setData({
            careRequest: r.application.careRequest,
            sitter: r.application.sitterProfile,
            guardianName: r.application.careRequest.guardian?.name ?? null,
          });
          return;
        }
      }

      setData(null);
    })();
  }, [status]);

  const { data: session } = useSession();

  if (status === "loading" || data === undefined) return <PageLoader />;

  if (status !== "authenticated") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm text-ink-500">돌봄 확인서는 로그인 후 확인할 수 있어요.</p>
      </main>
    );
  }

  if (data === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">확정된 돌봄이 아직 없어요</h1>
        <p className="mb-6 text-sm text-ink-500">
          매칭이 확정되면 여기서 돌봄 확인서를 볼 수 있어요.
        </p>
        <Link
          href="/care-request"
          className="inline-flex min-h-[44px] items-center rounded-xl bg-primary-500 px-5 text-sm font-bold text-white transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
        >
          돌봄 요청 보러 가기
        </Link>
      </main>
    );
  }

  const cr = data.careRequest;
  const meta = typeMeta(cr.locationType);
  const guardianDisplay = maskName(data.guardianName ?? session?.user?.name ?? null);
  const today = new Date().toISOString().slice(0, 10);

  const row = (label: string, value: string | null | undefined) =>
    value ? [{ label, value }] : [];
  const timeRange = formatTimeRange(cr.roundTheClock, cr.startTime, cr.endTime);
  const days = daysBetween(cr.startDate, cr.endDate);
  const recipientInfo = [cr.recipientGender, cr.recipientAgeBand, cr.recipientWeightBand]
    .filter(Boolean)
    .join(" · ");

  const rows: { label: string; value: string }[] = [
    { label: "돌봄 유형", value: meta.label },
    { label: "지역", value: cr.region },
    ...row("장소", cr.locationNote),
    {
      label: "기간",
      value: `${cr.startDate.slice(0, 10)} ~ ${cr.endDate.slice(0, 10)} (${days}일)`,
    },
    ...row("시간", timeRange),
    ...row(
      "방문",
      cr.visitsPerWeek
        ? `주 ${cr.visitsPerWeek}회${cr.visitHours ? ` · 1회 ${cr.visitHours}시간` : ""}`
        : null
    ),
    ...row("돌봄 받으실 분", cr.recipientName),
    ...row("대상자 정보", recipientInfo || null),
    ...row("거동", cr.mobilityLevel),
    ...row("식사", cr.mealAssistLevel),
    ...row("배변", cr.toiletAssistLevel),
    ...row("집안일", cr.householdTasks.length > 0 ? cr.householdTasks.join(", ") : null),
    ...row("관리 필요 사항", cr.conditions.length > 0 ? cr.conditions.join(", ") : null),
    ...row("병원 출입", cr.hospitalEntry),
    ...row("병실", cr.roomType),
    ...row("입원 사유", cr.admissionReason),
    ...row("수술 예정", cr.surgeryPlan),
    ...row("상황 설명", cr.situation),
    { label: "선호 성별", value: cr.sitterGenderPref },
    ...row("특별 요청", cr.specialRequests.length > 0 ? cr.specialRequests.join(", ") : null),
    ...row(
      "희망 사례비",
      cr.budgetAmount
        ? `${cr.budgetUnit === "시간" ? "시간당" : "하루"} ${cr.budgetAmount.toLocaleString()}원 (보호자 제시)`
        : null
    ),
    ...row("전달 사항", cr.requestNote),
  ];

  return (
    <main className="mx-auto max-w-xl px-4 py-6 pb-16">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href="/care-request"
          className="flex min-h-[44px] items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink-500 transition-all duration-150 ease-snappy hover:bg-ink-100 active:scale-95"
        >
          <ChevronLeft size={18} />
          돌봄 요청
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600 active:scale-95"
        >
          <Printer size={15} />
          인쇄 · PDF 저장
        </button>
      </div>

      <div className="print-area rounded-2xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink-900">돌봄 확인서</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.badgeClass}`}>
            {meta.label}
          </span>
        </div>
        <p className="mb-5 text-xs text-ink-300">발급일 {today} · 돌보다</p>

        <p className="mb-6 rounded-xl bg-ink-100/40 p-3.5 text-xs leading-relaxed text-ink-500">
          이 문서는 법적 효력이 있는 계약서가 아니에요. 보호자와 돌보다 매니저가 서로 확인한 돌봄
          내용을 한 장으로 정리한 확인용 요약본이에요.
        </p>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold text-ink-900">함께하는 분들</h2>
          <dl className="divide-y divide-ink-100 rounded-xl border border-ink-100 text-sm">
            <div className="flex justify-between px-3.5 py-2.5">
              <dt className="text-ink-500">보호자</dt>
              <dd className="font-medium text-ink-900">{guardianDisplay}</dd>
            </div>
            <div className="flex justify-between px-3.5 py-2.5">
              <dt className="text-ink-500">돌보다 매니저</dt>
              <dd className="font-medium text-ink-900">
                {data.sitter.nickname} · 경력 {data.sitter.experienceYears}년
              </dd>
            </div>
            {data.sitter.certifications.length > 0 && (
              <div className="flex justify-between gap-4 px-3.5 py-2.5">
                <dt className="shrink-0 text-ink-500">자격증</dt>
                <dd className="text-right font-medium text-ink-900">
                  {data.sitter.certifications.map((c) => c.name).join(", ")}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold text-ink-900">확정된 돌봄 내용</h2>
          <dl className="divide-y divide-ink-100 rounded-xl border border-ink-100 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 px-3.5 py-2.5">
                <dt className="shrink-0 text-ink-500">{row.label}</dt>
                <dd className="text-right font-medium text-ink-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-xs leading-relaxed text-ink-300">
          비용 등 세부 조건은 보호자와 돌보다 매니저가 직접 협의해 정해요. 돌보다는 두 분을
          연결해드리는 역할만 하며, 돌봄 과정에서 의료행위(석션, 튜브 관리 등)는 제공되지
          않아요.
        </p>
      </div>
    </main>
  );
}
