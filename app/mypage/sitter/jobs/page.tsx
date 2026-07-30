"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, MapPin, Calendar, Clock, User, Wallet, FileText, SlidersHorizontal } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { typeMeta, LOCATION_TYPES, type LocationTypeValue } from "@/lib/careLocationTypes";
import { formatTimeRange, daysBetween } from "@/lib/careOptions";

interface JobRequest {
  id: string;
  locationType: LocationTypeValue;
  region: string;
  locationNote: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  roundTheClock: boolean;
  recipientGender: string | null;
  recipientAgeBand: string | null;
  recipientWeightBand: string | null;
  situation: string | null;
  mobilityLevel: string | null;
  mealAssistLevel: string | null;
  toiletAssistLevel: string | null;
  conditions: string[];
  householdTasks: string[];
  visitsPerWeek: number | null;
  visitHours: number | null;
  sitterGenderPref: string;
  budgetAmount: number | null;
  budgetUnit: string | null;
  status?: string;
  alreadyApplied?: boolean;
}

interface MyApplication {
  id: string;
  status: string;
  createdAt: string;
  careRequest: JobRequest & { status: string };
}

type Tab = "open" | "applied" | "matched" | "done";

const TABS: { key: Tab; label: string }[] = [
  { key: "open", label: "새 일자리" },
  { key: "applied", label: "지원 현황" },
  { key: "matched", label: "매칭된 돌봄" },
  { key: "done", label: "완료" },
];

const SORTS = [
  { key: "recent", label: "최신순" },
  { key: "startSoon", label: "시작 임박순" },
  { key: "payHigh", label: "사례비 높은순" },
];

function JobCard({
  job,
  footer,
  badge,
}: {
  job: JobRequest;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const meta = typeMeta(job.locationType);
  const timeRange = formatTimeRange(job.roundTheClock, job.startTime, job.endTime);
  const days = daysBetween(job.startDate, job.endDate);
  const recipient = [job.recipientGender, job.recipientAgeBand, job.recipientWeightBand]
    .filter(Boolean)
    .join(" · ");
  const visit = job.visitsPerWeek
    ? `주 ${job.visitsPerWeek}회${job.visitHours ? ` · 1회 ${job.visitHours}시간` : ""}`
    : null;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.badgeClass}`}>
          {meta.label}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-ink-100/60 px-2.5 py-1 text-xs font-semibold text-ink-700">
          <MapPin size={11} />
          {job.region}
        </span>
        {badge}
      </div>

      {job.locationNote && (
        <p className="mb-1.5 text-sm font-bold text-ink-900">{job.locationNote}</p>
      )}

      <dl className="mb-2 space-y-1 text-xs text-ink-500">
        <div className="flex gap-2">
          <dt className="flex w-14 shrink-0 items-center gap-1 text-ink-300">
            <Calendar size={11} />
            기간
          </dt>
          <dd className="font-medium text-ink-700">
            {job.startDate.slice(2, 10).replace(/-/g, ".")} ~{" "}
            {job.endDate.slice(2, 10).replace(/-/g, ".")} ({days}일)
          </dd>
        </div>
        {(timeRange || visit) && (
          <div className="flex gap-2">
            <dt className="flex w-14 shrink-0 items-center gap-1 text-ink-300">
              <Clock size={11} />
              시간
            </dt>
            <dd className="font-medium text-ink-700">
              {[timeRange, visit].filter(Boolean).join(" · ")}
            </dd>
          </div>
        )}
        {recipient && (
          <div className="flex gap-2">
            <dt className="flex w-14 shrink-0 items-center gap-1 text-ink-300">
              <User size={11} />
              대상
            </dt>
            <dd className="font-medium text-ink-700">{recipient}</dd>
          </div>
        )}
        {job.budgetAmount && (
          <div className="flex gap-2">
            <dt className="flex w-14 shrink-0 items-center gap-1 text-ink-300">
              <Wallet size={11} />
              사례비
            </dt>
            <dd className="font-bold text-primary-600">
              {job.budgetUnit === "시간" ? "시간당" : "하루"}{" "}
              {job.budgetAmount.toLocaleString()}원 희망
            </dd>
          </div>
        )}
      </dl>

      {job.householdTasks.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {job.householdTasks.map((t) => (
            <span
              key={t}
              className="rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-medium text-mint-700"
            >
              {t}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-2 flex flex-wrap gap-1">
          {[job.mobilityLevel, job.mealAssistLevel, job.toiletAssistLevel]
            .filter(Boolean)
            .map((t) => (
              <span
                key={t}
                className="rounded-full bg-ink-100/60 px-2 py-0.5 text-[11px] font-medium text-ink-700"
              >
                {t}
              </span>
            ))}
          {job.conditions.map((c) => (
            <span
              key={c}
              className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-ink-700"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {job.situation && (
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-ink-500">{job.situation}</p>
      )}

      {footer}
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-100 bg-ink-100/20 py-14 text-center">
      <Briefcase size={26} className="text-ink-300" />
      <p className="text-sm font-medium text-ink-500">{text}</p>
      <p className="px-8 text-xs leading-relaxed text-ink-300">{sub}</p>
    </div>
  );
}

export default function SitterJobsPage() {
  const [tab, setTab] = useState<Tab>("open");
  const [isSitter, setIsSitter] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [typeFilter, setTypeFilter] = useState<LocationTypeValue | "">("");
  const [sort, setSort] = useState("recent");
  const [hideClosed, setHideClosed] = useState(true);

  const loadJobs = useCallback(async () => {
    const params = new URLSearchParams({ sort, hideClosed: String(hideClosed) });
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/care-requests/open?${params}`);
    if (res.status === 404) {
      setIsSitter(false);
      return;
    }
    setIsSitter(true);
    const data = await res.json();
    setJobs(data.items ?? []);
  }, [sort, hideClosed, typeFilter]);

  const loadApplications = useCallback(async () => {
    const res = await fetch("/api/care-request-applications/mine");
    if (!res.ok) return;
    const data = await res.json();
    setApplications(data.items ?? []);
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  async function handleApply(id: string) {
    setApplyingId(id);
    const res = await fetch("/api/care-request-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careRequestId: id }),
    });
    if (res.ok || res.status === 409) {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, alreadyApplied: true } : j)));
      loadApplications();
    }
    setApplyingId(null);
  }

  async function handleWithdraw(applicationId: string) {
    await fetch(`/api/care-request-applications/${applicationId}`, { method: "DELETE" });
    loadApplications();
    loadJobs();
  }

  if (isSitter === null) return null;

  if (isSitter === false) {
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

  const applied = applications.filter((a) => a.status === "지원완료");
  const matched = applications.filter((a) => a.status === "매칭확정");
  const done = applications.filter((a) => a.status === "돌봄완료");

  const counts: Record<Tab, number> = {
    open: jobs.length,
    applied: applied.length,
    matched: matched.length,
    done: done.length,
  };

  return (
    <MyPageShell>
      <h2 className="mb-1 text-xl font-bold text-ink-900">일자리 관리</h2>
      <p className="mb-4 text-sm text-ink-500">
        내 활동 지역에 올라온 돌봄 요청과 내 지원 현황을 한곳에서 확인하세요.
      </p>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
              tab === t.key
                ? "border-primary-500 text-primary-700"
                : "border-transparent text-ink-300 hover:text-ink-500"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && <span className="ml-1 text-xs">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {tab === "open" && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                showFilters || typeFilter || !hideClosed
                  ? "border-primary-300 bg-primary-50 text-primary-700"
                  : "border-ink-100 text-ink-500 hover:bg-ink-100/60"
              }`}
            >
              <SlidersHorizontal size={12} />
              필터
            </button>
            <div className="flex gap-1 overflow-x-auto">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                    sort === s.key
                      ? "bg-ink-900 text-white"
                      : "text-ink-500 hover:bg-ink-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {showFilters && (
            <div className="mb-4 space-y-3 rounded-2xl border border-ink-100 bg-white p-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink-700">돌봄 유형</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTypeFilter("")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      typeFilter === ""
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-ink-100 text-ink-500"
                    }`}
                  >
                    전체
                  </button>
                  {LOCATION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTypeFilter(t.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        typeFilter === t.value
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-ink-100 text-ink-500"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-between text-sm text-ink-700">
                이미 시작된 돌봄은 숨기기
                <input
                  type="checkbox"
                  checked={hideClosed}
                  onChange={(e) => setHideClosed(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary-500"
                />
              </label>
            </div>
          )}

          {jobs.length === 0 ? (
            <EmptyState
              text="지금은 조건에 맞는 일자리가 없어요"
              sub="필터를 바꾸거나, 프로필에서 활동 지역을 넓히면 더 많은 요청을 볼 수 있어요."
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  badge={
                    job.sitterGenderPref !== "무관" ? (
                      <span className="rounded-full bg-royal-50 px-2.5 py-1 text-xs font-semibold text-royal-700">
                        {job.sitterGenderPref} 선호
                      </span>
                    ) : null
                  }
                  footer={
                    <button
                      type="button"
                      disabled={job.alreadyApplied || applyingId === job.id}
                      onClick={() => handleApply(job.id)}
                      className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors duration-150 ${
                        job.alreadyApplied
                          ? "cursor-not-allowed bg-ink-100 text-ink-300"
                          : "bg-primary-500 text-white hover:bg-primary-600"
                      }`}
                    >
                      {job.alreadyApplied
                        ? "지원완료"
                        : applyingId === job.id
                        ? "지원 중..."
                        : "지원하기"}
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "applied" && (
        <div className="space-y-3">
          {applied.length === 0 ? (
            <EmptyState
              text="아직 지원한 일자리가 없어요"
              sub="새 일자리 탭에서 마음에 드는 돌봄에 지원해보세요."
            />
          ) : (
            applied.map((a) => (
              <JobCard
                key={a.id}
                job={a.careRequest}
                badge={
                  <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
                    보호자 확인 대기
                  </span>
                }
                footer={
                  <button
                    type="button"
                    onClick={() => handleWithdraw(a.id)}
                    className="w-full rounded-xl border border-ink-100 py-2.5 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                  >
                    지원 취소
                  </button>
                }
              />
            ))
          )}
        </div>
      )}

      {tab === "matched" && (
        <div className="space-y-3">
          {matched.length === 0 ? (
            <EmptyState
              text="아직 확정된 돌봄이 없어요"
              sub="보호자가 확정하면 이곳에서 일정과 확인서를 볼 수 있어요."
            />
          ) : (
            matched.map((a) => (
              <JobCard
                key={a.id}
                job={a.careRequest}
                badge={
                  <span className="rounded-full bg-mint-100 px-2.5 py-1 text-xs font-bold text-mint-700">
                    매칭 확정
                  </span>
                }
                footer={
                  <Link
                    href="/care-request/confirmation"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-mint-200 bg-mint-50 py-2.5 text-sm font-bold text-mint-700 transition-colors duration-150 hover:bg-mint-100"
                  >
                    <FileText size={15} />
                    돌봄 확인서 보기
                  </Link>
                }
              />
            ))
          )}
        </div>
      )}

      {tab === "done" && (
        <div className="space-y-3">
          {done.length === 0 ? (
            <EmptyState
              text="완료된 돌봄이 없어요"
              sub="돌봄이 끝나 보호자가 완료 처리하면 여기에 기록으로 남아요."
            />
          ) : (
            done.map((a) => (
              <JobCard
                key={a.id}
                job={a.careRequest}
                badge={
                  <span className="rounded-full bg-royal-50 px-2.5 py-1 text-xs font-bold text-royal-700">
                    돌봄 완료
                  </span>
                }
              />
            ))
          )}
        </div>
      )}
    </MyPageShell>
  );
}
