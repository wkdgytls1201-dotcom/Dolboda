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
import { useCareProfiles, type CareProfileSummary } from "@/lib/useCareProfiles";
import { ltcGuideFor } from "@/lib/ltcGuide";

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

// 돌봄 프로필의 상태에서 맞춤 검색 링크를 만든다.
// 우선순위: 질환·거동(구체적 필요) → 장기요양등급(이용 가능 급여) → 일반 검색.
function profileCta(p: CareProfileSummary): { label: string; href: string } {
  if (p.conditions.includes("치매·인지저하")) {
    return {
      label: "인지·치매 예방 프로그램 있는 시설 보기",
      href: "/search?programTags=cognitive",
    };
  }
  if (
    p.mobilityLevel === "거의 누워 지냄" ||
    p.mobilityLevel === "휠체어 이용" ||
    p.conditions.includes("뇌졸중 후유증")
  ) {
    return { label: "재활 치료 프로그램 있는 시설 보기", href: "/search?programTags=therapy" };
  }
  // 등급을 알고 있으면 그 등급으로 이용 가능한 서비스로 안내 (등급 모름 → 등급테스트)
  const guide = ltcGuideFor(p.ltcGrade);
  if (guide?.cta) return guide.cta;
  return { label: "시설 찾아보기", href: "/search" };
}

// 마이페이지 상단 대시보드 — 로그인한 사람이 "지금 뭘 하면 되는지"를 한눈에 보여준다.
// 보호자: 진행 중인 돌봄 요청 상태 / 매니저: 프로필 완성도·활동 레벨·새 일자리.
export function MyPageDashboard() {
  const { profile, isSitter } = useSitterProfileContext();
  const { favoriteIds } = useFavorites();
  const { profiles: careProfiles, loaded: careProfilesLoaded } = useCareProfiles();

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
    // 배지에 쓸 숫자만 받는다(count=1) — 예전엔 공고 100건을 통째로 받아 length를 셌다
    fetch("/api/care-requests/open?count=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setOpenJobs(typeof d?.count === "number" ? d.count : null);
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
        className="block rounded-2xl bg-gradient-to-br from-royal-500 to-royal-600 p-5 text-white shadow-royal transition-transform hover:-translate-y-0.5 sm:p-6"
      >
        <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-white/80">
          <HeartHandshake size={14} />
          진행 중인 돌봄 요청
        </p>
        {request.status === "OPEN" ? (
          <>
            <p className="text-lg font-extrabold leading-snug">
              {applicantCount > 0
                ? `지원자 ${applicantCount}명이 기다리고 있어요`
                : "매니저들의 지원을 기다리고 있어요"}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
              {request.region} · {request.startDate} ~ {request.endDate}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-extrabold leading-snug">돌봄이 진행 중이에요</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">돌봄 확인서와 진행 상황을 확인해 보세요</p>
          </>
        )}
        <span className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white/20 px-4 text-[13px] font-bold">
          {request.status === "OPEN" && applicantCount > 0 ? "지원자 확인하기" : "요청 관리"}
          <ArrowRight size={13} />
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
    const level = sitterLevel({ completed, matched, applied, profilePercent: progress.percent });

    // 프로필 완성도 — 100%면 숨기고, 미완성일 때만 다음 할 일을 보여준다
    if (progress.percent < 100) {
      cards.push(
        <div key="progress" className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[15px] font-bold text-ink-900">프로필 완성도</p>
            <p className="text-base font-extrabold text-primary-600">{progress.percent}%</p>
          </div>
          <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-primary-400 to-peach-400 transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-x-2 gap-y-2.5">
            {progress.items.map((item) => (
              <span
                key={item.key}
                className={`flex items-center gap-1.5 text-[13px] ${
                  item.done ? "text-ink-500" : "font-semibold text-ink-900"
                }`}
              >
                {item.done ? (
                  <CheckCircle2 size={15} className="shrink-0 text-mint-500" />
                ) : (
                  <Circle size={15} className="shrink-0 text-ink-200" />
                )}
                {item.label}
              </span>
            ))}
          </div>
          {progress.nextItem && (
            <Link
              href={progress.nextItem.href}
              className="flex min-h-[48px] items-center justify-between gap-2 rounded-xl bg-primary-50 px-4 text-[13px] font-semibold text-primary-700 transition-colors hover:bg-primary-100"
            >
              다음 할 일: {progress.nextItem.hint}
              <ChevronRight size={15} className="shrink-0" />
            </Link>
          )}
        </div>
      );
    }

    cards.push(
      <div key="activity" className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2.5 text-[15px] font-bold text-ink-900">
            {/* 레벨 이모지를 칩으로 감싸 "내 등급"이라는 느낌을 준다 — 숫자 나열보다 먼저 눈에 온다 */}
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-ivory-100 text-lg"
            >
              {level.emoji}
            </span>
            {level.label}
          </p>
          {openJobs !== null && openJobs > 0 && (
            <Link
              href="/mypage/sitter/jobs"
              className="flex items-center gap-1.5 rounded-full bg-royal-50 px-3 py-1.5 text-[13px] font-bold text-royal-600 transition-colors hover:bg-royal-100"
            >
              <Briefcase size={13} />새 일자리 {openJobs}건
            </Link>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "지원", value: applied },
            { label: "매칭", value: matched },
            { label: "완료", value: completed },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-ivory-100 py-3.5 text-center">
              <p className="text-xl font-extrabold text-ink-900">{s.value}</p>
              <p className="mt-0.5 text-[12px] font-medium text-ink-400">{s.label}</p>
            </div>
          ))}
        </div>
        {level.next && (
          <p className="mt-3.5 text-[12px] leading-relaxed text-ink-400">💡 {level.next}</p>
        )}
      </div>
    );

    cards.push(
      <Link
        key="tips"
        href="/mypage/sitter/tips"
        className="flex items-center justify-between gap-3 rounded-2xl border border-royal-100 bg-royal-50/60 p-4 transition-colors hover:bg-royal-50 sm:p-5"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-royal-500 shadow-soft">
            <BookOpen size={18} />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-ink-900">매니저 가이드</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">
              선택받는 자기소개 쓰는 법 외 4편
            </span>
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-300" />
      </Link>
    );
  }

  /* ---------- 보호자: 돌봄 프로필 — 있으면 맞춤 검색, 없으면 만들기 유도 ---------- */
  if (!isSitter && careProfilesLoaded) {
    if (careProfiles.length > 0) {
      const p = careProfiles[0];
      const cta = profileCta(p);
      const summary = [p.ageBand, p.mobilityLevel].filter(Boolean).join(" · ");
      cards.push(
        <div key="care-profile" className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[15px] font-bold text-ink-900">
              <HeartHandshake size={16} className="text-primary-500" />
              {p.relation} 돌봄 프로필
            </p>
            <Link
              href="/mypage/care-profile"
              className="text-[12px] font-semibold text-ink-300 hover:text-ink-500"
            >
              관리
            </Link>
          </div>
          {summary && <p className="mb-3 text-[13px] text-ink-500">{summary}</p>}
          {p.conditions.length > 0 && (
            <div className="mb-3.5 flex flex-wrap gap-1.5">
              {p.conditions.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-ivory-100 px-2.5 py-1 text-[12px] font-medium text-ink-500"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          <Link
            href={cta.href}
            className="flex min-h-[48px] items-center justify-between gap-2 rounded-xl bg-primary-50 px-4 text-[13px] font-semibold text-primary-700 transition-colors hover:bg-primary-100"
          >
            {cta.label}
            <ArrowRight size={14} className="shrink-0" />
          </Link>
        </div>
      );
    } else {
      cards.push(
        <Link
          key="care-profile-empty"
          href="/mypage/care-profile"
          className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-4 transition-colors hover:bg-primary-50"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-500 shadow-soft">
              <HeartHandshake size={17} />
            </span>
            <span>
              <span className="block text-[15px] font-bold text-ink-900">
                어르신 돌봄 프로필 만들기
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">
                한 번 저장하면 시설 찾기·돌봄 요청이 훨씬 빨라져요
              </span>
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-ink-300" />
        </Link>
      );
    }
  }

  /* ---------- 보호자: 요청이 없을 때 시작 안내 ---------- */
  if (request === null && !isSitter) {
    cards.push(
      <div key="start" className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
        <p className="mb-1.5 text-[15px] font-bold text-ink-900">
          아직 진행 중인 돌봄 요청이 없어요
        </p>
        <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
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

  return <div className="mb-7 space-y-3.5">{cards}</div>;
}
