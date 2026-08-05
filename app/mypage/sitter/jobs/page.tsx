"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  User,
  Wallet,
  FileText,
  FileSignature,
  NotebookPen,
  SlidersHorizontal,
  Search,
  MapPinned,
} from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";
import { ApplyConfirmSheet, type ApplyPayload } from "@/components/ApplyConfirmSheet";
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
  /** 우선 요청(보호자가 포인트로 켠 상단 노출) — 목록 상단 고정 + 배지 */
  boosted?: boolean;
}

interface MyApplication {
  id: string;
  status: string;
  createdAt: string;
  /** 역경매 — 내가 낸 제안(지원완료 상태면 수정 가능) */
  proposedAmount: number | null;
  proposedUnit: string | null;
  message: string | null;
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

  // 카드 하나가 한 화면에 들어오는 게 목표다 — 스크롤을 내려야 버튼이 보이면
  // 지원 현황을 훑는 일이 번거로워진다. 그래서 지역은 오른쪽 위(1시 방향)로 빼서
  // 배지 줄이 여러 줄로 접히지 않게 하고, 안쪽 간격도 한 단계씩 줄였다.
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition-shadow duration-150 active:shadow-none sm:p-5">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${meta.badgeClass}`}>
            {meta.label}
          </span>
          {badge}
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-ink-100/60 px-2.5 py-1 text-[12px] font-semibold text-ink-700">
          <MapPin size={11} />
          {job.region}
        </span>
      </div>

      {job.locationNote && (
        <p className="mb-2 text-[15px] font-bold leading-snug text-ink-900">{job.locationNote}</p>
      )}

      <dl className="mb-2.5 space-y-1.5 text-[13px] text-ink-500">
        <div className="flex gap-2">
          <dt className="flex w-16 shrink-0 items-center gap-1.5 text-ink-300">
            <Calendar size={13} />
            기간
          </dt>
          <dd className="font-medium text-ink-700">
            {job.startDate.slice(2, 10).replace(/-/g, ".")} ~{" "}
            {job.endDate.slice(2, 10).replace(/-/g, ".")} ({days}일)
          </dd>
        </div>
        {(timeRange || visit) && (
          <div className="flex gap-2">
            <dt className="flex w-16 shrink-0 items-center gap-1.5 text-ink-300">
              <Clock size={13} />
              시간
            </dt>
            <dd className="font-medium text-ink-700">
              {[timeRange, visit].filter(Boolean).join(" · ")}
            </dd>
          </div>
        )}
        {recipient && (
          <div className="flex gap-2">
            <dt className="flex w-16 shrink-0 items-center gap-1.5 text-ink-300">
              <User size={13} />
              대상
            </dt>
            <dd className="font-medium text-ink-700">{recipient}</dd>
          </div>
        )}
        {job.budgetAmount && (
          <div className="flex gap-2">
            <dt className="flex w-16 shrink-0 items-center gap-1.5 text-ink-300">
              <Wallet size={13} />
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
              className="rounded-full bg-mint-100 px-2.5 py-1 text-[12px] font-medium text-mint-700"
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
                className="rounded-full bg-ink-100/60 px-2.5 py-1 text-[12px] font-medium text-ink-700"
              >
                {t}
              </span>
            ))}
          {job.conditions.map((c) => (
            <span
              key={c}
              className="rounded-full bg-accent-50 px-2.5 py-1 text-[12px] font-medium text-ink-700"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {job.situation && (
        <p className="mb-2.5 line-clamp-2 text-[13px] leading-relaxed text-ink-500">
          {job.situation}
        </p>
      )}

      {/* 조건 칩과 행동 버튼 사이를 확실히 띄운다 — 붙어 있으면 칩이 버튼의 일부처럼
          읽혀서 "다른 일자리 둘러보기"·"합의서 확인·서명"이 눈에 안 들어온다.
          선까지 그어 정보(위)와 행동(아래)을 시각적으로 분리한다. */}
      {footer && <div className="mt-4 border-t border-ink-100/70 pt-3.5">{footer}</div>}
    </div>
  );
}

function EmptyState({
  text,
  sub,
  action,
}: {
  text: string;
  sub: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-100 bg-ink-100/20 px-6 py-14 text-center">
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-300 shadow-card">
        <Briefcase size={22} />
      </span>
      <p className="text-base font-bold text-ink-700">{text}</p>
      <p className="text-[13px] leading-relaxed text-ink-300">{sub}</p>
      {action && <div className="mt-3 w-full max-w-[240px]">{action}</div>}
    </div>
  );
}

/** 비어 있는 탭에서 "새 일자리"로 데려가는 버튼 */
function BrowseJobsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
    >
      <Search size={16} />
      돌봄 일자리 둘러보기
    </button>
  );
}

export default function SitterJobsPage() {
  const [tab, setTab] = useState<Tab>("open");

  // ?tab=applied|matched|done 으로 들어오면 그 탭을 연다 — 마이페이지 대시보드의
  // "지원 중·매칭·완료" 숫자가 각자 제 탭으로 바로 꽂히게 하기 위한 것.
  //
  // useSearchParams 대신 window.location을 읽는다: 이 라우트는 정적 프리렌더 대상이라
  // useSearchParams를 쓰면 Suspense 경계를 요구해 빌드가 깨진다.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested && TABS.some((t) => t.key === requested)) {
      setTab(requested as Tab);
    }
  }, []);
  const [isSitter, setIsSitter] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [confirmingJob, setConfirmingJob] = useState<JobRequest | null>(null);
  // 역경매 — 지원 현황에서 제안을 고치는 중인 지원 건
  const [editingProposal, setEditingProposal] = useState<MyApplication | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [typeFilter, setTypeFilter] = useState<LocationTypeValue | "">("");
  const [sort, setSort] = useState("recent");
  const [hideClosed, setHideClosed] = useState(true);

  // 네트워크 자체가 끊긴 경우(fetch reject) — 예전엔 isSitter가 null로 남아 로더가
  // 영영 안 사라졌다. 화면은 그리되 배너로 알리고 재시도 버튼을 준다.
  const [loadError, setLoadError] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sort, hideClosed: String(hideClosed) });
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/care-requests/open?${params}`);
      if (res.status === 404) {
        setIsSitter(false);
        return;
      }
      // 404 외의 실패(로그인 만료 401 등)에서 그냥 진행하면 에러 응답을 목록으로 읽어
      // "공고가 하나도 없는 매니저"처럼 보인다. 목록은 건드리지 않고 그대로 둔다.
      if (!res.ok) return;
      setIsSitter(true);
      const data = await res.json();
      setJobs(data.items ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
      setIsSitter((prev) => (prev === null ? true : prev));
    }
  }, [sort, hideClosed, typeFilter]);

  const loadApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/care-request-applications/mine");
      if (!res.ok) return;
      const data = await res.json();
      setApplications(data.items ?? []);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // 지원 버튼 → 확인 시트("내 프로필이 이렇게 보여요" + 제안 사례비·한마디) → 확정 시에만 실제 POST
  async function handleApply(id: string, payload: ApplyPayload) {
    setApplyingId(id);
    const res = await fetch("/api/care-request-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        careRequestId: id,
        proposedAmount: payload.proposedAmount ?? undefined,
        message: payload.message ?? undefined,
      }),
    });
    if (res.ok || res.status === 409) {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, alreadyApplied: true } : j)));
      loadApplications();
      setConfirmingJob(null);
    }
    setApplyingId(null);
  }

  async function handleWithdraw(applicationId: string) {
    await fetch(`/api/care-request-applications/${applicationId}`, { method: "DELETE" });
    loadApplications();
    loadJobs();
  }

  if (isSitter === null) {
    return (
      <MyPageShell>
        <PageLoader compact />
      </MyPageShell>
    );
  }

  if (isSitter === false) {
    return (
      <MyPageShell>
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50 p-8 text-center">
          <p className="mb-3 text-sm text-ink-700">아직 돌보다 매니저로 등록하지 않으셨어요.</p>
          <Link
            href="/mypage/sitter/register"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white transition-all duration-150 hover:bg-primary-600 active:scale-95"
          >
            돌보다 매니저 등록하기
          </Link>
        </div>
      </MyPageShell>
    );
  }

  // 미선정·요청취소도 지원 현황에 함께 보여준다 — 무소식으로 사라지는 것보다
  // "이번엔 다른 분과 진행됐어요"가 낫고, 그 자리에서 새 일자리로 잇는다.
  const applied = applications.filter(
    (a) => a.status === "지원완료" || a.status === "미선정" || a.status === "요청취소"
  );
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
      <h2 className="mb-4 text-xl font-bold text-ink-900">일자리 관리</h2>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-accent-200 bg-accent-100/40 px-4 py-3">
          <p className="text-sm text-ink-700">목록을 불러오지 못했어요. 연결을 확인해주세요.</p>
          <button
            type="button"
            onClick={() => {
              setLoadError(false);
              loadJobs();
              loadApplications();
            }}
            className="min-h-[44px] shrink-0 rounded-lg bg-white px-3 text-sm font-bold text-ink-700 shadow-card transition-all duration-150 active:scale-95"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* px를 줄여 360px(안드로이드 최소 폭)에서도 탭 4개가 한 줄에 들어가게 했다.
          그래도 넘칠 때를 대비해 가로 스크롤은 남기되 스크롤바는 감춘다(no-scrollbar) */}
      <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`min-h-[48px] shrink-0 border-b-2 px-2.5 text-[14px] font-bold transition-all duration-150 active:scale-95 sm:px-4 sm:text-[15px] ${
              tab === t.key
                ? "border-primary-500 text-primary-700"
                : "border-transparent text-ink-300 hover:text-ink-500"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && <span className="ml-1.5 text-[13px]">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {tab === "open" && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors duration-150 active:scale-95 ${
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
                  className={`min-h-[44px] shrink-0 rounded-full px-3.5 text-xs font-bold transition-colors duration-150 active:scale-95 ${
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
                    className={`min-h-[44px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                      typeFilter === ""
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-ink-100 text-ink-500 hover:bg-ink-100/60"
                    }`}
                  >
                    전체
                  </button>
                  {LOCATION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTypeFilter(t.value)}
                      className={`min-h-[44px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                        typeFilter === t.value
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-ink-100 text-ink-500 hover:bg-ink-100/60"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between text-sm text-ink-700">
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
              sub="필터를 바꾸거나, 활동 지역을 넓히면 더 많은 요청을 볼 수 있어요."
              action={
                <Link
                  href="/mypage/sitter/profile"
                  className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
                >
                  <MapPinned size={16} />
                  활동 지역 넓히기
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  badge={
                    <>
                      {job.boosted && (
                        <span className="rounded-full bg-gradient-to-r from-royal-500 to-primary-500 px-2.5 py-1 text-xs font-extrabold text-white">
                          ⚡ 우선 요청
                        </span>
                      )}
                      {job.sitterGenderPref !== "무관" && (
                        <span className="rounded-full bg-royal-50 px-2.5 py-1 text-xs font-semibold text-royal-700">
                          {job.sitterGenderPref} 선호
                        </span>
                      )}
                    </>
                  }
                  footer={
                    <button
                      type="button"
                      disabled={job.alreadyApplied || applyingId === job.id}
                      onClick={() => setConfirmingJob(job)}
                      className={`min-h-[48px] w-full rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98] ${
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

              {/* 목록 끝 — 더 넓게 찾아보도록 안내 */}
              <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 p-5 text-center">
                <p className="mb-1 text-sm font-bold text-ink-900">
                  찾으시는 일자리가 없으신가요?
                </p>
                <p className="mb-3 text-xs leading-relaxed text-ink-500">
                  활동 지역을 넓히면 더 많은 돌봄 요청을 받아볼 수 있어요.
                </p>
                <Link
                  href="/mypage/sitter/profile"
                  className="mx-auto flex min-h-[48px] w-full max-w-[260px] items-center justify-center gap-1.5 rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
                >
                  <MapPinned size={16} />
                  활동 지역 넓히기
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "applied" && (
        <div className="space-y-3">
          {applied.length === 0 ? (
            <EmptyState
              text="아직 지원한 일자리가 없어요"
              sub="마음에 드는 돌봄에 지원하면 여기에서 진행 상황을 볼 수 있어요."
              action={<BrowseJobsButton onClick={() => setTab("open")} />}
            />
          ) : (
            applied.map((a) => (
              <JobCard
                key={a.id}
                job={a.careRequest}
                badge={
                  a.status === "미선정" ? (
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-400">
                      이번엔 다른 분과 진행됐어요
                    </span>
                  ) : a.status === "요청취소" ? (
                    // 보호자가 요청 자체를 거둬들인 경우 — 매니저가 부족해서가 아니다.
                    // 그 구분을 안 해주면 떨어진 것으로 오해한다.
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-400">
                      보호자가 요청을 취소했어요
                    </span>
                  ) : (
                    <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-ink-700">
                      보호자 확인 대기
                    </span>
                  )
                }
                footer={
                  a.status === "미선정" || a.status === "요청취소" ? (
                    // 끝난 건은 사실을 숨기지 않되 다음 행동으로 바로 잇는다 —
                    // 무소식보다 낫고, 여기서 새 일자리로 돌려보내는 게 리텐션이다.
                    <button
                      type="button"
                      onClick={() => setTab("open")}
                      className="min-h-[48px] w-full rounded-xl bg-primary-50 text-sm font-bold text-primary-700 transition-colors duration-150 hover:bg-primary-100 active:scale-[0.98]"
                    >
                      다른 일자리 둘러보기
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {/* 내 제안 — 보호자에게 이렇게 보이고 있다는 확인 */}
                      {(a.proposedAmount != null || a.message) && (
                        <p className="rounded-xl bg-primary-50/60 px-3 py-2 text-[12px] leading-relaxed text-ink-700">
                          내 제안
                          {a.proposedAmount != null &&
                            ` · ${a.proposedUnit === "시간" ? "시간당" : "하루"} ${a.proposedAmount.toLocaleString()}원`}
                          {a.message && ` · “${a.message}”`}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProposal(a)}
                          className="min-h-[48px] flex-1 rounded-xl bg-primary-50 text-sm font-bold text-primary-700 transition-colors duration-150 hover:bg-primary-100 active:scale-[0.98]"
                        >
                          제안 수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWithdraw(a.id)}
                          className="min-h-[48px] flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:bg-ink-100 active:scale-[0.98]"
                        >
                          지원 취소
                        </button>
                      </div>
                    </div>
                  )
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
              action={<BrowseJobsButton onClick={() => setTab("open")} />}
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
                  <div className="space-y-2">
                    {/* 확정 직후 해야 할 일이 서명이라 합의서를 위에 둔다 */}
                    <Link
                      href="/care-request/agreement"
                      className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border-2 border-royal-200 bg-royal-50 text-sm font-bold text-royal-700 transition-colors duration-150 hover:bg-royal-100 active:scale-[0.98]"
                    >
                      <FileSignature size={15} />
                      합의서 확인·서명
                    </Link>
                    <Link
                      href="/care-request/confirmation"
                      className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-mint-200 bg-mint-50 text-sm font-bold text-mint-700 transition-colors duration-150 hover:bg-mint-100 active:scale-[0.98]"
                    >
                      <FileText size={15} />
                      돌봄 확인서 보기
                    </Link>
                    <Link
                      href="/care-request/care-log"
                      className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 text-sm font-bold text-primary-700 transition-colors duration-150 hover:bg-primary-100 active:scale-[0.98]"
                    >
                      <NotebookPen size={15} />
                      돌봄일지 쓰기
                    </Link>
                  </div>
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
              action={<BrowseJobsButton onClick={() => setTab("open")} />}
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
                footer={
                  <Link
                    href="/care-request/care-log"
                    className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 text-sm font-bold text-primary-700 transition-colors duration-150 hover:bg-primary-100 active:scale-[0.98]"
                  >
                    <NotebookPen size={15} />
                    돌봄일지 보기
                  </Link>
                }
              />
            ))
          )}
        </div>
      )}
      {confirmingJob && (
        <ApplyConfirmSheet
          job={confirmingJob}
          applying={applyingId === confirmingJob.id}
          onConfirm={(payload) => handleApply(confirmingJob.id, payload)}
          onClose={() => setConfirmingJob(null)}
        />
      )}
      {editingProposal && (
        <ProposalEditSheet
          application={editingProposal}
          onClose={() => setEditingProposal(null)}
          onSaved={loadApplications}
        />
      )}
    </MyPageShell>
  );
}

// 역경매 재제안 — 보호자 답을 기다리는 동안(지원완료)만 금액·한마디를 고칠 수 있다.
// 확정 뒤에는 서버가 409로 막는다(합의서가 확정 시점 제안을 봉인하므로).
function ProposalEditSheet({
  application,
  onClose,
  onSaved,
}: {
  application: MyApplication;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amountText, setAmountText] = useState(
    application.proposedAmount ? String(application.proposedAmount) : ""
  );
  const [message, setMessage] = useState(application.message ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unitLabel =
    (application.proposedUnit ?? application.careRequest.budgetUnit ?? "일") === "시간"
      ? "시간당"
      : "하루";
  const amount = Number(amountText.replace(/[^0-9]/g, "")) || 0;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/care-request-applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "propose",
          proposedAmount: amount > 0 ? amount : undefined,
          message: message.trim() || undefined,
        }),
      });
      const d = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(d?.error ?? "");
      onSaved();
      onClose();
    } catch (e) {
      setError((e instanceof Error && e.message) || "저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="animate-overlay-in absolute inset-0 bg-ink-900/50 backdrop-blur-[2px]"
      />
      <div className="animate-slide-up relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-hover sm:rounded-3xl sm:p-6">
        <h2 className="mb-1 text-lg font-bold text-ink-900">제안 수정</h2>
        <p className="mb-4 text-xs text-ink-500">
          보호자가 아직 확인 중이라 제안을 바꿀 수 있어요.
        </p>

        <p className="mb-1.5 text-[12px] font-semibold text-ink-500">제안 사례비</p>
        <label className="mb-3 flex items-center gap-2 rounded-xl border border-ink-100 px-3.5 py-2.5 focus-within:border-primary-400">
          <span className="shrink-0 text-[13px] font-semibold text-ink-500">{unitLabel}</span>
          <input
            type="text"
            inputMode="numeric"
            value={amount ? amount.toLocaleString() : ""}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="비워두면 협의로 전달돼요"
            className="min-w-0 flex-1 bg-transparent text-right text-[15px] font-bold text-ink-900 outline-none"
          />
          <span className="shrink-0 text-[13px] text-ink-400">원</span>
        </label>

        <p className="mb-1.5 text-[12px] font-semibold text-ink-500">보호자께 한마디</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 200))}
          rows={2}
          placeholder="이 요청에 맞춰 어떻게 돌볼 수 있는지 짧게"
          className="mb-3 w-full resize-none rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400"
        />

        {error && (
          <p className="mb-3 rounded-xl bg-primary-50 px-3.5 py-2.5 text-xs font-semibold text-primary-700">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[50px] flex-1 rounded-xl border border-ink-100 text-sm font-bold text-ink-500 transition-colors duration-150 hover:bg-ink-100"
          >
            취소
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="min-h-[50px] flex-[2] rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "저장 중..." : "이 제안으로 바꾸기"}
          </button>
        </div>
      </div>
    </div>
  );
}
