"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Info, Users, TrendingUp } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";
import { FACILITY_TYPE_LABEL, type FacilityType } from "@/lib/types";
import { workLevel } from "@/lib/workIndex";
import { REGIONS } from "@/lib/regions";

interface WorkplaceItem {
  id: string;
  name: string;
  address: string;
  facilityType: FacilityType;
  grade: number | null;
  total: number;
  workloadRatio: number | null;
  retentionRate: number | null;
  careWorkers: number | null;
  areas: { key: string; label: string; score: number | null }[];
}

export default function WorkplacesPage() {
  const [items, setItems] = useState<WorkplaceItem[] | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = active ? `/api/sitter/workplaces?region=${encodeURIComponent(active)}` : "/api/sitter/workplaces";
    setItems(null);
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setItems(d.items ?? []);
        if (d.regions?.length) setRegions(d.regions);
      })
      .catch(() => setError("정보를 불러오지 못했어요."));
  }, [active]);

  return (
    <MyPageShell>
      <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-ink-900">
        <Building2 size={22} className="text-mint-600" />
        일하기 좋은 시설
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-ink-500">
        내 활동 지역의 시설을 <strong className="text-ink-700">근무환경 지수</strong> 순으로
        보여드려요. 요양보호사 1인당 어르신 수와 근속률 등을 돌보다가 자체 설계한 기준으로
        계산한 값이에요.
      </p>

      {/* 지역 탭은 전국 시/도 전체를 보여준다 — 예전엔 본인 활동 지역(최대 10개)만 나와서
          나머지 지역은 고를 수도, 존재를 알 수도 없었다. 내 활동 지역을 앞에 두고 점(·)으로
          표시해 구분하되, 다른 지역도 눌러서 둘러볼 수 있다.
          가로 스크롤 대신 줄바꿈 — 뒤쪽 지역이 화면 밖으로 밀려 안 보이는 문제 방지. */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActive(null)}
          className={`min-h-[44px] rounded-full px-3.5 text-xs font-bold transition-colors ${
            active === null ? "bg-mint-600 text-white" : "bg-white text-ink-500 shadow-card"
          }`}
        >
          내 활동 지역
        </button>
        {[...regions, ...REGIONS.filter((r) => !regions.includes(r))].map((r) => {
          const mine = regions.includes(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => setActive(r)}
              className={`min-h-[44px] rounded-full px-3.5 text-xs font-bold transition-colors ${
                active === r
                  ? "bg-mint-600 text-white"
                  : mine
                  ? "bg-mint-50 text-mint-700 ring-1 ring-inset ring-mint-200"
                  : "bg-white text-ink-500 shadow-card"
              }`}
            >
              {mine ? `${r} ·` : r}
            </button>
          );
        })}
      </div>

      {error && <p className="rounded-2xl bg-ink-100/40 p-4 text-sm text-ink-500">{error}</p>}
      {!error && items === null && <PageLoader compact />}

      {items && items.length === 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <p className="mb-1 text-sm font-bold text-ink-900">아직 보여드릴 시설이 없어요</p>
          <p className="text-xs leading-relaxed text-ink-500">
            활동 지역을 등록하면 그 지역의 시설을 근무환경 지수 순으로 보여드려요.
          </p>
          <Link
            href="/mypage/sitter/profile"
            className="mt-3 inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-primary-500 px-4 text-sm font-bold text-white"
          >
            활동 지역 설정하기
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <>
          <ol className="space-y-3">
            {items.map((item, i) => {
              const level = workLevel(item.total);
              return (
                <li key={item.id}>
                  <Link
                    href={`/facility/${item.id}`}
                    className="block rounded-2xl bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ivory-100 text-[13px] font-extrabold text-ink-500">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-ink-900">{item.name}</p>
                        <p className="mt-0.5 truncate text-[13px] text-ink-400">
                          {FACILITY_TYPE_LABEL[item.facilityType]} · {item.address}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xl font-extrabold leading-none text-ink-900">
                          {item.total}
                        </p>
                        <span
                          className={`mt-1.5 inline-block rounded-full px-2.5 py-1 text-[12px] font-bold ${level.tone}`}
                        >
                          {level.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.workloadRatio != null && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-3 py-1.5 text-[12px] font-semibold text-mint-700">
                          <Users size={13} />1인당 {item.workloadRatio}명
                        </span>
                      )}
                      {item.retentionRate != null && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-3 py-1.5 text-[12px] font-semibold text-royal-600">
                          <TrendingUp size={13} />
                          1년+ 근속 {item.retentionRate}%
                        </span>
                      )}
                      {item.careWorkers != null && (
                        <span className="rounded-full bg-ink-100/60 px-3 py-1.5 text-[12px] text-ink-500">
                          요양보호사 {item.careWorkers}명
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 flex gap-3 rounded-2xl bg-ink-100/40 p-5">
            <Info size={16} className="mt-0.5 shrink-0 text-ink-300" />
            <p className="text-[13px] leading-relaxed text-ink-500">
              공공데이터(인력·근속·정원)로 계산한 참고 지표예요. 실제 근무 조건과 급여는 시설마다
              다르니 지원 전 직접 확인해 주세요. 채용 공고가 아니며, 돌보다가 채용을 중개하지
              않아요.{" "}
              <Link href="/data-policy" className="font-semibold text-ink-700 underline">
                계산 방식 보기
              </Link>
            </p>
          </div>
        </>
      )}
    </MyPageShell>
  );
}
