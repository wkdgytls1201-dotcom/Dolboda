"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Circle,
  Heart,
  HeartHandshake,
} from "lucide-react";
import { useSitterProfileContext } from "@/lib/sitterProfileContext";
import { sitterProgress, sitterLevel } from "@/lib/sitterProgress";
import { useFavorites } from "@/lib/favoritesContext";

interface GuardianRequest {
  id: string;
  status: "OPEN" | "MATCHED" | "COMPLETED" | string;
  region: string;
  startDate: string;
  endDate: string;
  applications?: { id: string; status: string }[];
}

interface MyApplication {
  status: string;
}

// 마이페이지 상단 대시보드 — 로그인한 사람이 "지금 뭘 하면 되는지"를 한눈에 보여준다.
// 보호자: 진행 중인 돌봄 요청 상태 / 매니저: 프로필 완성도·활동 레벨·새 일자리.
export function MyPageDashboard() {
  const { profile, isSitter } = useSitterProfileContext();
  const { favoriteIds } = useFavorites();

  const [request, setRequest] = useState<GuardianRequest | null | undefined>(undefined);
  const [applications, setApplications] = useState<MyApplication[] | null>(null);
  const [openJobs, setOpenJobs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 보호자용: 내 돌봄 요청 (없으면 404)
    fetch("/api/care-requests")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setRequest(d && !d.error ? d : null);
      })
      .catch(() => {
        if (!cancelled) setRequest(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 매니저용: 지원 현황·새 일자리 수 (매니저로 확인된 후에만 요청)
  useEffect(() => {
    if (!isSitter) return;
    let cancelled = false;
    fetch("/api/care-request-applications/mine")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setApplications(d?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setApplications([]);
      });
    fetch("/api/care-requests/open?sort=latest")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setOpenJobs(Array.isArray(d?.items) ? d.items.length : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSitter]);

  const cards: React.ReactNode[] = [];

  /* ---------- 보호자: 진행 중 돌봄 요청 ---------- */
  if (request && (request.status === "OPEN" || request.status === "MATCHED")) {
    const applicantCount = request.applications?.filter((a) => a.status === "지원완료").length ?? 0;
    cards.push(
      <Link
        key="request"
        href="/care-request"
        className="block rounded-2xl bg-gradient-to-br from-royal-500 to-royal-600 p-5 text-white shadow-royal transition-transform hover:-translate-y-0.5"
      >
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-white/80">
          <HeartHandshake size={13} />
          진행 중인 돌봄 요청
        </p>
        {request.status === "OPEN" ? (
          <>
            <p className="text-lg font-extrabold leading-snug">
              {applicantCount > 0
                ? `지원자 ${applicantCount}명이 기다리고 있어요`
                : "매니저들의 지원을 기다리고 있어요"}
            </p>
            <p className="mt-1 text-xs text-white/70">
              {request.region} · {request.startDate} ~ {request.endDate}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-extrabold leading-snug">돌봄이 진행 중이에요</p>
            <p className="mt-1 text-xs text-white/70">돌봄 확인서와 진행 상황을 확인해 보세요</p>
          </>
        )}
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold">
          {request.status === "OPEN" && applicantCount > 0 ? "지원자 확인하기" : "요청 관리"}
          <ArrowRight size={12} />
        </span>
      </Link>
    );
  }

  /* ---------- 매니저 위젯 ---------- */
  if (isSitter && profile) {
    const progress = sitterProgress(profile);
    const matched = applications?.filter((a) => a.status === "매칭확정").length ?? 0;
    const completed = applications?.filter((a) => a.status === "돌봄완료").length ?? 0;
    const applied = applications?.length ?? 0;
    const level = sitterLevel(completed, matched);

    // 프로필 완성도 — 100%면 숨기고, 미완성일 때만 다음 할 일을 보여준다
    if (progress.percent < 100) {
      cards.push(
        <div key="progress" className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-ink-900">프로필 완성도</p>
            <p className="text-sm font-extrabold text-primary-600">{progress.percent}%</p>
          </div>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-primary-400 to-peach-400 transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {progress.items.map((item) => (
              <span
                key={item.key}
                className={`flex items-center gap-1.5 text-xs ${
                  item.done ? "text-ink-500" : "font-semibold text-ink-900"
                }`}
              >
                {item.done ? (
                  <CheckCircle2 size={13} className="shrink-0 text-mint-500" />
                ) : (
                  <Circle size={13} className="shrink-0 text-ink-200" />
                )}
                {item.label}
              </span>
            ))}
          </div>
          {progress.nextItem && (
            <Link
              href={progress.nextItem.href}
              className="flex items-center justify-between rounded-xl bg-primary-50 px-3.5 py-2.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100"
            >
              다음 할 일: {progress.nextItem.hint}
              <ChevronRight size={14} className="shrink-0" />
            </Link>
          )}
        </div>
      );
    }

    cards.push(
      <div key="activity" className="rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
            <span aria-hidden>{level.emoji}</span>
            {level.label}
          </p>
          {openJobs !== null && openJobs > 0 && (
            <Link
              href="/mypage/sitter/jobs"
              className="flex items-center gap-1 rounded-full bg-royal-50 px-2.5 py-1 text-xs font-bold text-royal-600 transition-colors hover:bg-royal-100"
            >
              <Briefcase size={12} />새 일자리 {openJobs}건
            </Link>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "지원", value: applied },
            { label: "매칭", value: matched },
            { label: "완료", value: completed },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-ink-100/40 py-2.5 text-center">
              <p className="text-lg font-extrabold text-ink-900">{s.value}</p>
              <p className="text-[11px] text-ink-400">{s.label}</p>
            </div>
          ))}
        </div>
        {level.next && <p className="mt-2.5 text-[11px] text-ink-400">💡 {level.next}</p>}
      </div>
    );

    cards.push(
      <Link
        key="tips"
        href="/mypage/sitter/tips"
        className="flex items-center justify-between rounded-2xl border border-royal-100 bg-royal-50/60 p-4 transition-colors hover:bg-royal-50"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-royal-500 shadow-soft">
            <BookOpen size={16} />
          </span>
          <span>
            <span className="block text-sm font-bold text-ink-900">매니저 가이드</span>
            <span className="block text-xs text-ink-500">선택받는 자기소개 쓰는 법 외 4편</span>
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-ink-300" />
      </Link>
    );
  }

  /* ---------- 보호자: 요청이 없을 때 시작 안내 ---------- */
  if (request === null && !isSitter) {
    cards.push(
      <div key="start" className="rounded-2xl bg-white p-5 shadow-card">
        <p className="mb-1 text-sm font-bold text-ink-900">아직 진행 중인 돌봄 요청이 없어요</p>
        <p className="mb-3 text-xs leading-relaxed text-ink-500">
          병원 간병, 자택 돌봄, 가사 돌봄이 필요하면 요청을 올려보세요. 돌보다 매니저들이
          지원하면 프로필을 보고 직접 고를 수 있어요.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/care-request"
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-royal-500 px-4 text-sm font-bold text-white shadow-royal transition-transform hover:-translate-y-0.5"
          >
            돌봄 요청하기
            <ArrowRight size={14} />
          </Link>
          {favoriteIds.length > 0 && (
            <Link
              href="/favorites"
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-ink-100 bg-white px-4 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
            >
              <Heart size={14} className="text-accent-500" />
              관심시설 {favoriteIds.length}곳
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (cards.length === 0) return null;

  return <div className="mb-6 space-y-3">{cards}</div>;
}
