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
  ClipboardList,
  Heart,
  HeartHandshake,
} from "lucide-react";
import { useSitterProfileContext } from "@/lib/sitterProfileContext";
import { useMyPageRole } from "@/lib/mypageRoleContext";
import { sitterProgress, sitterLevel } from "@/lib/sitterProgress";
import { useFavorites } from "@/lib/favoritesContext";
import { useCareProfiles, type CareProfileSummary } from "@/lib/careProfileContext";
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
  // 두 역할을 다 가진 계정은 지금 보고 있는 쪽 카드만 본다. 예전엔 매니저로 등록하면
  // 보호자 카드(돌봄 프로필·시작 안내)가 영영 안 보였는데, 매니저도 부모를 모시는
  // 보호자일 수 있다 — 역할 전환으로 양쪽을 다 쓸 수 있게 됐다.
  const { role } = useMyPageRole();
  const { favoriteIds } = useFavorites();
  const { profiles: careProfiles, loaded: careProfilesLoaded } = useCareProfiles();

  const [request, setRequest] = useState<GuardianRequest | null | undefined>(undefined);
  const [applications, setApplications] = useState<MyApplication[] | null>(null);
  const [openJobs, setOpenJobs] = useState<number | null>(null);
  // 상담 신청 내역 — 신청하고 며칠 뒤 "어디에 넣었더라" 하고 돌아오는 사람이 많다.
  // 아직 입소를 정하지 않은 건이 있으면 대시보드에서 먼저 보여준다.
  const [consults, setConsults] = useState<{ status: string | null }[] | null>(null);

  // 예전엔 이 네 가지를 각각 불렀다(care-requests, consult/mine,
  // care-request-applications/mine, care-requests/open?count=1). 페이로드는 다 합쳐
  // 3KB도 안 되는데 왕복마다 1.3~2.6초가 걸렸다 — 서버리스 함수가 각자 깨어나
  // 각자 세션을 검사하고 각자 DB에 붙는 비용이다. 한 번의 왕복으로 합쳤다.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/mypage/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setRequest(d?.careRequest ?? null);
        setConsults(d?.consults ?? []);
        setApplications(d?.applications ?? []);
        setOpenJobs(typeof d?.openJobs === "number" ? d.openJobs : null);
      })
      .catch(() => {
        if (cancelled) return;
        setRequest(null);
        setConsults([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: React.ReactNode[] = [];

  const asGuardian = role === "guardian";
  const asManager = role === "manager";

  /* ---------- 보호자: 진행 중 돌봄 요청 ---------- */
  if (asGuardian && request && (request.status === "OPEN" || request.status === "MATCHED")) {
    const applicantCount = request.applications?.filter((a) => a.status === "지원완료").length ?? 0;
    cards.push(
      <Link
        key="request"
        href="/care-request"
        className="animate-fade-up block rounded-2xl bg-gradient-to-br from-royal-600 via-royal-500 to-royal-400 p-5 text-white shadow-royal transition-transform duration-200 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] sm:p-6"
        style={{ animationDelay: `${cards.length * 70}ms` }}
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
              {/* API의 날짜는 ISO 문자열("2026-08-05T00:00:00.000Z") — 그대로 찍으면
                  카드가 알아볼 수 없는 글자로 깨져 보인다. 날짜 부분만 잘라 쓴다 */}
              {request.region} · {request.startDate.slice(0, 10)} ~ {request.endDate.slice(0, 10)}
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

  /* ---------- 보호자: 진행 중인 상담 ---------- */
  // 입소를 정하지 않은 건이 있을 때만 — 다 끝난 목록을 계속 띄우면 할 일처럼 보인다
  if (asGuardian && consults && consults.length > 0) {
    const pending = consults.filter((c) => c.status !== "입소결정").length;
    const decided = consults.length - pending;
    if (pending > 0) {
      cards.push(
        <Link
          key="consults"
          href="/mypage/consults"
          className="animate-fade-up group flex items-center justify-between gap-3 rounded-2xl border border-royal-100 bg-white p-5 shadow-card transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98] sm:p-6"
          style={{ animationDelay: `${cards.length * 70}ms` }}
        >
          <span className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-500">
              <ClipboardList size={19} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-ink-900">
                상담 신청한 시설 {pending}곳
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">
                {decided > 0
                  ? `${decided}곳은 입소를 정하셨어요 · 나머지 진행 상황을 표시해두세요`
                  : "연락받으셨다면 진행 상황을 표시해두세요"}
              </span>
            </span>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-ink-300 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      );
    }
  }

  /* ---------- 매니저 위젯 ---------- */
  if (asManager && isSitter && profile) {
    const progress = sitterProgress(profile);
    const matched = applications?.filter((a) => a.status === "매칭확정").length ?? 0;
    const completed = applications?.filter((a) => a.status === "돌봄완료").length ?? 0;
    // 등급 판정에는 누적 지원 수를 쓴다("한 번이라도 지원해본 사람"이 기준이라 취소·완료도 포함).
    const applied = applications?.length ?? 0;
    // 화면 숫자는 "지금 답을 기다리는 지원"만 센다. 예전엔 누적 지원 수를 "지원"으로 보여줘서,
    // 이미 완료된 옛 지원 1건이 "지금 1곳에 지원 중"으로 읽혔다(지원 1·완료 1 동시 표시).
    const pending = applications?.filter((a) => a.status === "지원완료").length ?? 0;
    const level = sitterLevel({ completed, matched, applied, profilePercent: progress.percent });

    // 프로필 완성도 — 100%면 숨기고, 미완성일 때만 다음 할 일을 보여준다
    if (progress.percent < 100) {
      cards.push(
        <div
          key="progress"
          className="animate-fade-up rounded-2xl bg-white p-5 shadow-card sm:p-6"
          style={{ animationDelay: `${cards.length * 70}ms` }}
        >
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
              className="flex min-h-[48px] items-center justify-between gap-2 rounded-xl bg-primary-50 px-4 text-[13px] font-semibold text-primary-700 transition-all duration-150 ease-snappy hover:bg-primary-100 active:scale-[0.98]"
            >
              다음 할 일: {progress.nextItem.hint}
              <ChevronRight size={15} className="shrink-0" />
            </Link>
          )}
        </div>
      );
    }

    cards.push(
      <div
        key="activity"
        className="animate-fade-up rounded-2xl bg-white p-5 shadow-card sm:p-6"
        style={{ animationDelay: `${cards.length * 70}ms` }}
      >
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2.5 text-[15px] font-bold text-ink-900">
            {/* 레벨 이모지를 칩으로 감싸 "내 등급"이라는 느낌을 준다 — 숫자 나열보다 먼저 눈에 온다.
                pop으로 살짝 통통 튀며 등장 — 배지·성취감을 주는 자리라 잘 어울린다 */}
            <span
              aria-hidden
              className="animate-pop flex h-9 w-9 items-center justify-center rounded-xl bg-ivory-100 text-lg"
            >
              {level.emoji}
            </span>
            {level.label}
          </p>
          {openJobs !== null && openJobs > 0 && (
            <Link
              href="/mypage/sitter/jobs"
              className="animate-pop flex items-center gap-1.5 rounded-full bg-royal-50 px-3 py-1.5 text-[13px] font-bold text-royal-600 transition-colors duration-150 hover:bg-royal-100 active:scale-95"
            >
              <Briefcase size={13} />새 일자리 {openJobs}건
            </Link>
          )}
        </div>
        {/* 숫자를 누르면 일자리 관리(지원·매칭 내역이 있는 곳)로 — 숫자만 보여주고
            끝나면 "그래서 어디서 보는데?"가 된다 */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            // 숫자마다 제 탭으로 보낸다 — 셋 다 같은 곳으로 가면 눌러도 원하는 목록이
            // 안 열려서 한 번 더 찾아 들어가야 했다
            { label: "지원 중", value: pending, tab: "applied" },
            { label: "매칭", value: matched, tab: "matched" },
            { label: "완료", value: completed, tab: "done" },
          ].map((s) => (
            <Link
              key={s.label}
              href={`/mypage/sitter/jobs?tab=${s.tab}`}
              className="rounded-xl bg-ivory-100 py-3.5 text-center transition-all duration-150 ease-snappy hover:-translate-y-0.5 hover:bg-primary-50 hover:shadow-soft active:translate-y-0 active:scale-[0.97]"
            >
              <p className="text-xl font-extrabold text-ink-900">{s.value}</p>
              <p className="mt-0.5 text-[12px] font-medium text-ink-400">{s.label}</p>
            </Link>
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
        className="animate-fade-up group flex items-center justify-between gap-3 rounded-2xl border-2 border-royal-200 bg-royal-50/60 p-4 shadow-card transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:border-royal-300 hover:bg-royal-50 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98] sm:p-5"
        style={{ animationDelay: `${cards.length * 70}ms` }}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-royal-500 shadow-soft transition-transform duration-200 group-hover:scale-110">
            <BookOpen size={18} />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-ink-900">매니저 가이드</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">
              선택받는 자기소개 쓰는 법 외 4편
            </span>
          </span>
        </span>
        <ChevronRight
          size={18}
          className="shrink-0 text-ink-300 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    );
  }

  /* ---------- 보호자: 돌봄 프로필 — 있으면 맞춤 검색, 없으면 만들기 유도 ---------- */
  // 예전엔 `isSitter === false`가 조건이라 매니저 계정에는 영영 안 보였다.
  // 지금은 역할 전환이 있으니 "보호자 화면일 때"가 정확한 조건이다.
  if (asGuardian && careProfilesLoaded) {
    if (careProfiles.length > 0) {
      const p = careProfiles[0];
      const cta = profileCta(p);
      const summary = [p.ageBand, p.mobilityLevel].filter(Boolean).join(" · ");
      cards.push(
        <div
          key="care-profile"
          className="animate-fade-up rounded-2xl bg-white p-5 shadow-card sm:p-6"
          style={{ animationDelay: `${cards.length * 70}ms` }}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[15px] font-bold text-ink-900">
              <HeartHandshake size={16} className="text-primary-500" />
              {p.relation} 보호자 프로필
            </p>
            <Link
              href="/mypage/care-profile"
              // 26×23이던 걸 44px로 — 글자 크기는 그대로, 누를 면적만 넓힌다
              className="-my-3 -mr-2 inline-flex min-h-[44px] shrink-0 items-center px-2 text-[12px] font-semibold text-ink-300 transition-colors duration-150 hover:text-ink-500 active:text-ink-700"
            >
              관리
            </Link>
          </div>
          {summary && <p className="mb-3 text-[13px] text-ink-500">{summary}</p>}
          {p.conditions.length > 0 && (
            <div className="mb-3.5 flex flex-wrap gap-1.5">
              {p.conditions.slice(0, 4).map((c, i) => (
                <span
                  key={c}
                  className="animate-fade-up rounded-full bg-ivory-100 px-2.5 py-1 text-[12px] font-medium text-ink-500"
                  style={{ animationDelay: `${i * 50 + 100}ms` }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          <Link
            href={cta.href}
            className="group flex min-h-[48px] items-center justify-between gap-2 rounded-xl bg-primary-50 px-4 text-[13px] font-semibold text-primary-700 transition-all duration-200 ease-snappy hover:bg-primary-100 active:scale-[0.98]"
          >
            {cta.label}
            <ArrowRight
              size={14}
              className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      );
    } else {
      cards.push(
        <Link
          key="care-profile-empty"
          href="/mypage/care-profile"
          className="animate-fade-up group flex items-center justify-between gap-3 rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-4 transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 active:translate-y-0 active:scale-[0.98]"
          style={{ animationDelay: `${cards.length * 70}ms` }}
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-500 shadow-soft transition-transform duration-200 group-hover:scale-110">
              <HeartHandshake size={17} />
            </span>
            <span>
              <span className="block text-[15px] font-bold text-ink-900">
                보호자 프로필 만들기
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">
                한 번 저장하면 시설 찾기·돌봄 요청이 훨씬 빨라져요
              </span>
            </span>
          </span>
          <ChevronRight
            size={16}
            className="shrink-0 text-ink-300 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      );
    }
  }

  /* ---------- 보호자: 요청이 없을 때 시작 안내 ---------- */
  if (asGuardian && request === null) {
    cards.push(
      <div
        key="start"
        className="animate-fade-up rounded-2xl bg-white p-5 shadow-card sm:p-6"
        style={{ animationDelay: `${cards.length * 70}ms` }}
      >
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
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-royal-500 px-4 text-sm font-bold text-white shadow-royal transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:shadow-royal-hover active:translate-y-0 active:scale-[0.98]"
          >
            돌봄 요청하기
            <ArrowRight size={14} />
          </Link>
          {favoriteIds.length > 0 && (
            <Link
              href="/favorites"
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-ink-100 bg-white px-4 text-sm font-bold text-ink-700 transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-ink-100 active:translate-y-0 active:scale-[0.98]"
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
