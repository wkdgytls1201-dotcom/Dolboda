"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { FACILITY_TYPE_LABEL, FacilityType } from "@/lib/types";
import { HeroBanner, type HeroSlide } from "./HeroBanner";
import { InfoTooltip } from "./InfoTooltip";
import { TOOLTIPS } from "@/lib/tooltips";

const CHIPS: FacilityType[] = [
  "NURSING_HOSPITAL",
  "NURSING_HOME",
  "DAY_NIGHT_CARE",
  "HOME_CARE",
  "SILVER_TOWN",
];

export function SearchHero({ heroSlides }: { heroSlides: HeroSlide[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // 히어로가 첫 화면을 다 차지해 아래 시설 목록의 존재를 모르는 문제 —
  // 스크롤을 시작하기 전까지만 하단에 "더 있어요" 힌트를 띄운다(등급테스트 intro와 같은 패턴).
  const [showScrollHint, setShowScrollHint] = useState(true);
  useEffect(() => {
    const onScroll = () => setShowScrollHint(window.scrollY < 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/search?${params.toString()}`);
  }

  function handleChip(type: FacilityType) {
    router.push(`/search?type=${type}`);
  }

  return (
    <section className="bg-hero-gradient px-4 pb-16 pt-8 sm:pt-10">
      <div className="mx-auto max-w-3xl text-center">
        <span className="mb-4 inline-block rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-primary-700 shadow-sm">
          공공데이터 기반 요양시설 정보
        </span>
        {/* H1에 핵심 검색어(요양원·요양병원)를 담는다 — 감성 문구만 있으면 검색엔진이
            페이지 주제를 못 읽는다. break-keep으로 모바일에서 어절 경계 줄바꿈. */}
        <h1 className="break-keep text-3xl font-extrabold leading-snug text-ink-900 sm:text-5xl">
          부모님께 맞는 요양원·요양병원,
          <br />
          <span className="text-primary-500">어디에 모시겠어요?</span>
        </h1>
        <p className="mt-4 text-base text-ink-500 sm:text-lg">
          평가등급부터 비급여비용, 인력현황까지
          <br className="sm:hidden" />
          {" "}— 우리 지역 요양병원·요양시설을 한눈에
        </p>
      </div>

      <div className="relative mx-auto mt-5 max-w-4xl px-0 sm:px-4">
        <HeroBanner slides={heroSlides} />

        {/* 모바일은 배너 아래로 살짝 띄우기만 한다 — 겹치게 하면 배너 하단 캡션(시설명·주소)이
            가려진다. 데스크톱은 배너 세로폭이 넉넉해서 기존처럼 살짝 겹쳐도 안 가려진다. */}
        {/* 검색바는 한 줄 컴팩트 — 히어로가 화면을 다 차지하면 아래 시설 목록의
            존재를 모른다. 줄인 만큼 아래 "더 있어요" 힌트로 스크롤을 유도한다. */}
        <form
          onSubmit={handleSubmit}
          className="relative z-10 mx-auto mt-3 flex h-12 max-w-xl items-center gap-1.5 rounded-2xl bg-white px-2 shadow-soft sm:-mt-7"
        >
          <Search size={18} className="ml-1.5 shrink-0 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="지역, 시설명으로 검색"
            className="h-full w-full bg-transparent px-1 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none sm:text-base"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white transition hover:scale-105 hover:bg-primary-600 active:scale-95"
          >
            검색
          </button>
        </form>
      </div>

      <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
        {CHIPS.map((type) => (
          <button
            key={type}
            onClick={() => handleChip(type)}
            className="rounded-full border border-ink-100 bg-white/80 px-4 py-2 text-sm font-medium text-ink-700 transition hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 hover:shadow-card active:translate-y-0 active:scale-95"
          >
            {FACILITY_TYPE_LABEL[type]}
          </button>
        ))}
        <InfoTooltip text={TOOLTIPS.facilityTypes} />
      </div>

      {/* 아래에 내 주변 시설·통계가 이어진다는 신호 — 히어로가 첫 화면을 다 차지해
          아래 내용의 존재를 모르는 문제. 흐름 안에 두면 그것조차 화면 밖이라(실측 863px),
          스크롤 전까지만 탭바 위에 고정으로 띄우고 내리기 시작하면 치운다. */}
      {showScrollHint && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[72px] z-30 flex justify-center pb-2 sm:hidden">
          <span className="flex items-center gap-1 rounded-full bg-ink-900/85 px-3.5 py-2 text-xs font-semibold text-white shadow-card backdrop-blur">
            아래로 내려 시설을 둘러보세요
            <ChevronDown size={14} className="animate-bounce" aria-hidden />
          </span>
        </div>
      )}
    </section>
  );
}
