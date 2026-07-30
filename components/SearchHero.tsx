"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { FACILITY_TYPE_LABEL, FacilityType } from "@/lib/types";
import { HeroBanner } from "./HeroBanner";
import { InfoTooltip } from "./InfoTooltip";
import { TOOLTIPS } from "@/lib/tooltips";

const CHIPS: FacilityType[] = [
  "NURSING_HOSPITAL",
  "NURSING_HOME",
  "DAY_NIGHT_CARE",
  "HOME_CARE",
  "SILVER_TOWN",
];

export function SearchHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

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
        <h1 className="text-3xl font-extrabold leading-snug text-ink-900 sm:text-5xl">
          소중한 부모님,
          <br />
          <span className="text-primary-500">어디에 모시겠어요?</span>
        </h1>
        <p className="mt-4 text-base text-ink-500 sm:text-lg">
          평가등급부터 비급여비용, 인력현황까지 — 우리 지역 요양병원·요양시설을 한눈에
        </p>
      </div>

      <div className="relative mx-auto mt-5 max-w-4xl px-0 sm:px-4">
        <HeroBanner />

        <form
          onSubmit={handleSubmit}
          className="relative z-10 mx-auto -mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-soft sm:-mt-7"
        >
          <Search size={20} className="ml-2 shrink-0 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="지역, 시설명으로 검색 (예: 강남구, 서울행복요양병원)"
            className="w-full bg-transparent px-1 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none sm:text-base"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white transition hover:scale-105 hover:bg-primary-600 active:scale-95"
          >
            검색
          </button>
        </form>
      </div>

      <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-2">
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
    </section>
  );
}
