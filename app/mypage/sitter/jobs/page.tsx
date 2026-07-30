"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, MapPin, Calendar, FileText } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { typeMeta, type LocationTypeValue } from "@/lib/careLocationTypes";

interface OpenRequest {
  id: string;
  locationType: LocationTypeValue;
  region: string;
  locationNote: string | null;
  startDate: string;
  endDate: string;
  situation: string | null;
  mobilityLevel: string | null;
  householdTasks: string[];
  visitsPerWeek: number | null;
  visitHours: number | null;
  alreadyApplied: boolean;
}

export default function SitterJobsPage() {
  const [requests, setRequests] = useState<OpenRequest[] | null | undefined>(undefined);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [hasConfirmedMatch, setHasConfirmedMatch] = useState(false);

  useEffect(() => {
    fetch("/api/care-requests/open")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setRequests(data ? data.items : null));
    fetch("/api/care-request-applications/mine").then((r) => setHasConfirmedMatch(r.ok));
  }, []);

  async function handleApply(id: string) {
    setApplyingId(id);
    const res = await fetch("/api/care-request-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careRequestId: id }),
    });
    if (res.ok || res.status === 409) {
      setRequests((prev) =>
        prev ? prev.map((r) => (r.id === id ? { ...r, alreadyApplied: true } : r)) : prev
      );
    }
    setApplyingId(null);
  }

  if (requests === undefined) return null;

  if (requests === null) {
    return (
      <MyPageShell>
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50 p-8 text-center">
          <p className="mb-3 text-sm text-ink-700">아직 모심시터로 등록하지 않으셨어요.</p>
          <Link
            href="/mypage/sitter/register"
            className="inline-block rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
          >
            모심시터 등록하기
          </Link>
        </div>
      </MyPageShell>
    );
  }

  return (
    <MyPageShell>
      <h2 className="mb-1 text-xl font-bold text-ink-900">일자리 관리</h2>
      <p className="mb-6 text-sm text-ink-500">내 활동 지역에 올라온 돌봄 요청이에요.</p>

      {hasConfirmedMatch && (
        <Link
          href="/care-request/confirmation"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-mint-200 bg-mint-50 p-4 transition-colors duration-150 hover:bg-mint-100"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-700">
            <FileText size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-ink-900">매칭이 확정된 돌봄이 있어요</span>
            <span className="block text-xs text-ink-500">
              돌봄 확인서에서 확정 내용을 보고 인쇄·저장할 수 있어요.
            </span>
          </span>
        </Link>
      )}

      {requests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-100 bg-ink-100/20 py-16 text-center">
          <Briefcase size={28} className="text-ink-300" />
          <p className="text-sm font-medium text-ink-500">아직 등록된 일자리가 없어요</p>
          <p className="px-6 text-xs text-ink-300">
            내 활동 지역에 보호자가 돌봄 요청을 올리면 여기서 확인하고 지원할 수 있어요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const meta = typeMeta(r.locationType);
            const visitInfo = [
              r.visitsPerWeek != null && `주 ${r.visitsPerWeek}회`,
              r.visitHours != null && `1회 ${r.visitHours}시간`,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
            <div key={r.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-300">
                <span className={`rounded-full px-2.5 py-1 font-bold ${meta.badgeClass}`}>
                  {meta.label}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-ink-100/60 px-2.5 py-1 font-semibold text-ink-700">
                  <MapPin size={12} />
                  {r.region}
                  {r.locationNote && ` · ${r.locationNote}`}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {r.startDate.slice(0, 10)} ~ {r.endDate.slice(0, 10)}
                </span>
              </div>
              {r.locationType === "HOUSEKEEPING" ? (
                <>
                  {visitInfo && (
                    <p className="mb-1.5 text-sm font-semibold text-ink-900">{visitInfo}</p>
                  )}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {r.householdTasks.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-mint-100 px-2.5 py-1 text-xs font-medium text-mint-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-1 text-sm font-semibold text-ink-900">
                    {[r.mobilityLevel, visitInfo].filter(Boolean).join(" · ")}
                  </p>
                  {r.situation && (
                    <p className="mb-3 line-clamp-2 text-sm text-ink-500">{r.situation}</p>
                  )}
                </>
              )}
              <button
                type="button"
                disabled={r.alreadyApplied || applyingId === r.id}
                onClick={() => handleApply(r.id)}
                className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors duration-150 ${
                  r.alreadyApplied
                    ? "cursor-not-allowed bg-ink-100 text-ink-300"
                    : "bg-primary-500 text-white hover:bg-primary-600"
                }`}
              >
                {r.alreadyApplied ? "지원완료" : applyingId === r.id ? "지원 중..." : "지원하기"}
              </button>
            </div>
            );
          })}
        </div>
      )}
    </MyPageShell>
  );
}
