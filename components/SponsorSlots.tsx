import { MapPin, ChevronRight } from "lucide-react";
import { FACILITY_TYPE_LABEL, type FacilityType } from "@/lib/types";
import type { SponsorFacility } from "@/lib/sponsor";
import { AdImpressionBeacon, TrackedLink } from "./AdTracking";

// 스폰서(광고) 노출 자리 — 지역 페이지의 일반 목록 위에 붙는 분리 섹션.
//
// 카드는 서버 마크업 그대로 두고(SEO에 유리, 가볍다), 노출·클릭 기록만 작은 클라이언트
// 조각(AdTracking.tsx)에 맡긴다 — 유료 시설의 월간 성과 보고서가 이 숫자로 채워진다.
// 카드 모양은 FacilityLinkList와 맞추되 배경·라벨로 광고 영역임을 구분한다
// — 표시광고법상 광고는 광고임을 알 수 있어야 한다.
export function SponsorSlots({
  facilities,
  regionLabel,
}: {
  facilities: SponsorFacility[];
  regionLabel?: string;
}) {
  if (facilities.length === 0) return null;

  return (
    <section
      aria-label="광고"
      className="mb-6 rounded-2xl border border-accent-200/70 bg-accent-50/40 p-3.5"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-700">
          {regionLabel ? `${regionLabel} 스폰서 시설` : "스폰서 시설"}
        </h2>
        <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[11px] font-bold text-white">
          광고
        </span>
      </div>

      <ul className="space-y-2">
        {facilities.map((f) => (
          <li key={f.id}>
            <AdImpressionBeacon facilityId={f.id} kind="sponsor" />
            <TrackedLink
              href={`/facility/${f.id}`}
              facilityId={f.id}
              kind="sponsor"
              className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card"
            >
              <span className="min-w-0 flex-1">
                <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-ink-900">{f.name}</span>
                  {f.grade != null && (
                    <span className="rounded-full bg-royal-50 px-2 py-0.5 text-[11px] font-bold text-royal-700">
                      {f.grade}등급
                    </span>
                  )}
                  <span className="rounded-full bg-ink-100/60 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                    {FACILITY_TYPE_LABEL[f.facilityType as FacilityType] ?? "요양시설"}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-xs text-ink-500">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{f.address}</span>
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-ink-300" />
            </TrackedLink>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-300">
        시설이 비용을 지불하고 노출되는 광고예요.
      </p>
    </section>
  );
}
