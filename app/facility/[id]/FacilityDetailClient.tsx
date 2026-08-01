"use client";

import { useEffect, useRef, useState } from "react";
import type { Facility } from "@/lib/types";
import {
  Phone,
  Share2,
  Navigation,
  Siren,
  Building2,
  HeartHandshake,
  Heart,
  Stethoscope,
  BedDouble,
  UtensilsCrossed,
  Car,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useFavorites } from "@/lib/favoritesContext";
import { canViewFacility, registerFacilityView } from "@/lib/viewLimit";
import { FacilityPhotoGallery } from "@/components/FacilityPhotoGallery";
import { FACILITY_TYPE_LABEL, isHospital, type CareProgram } from "@/lib/types";
import { GradeBadge, TypeBadge } from "@/components/GradeBadge";
import { DetailSection } from "@/components/DetailSection";
import { KakaoMap } from "@/components/KakaoMap";
import { KakaoRoadview } from "@/components/KakaoRoadview";
import { ConsultModal } from "@/components/ConsultModal";
import { DataSourceNote } from "@/components/DataSourceNote";
import { FacilityCard } from "@/components/FacilityCard";
import { SimilarFacilities } from "@/components/SimilarFacilities";
import { useCompare } from "@/lib/compareContext";
import { haversineDistanceKm } from "@/lib/distance";
import { InfoTooltip } from "@/components/InfoTooltip";
import { TOOLTIPS } from "@/lib/tooltips";
import {
  gradeTextClass,
  CapacityMeter,
  DomainRadar,
  EquipmentGrid,
  GradeScaleBar,
  ScoreCompareBar,
  StatTileGrid,
} from "@/components/DetailVisuals";
import { CopayCalculator } from "@/components/CopayCalculator";
import { HospitalCostEstimator } from "@/components/HospitalCostEstimator";
import { DolbodaScoreCard } from "@/components/DolbodaScoreCard";
import { calcDolbodaScore } from "@/lib/dolbodaScore";
import { checkFee, MONTHLY_BASIS_NOTE } from "@/lib/feeQuality";
import { PROGRAM_TAG_META } from "@/lib/programTaxonomy";

const DOCTOR_GRADE_TABLE = [
  { grade: 1, desc: "35명 이하 (전문의 비율 50% 이상)" },
  { grade: 2, desc: "35명 이하 (전문의 비율 50% 미만)" },
  { grade: 3, desc: "35명 초과 40명 이하" },
  { grade: 4, desc: "40명 초과" },
];

const NURSE_GRADE_TABLE = [
  { grade: 1, desc: "4.5명 미만" },
  { grade: 2, desc: "4.5명 이상 ~ 5명 미만" },
  { grade: 3, desc: "5명 이상 ~ 5.5명 미만" },
  { grade: 4, desc: "5.5명 이상 ~ 6명 미만" },
  { grade: 5, desc: "6명 이상 ~ 6.5명 미만" },
  { grade: 6, desc: "6.5명 이상" },
];

// 시설 데이터는 서버 페이지(page.tsx)에서 받아 props로 넘어온다. 클라이언트에서 fetch하면
// 검색봇이 읽는 초기 HTML이 비어버려서 28,000여 개 상세페이지가 SEO 자산이 되지 못한다.
export default function FacilityDetailClient({
  facility,
  relatedPool,
}: {
  facility: Facility;
  relatedPool: Facility[];
}) {
  const facilities = relatedPool;
  const { toggle, isSelected, canAddMore } = useCompare();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { data: session } = useSession();
  const user = session?.user;
  const [showConsult, setShowConsult] = useState(false);
  // 의사·간호인력 등급 기준표 접기/펼치기
  const [showGradeCriteria, setShowGradeCriteria] = useState(false);
  // 프로그램 운영 아코디언 — null이면 첫 번째 종류만 열림, "__none__"이면 전부 접힘
  const [openProgramCategory, setOpenProgramCategory] = useState<string | null>(null);
  const relatedTrackRef = useRef<HTMLDivElement>(null);
  // 돌보다 AI기반 안심지수 맥락(지역 평균·인근 요양병원 거리) — 시설당 1회 조회
  const [scoreContext, setScoreContext] = useState<{
    regionName: string | null;
    regionAverage: number | null;
    regionCount: number;
    nearestHospitalKm: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/facilities/score-context?id=${encodeURIComponent(facility.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && !d.error) setScoreContext(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [facility.id]);

  function scrollRelated(direction: "left" | "right") {
    const track = relatedTrackRef.current;
    if (!track) return;
    const cardWidth = track.firstElementChild?.clientWidth ?? 288;
    track.scrollBy({ left: direction === "left" ? -(cardWidth + 16) : cardWidth + 16, behavior: "smooth" });
  }

  // 카드/배너 클릭 시점에 이미 게이트를 통과했지만, 직접 URL로 들어온 경우를 대비해 조회 기록만 남긴다.
  useEffect(() => {
    if (user) return;
    if (canViewFacility(facility.id)) registerFacilityView(facility.id);
  }, [facility.id, user]);

  const hospital = isHospital(facility) ? facility : null;
  const nhis = isHospital(facility) ? null : facility;
  const selected = isSelected(facility.id);
  const favorite = isFavorite(facility.id);

  const highlightTags: string[] = [];
  if (!isHospital(facility)) {
    if (facility.capacity > 0 && facility.currentOccupancy !== undefined) {
      highlightTags.push(
        facility.capacity - facility.currentOccupancy > 0 ? "입소 가능 자리 있음" : "정원 마감"
      );
    }
    if (facility.waitlistCount === 0) highlightTags.push("대기자 없음");
    if (facility.hasDementiaUnit) highlightTags.push("치매전담실 운영");
    if (facility.staffDetail.medical.nurses > 0) highlightTags.push("간호 인력 배치");
    if (facility.facilityRooms.medical.rehabRoom > 0) highlightTags.push("재활·훈련실 있음");
    if (facility.programs.length > 0) highlightTags.push("프로그램 운영 중");
    if (facility.institutionInfo?.liabilityInsurance) highlightTags.push("배상책임보험 가입");
  }

  // 공단 프로그램 데이터는 같은 이름이 여러 번 들어있는 경우가 있어 이름 기준으로 한 번만 남기고,
  // 종류별로 묶어 보여준다(인지기능향상 N개 / 신체활동 N개 …).
  const programGroups = (() => {
    const programs = nhis?.programs;
    if (!programs?.length) return [] as [string, CareProgram[]][];
    const seen = new Set<string>();
    const groups = new Map<string, CareProgram[]>();
    for (const p of programs) {
      const dedupeKey = `${p.category ?? ""}|${p.name.replace(/\s/g, "")}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const category = p.category || "기타";
      groups.set(category, [...(groups.get(category) ?? []), p]);
    }
    // 개수가 많은 종류부터 — 그 시설이 주력하는 프로그램이 먼저 보이게
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  })();

  const info = nhis?.institutionInfo;
  const institutionInfoItems: { label: string; value: string }[] = [];
  if (info?.operatingHours) institutionInfoItems.push({ label: "운영시간", value: info.operatingHours });
  if (info?.transport) institutionInfoItems.push({ label: "오시는 길", value: info.transport });
  if (info?.parkingInfo) institutionInfoItems.push({ label: "주차", value: info.parkingInfo });
  if (info?.designatedAt) institutionInfoItems.push({ label: "지정일", value: info.designatedAt });
  if (info?.liabilityInsurance || info?.professionalLiabilityInsurance) {
    institutionInfoItems.push({
      label: "배상보험",
      value: [
        info.liabilityInsurance ? "손해배상책임보험 가입" : null,
        info.professionalLiabilityInsurance ? "전문인배상책임보험 가입" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  if (nhis?.otherServices?.length) {
    institutionInfoItems.push({
      label: "함께 제공",
      value: nhis.otherServices.join(" · "),
    });
  }

  const tenureRows = (nhis?.tenure ?? []).filter((t) => t.total > 0).slice(0, 5);

  const relatedFacilities = facilities.filter((f) => f.id !== facility.id)
    .map((f) => ({
      f,
      dist:
        facility.lat !== undefined &&
        facility.lng !== undefined &&
        f.lat !== undefined &&
        f.lng !== undefined
          ? haversineDistanceKm(facility.lat, facility.lng, f.lat, f.lng)
          : undefined,
      sameType: f.facilityType === facility.facilityType,
    }))
    .sort((a, b) => {
      if (a.sameType !== b.sameType) return a.sameType ? -1 : 1;
      return (a.dist ?? Infinity) - (b.dist ?? Infinity);
    })
    .slice(0, 6);

  return (
    <main className="pb-28">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <TypeBadge
                type={facility.facilityType}
                label={FACILITY_TYPE_LABEL[facility.facilityType]}
              />
              <GradeBadge grade={facility.grade} gradeSource={facility.gradeSource} />
              {facility.establishedYear !== undefined && (
                <span className="text-xs text-ink-300">
                  설립 {new Date().getFullYear() - facility.establishedYear}년차
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold leading-snug text-ink-900 sm:text-3xl">
              {facility.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{facility.address}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={favorite ? "관심시설에서 제거" : "관심시설에 추가"}
              onClick={() => toggleFavorite(facility.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-95 ${
                favorite
                  ? "border-accent-300 bg-accent-50 text-accent-600"
                  : "border-ink-100 text-ink-700 hover:bg-ink-100"
              }`}
            >
              <Heart size={16} fill={favorite ? "currentColor" : "none"} />
              {favorite ? "관심시설" : "찜하기"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: facility.name, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 transition-all duration-150 hover:bg-ink-100 active:scale-95"
            >
              <Share2 size={16} />
              공유하기
            </button>
          </div>
        </div>

        {highlightTags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-1.5">
            {highlightTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-ink-100/60 px-3 py-1 text-xs font-medium text-ink-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 사진 갤러리 — 사진이 2장 이상이면 옆으로 넘겨볼 수 있고, 그 외엔 기존 썸네일 그대로 */}
        <FacilityPhotoGallery facility={facility} />

        {/* 행정처분 이력 경고 — 공표 데이터가 있는 시설만 */}
        {facility.adminActions && facility.adminActions.length > 0 && (
          <div className="mt-6 rounded-2xl border border-accent-300 bg-accent-50 p-5">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-accent-600">
              <AlertTriangle size={16} />
              행정처분(위반사실 공표) 이력이 있는 시설이에요
            </p>
            <ul className="space-y-1.5">
              {facility.adminActions.map((a, i) => (
                <li key={i} className="text-xs leading-relaxed text-ink-700">
                  <span className="font-semibold">{a.type}</span>
                  {a.date && <span className="text-ink-500"> · {a.date}</span>}
                  {a.reason && <span className="text-ink-500"> — {a.reason}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] leading-relaxed text-ink-500">
              공단·지자체가 공표한 자료 기준이에요. 처분 이후 개선됐을 수 있으니, 방문 상담 때
              직접 확인해 보세요.
            </p>
          </div>
        )}

        {/* 돌보다 AI기반 안심지수 */}
        <DetailSection id="dolboda-score" title="돌보다 AI기반 안심지수">
          <DolbodaScoreCard
            score={calcDolbodaScore(facility, {
              nearestHospitalKm: scoreContext?.nearestHospitalKm ?? null,
            })}
            regionContext={
              scoreContext?.regionAverage != null && scoreContext.regionName
                ? {
                    name: scoreContext.regionName,
                    average: scoreContext.regionAverage,
                    count: scoreContext.regionCount,
                  }
                : null
            }
          />
        </DetailSection>

        {/* 평가정보 */}
        <DetailSection
          id="grade"
          title="평가 정보"
          tooltip={facility.gradeSource === "HIRA" ? TOOLTIPS.gradeHospital : TOOLTIPS.gradeNursingHome}
        >
          <div className="rounded-2xl bg-primary-50 p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <GradeBadge grade={facility.grade} gradeSource={facility.gradeSource} />
              <p className="text-xs text-ink-500">
                {facility.gradeSource === "HIRA" ? "건강보험심사평가원" : "국민건강보험공단"} 평가 ·{" "}
                {facility.updatedAt} 기준 갱신
              </p>
            </div>
            <GradeScaleBar grade={facility.grade} levels={5} gradeSource={facility.gradeSource} />
          </div>

          {hospital && (
            <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[
                ["1등급", "종합결과 87점 이상"],
                ["2등급", "79점 이상 ~ 87점 미만"],
                ["3등급", "71점 이상 ~ 79점 미만"],
                ["4등급", "63점 이상 ~ 71점 미만"],
                ["5등급", "63점 미만"],
              ].map(([g, desc]) => (
                <div key={g} className="flex items-center gap-2 border-b border-ink-100 py-2">
                  <span className="font-semibold text-ink-900">{g}</span>
                  <span className="text-ink-300">·</span>
                  <span className="text-ink-500">{desc}</span>
                </div>
              ))}
            </div>
          )}

          {!isHospital(facility) &&
            (facility.evaluationDetail ? (
              <div className="mt-4 space-y-5">
                {/* 지역 평균이 있으면 그걸 먼저 — 보호자에겐 전국보다 우리 동네 비교가 와닿는다 */}
                {facility.evaluationDetail.regionAverage != null && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-ink-700">
                      {facility.evaluationDetail.evaluatedAt} ·{" "}
                      {facility.evaluationDetail.regionName} 평균 대비
                    </p>
                    <ScoreCompareBar
                      score={facility.evaluationDetail.totalScore}
                      average={facility.evaluationDetail.regionAverage}
                      averageLabel={`${facility.evaluationDetail.regionName} 평균`}
                    />
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-700">
                    {facility.evaluationDetail.regionAverage != null
                      ? "전국 평균 대비"
                      : `${facility.evaluationDetail.evaluatedAt} · 전국 평균 대비`}
                  </p>
                  <ScoreCompareBar
                    score={facility.evaluationDetail.totalScore}
                    average={facility.evaluationDetail.nationalAverage}
                    averageLabel="전국 평균"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-700">영역별 점수</p>
                  <DomainRadar domains={facility.evaluationDetail.domains} />
                </div>
              </div>
            ) : (
              // 공개된 세부 평가 자료가 없는 시설 — 화면이 고장 난 것처럼 보이지 않게 이유를 밝힌다.
              <p className="mt-4 rounded-xl bg-ink-100/40 p-3.5 text-xs leading-relaxed text-ink-500">
                이 시설은 영역별 세부 점수(기관운영·환경·권리보장 등)가 아직 공개되지 않았어요.
                국민건강보험공단 정기평가 자료가 공개되는 대로 등급과 함께 보여드릴게요.
              </p>
            ))}
        </DetailSection>

        {hospital && (
          <>
            {/* 비급여비용 */}
            <DetailSection id="fees" title="비급여 비용" tooltip={TOOLTIPS.nonCovered}>
              <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
                {hospital.nonCoveredFees.map((fee, i) => (
                  <div
                    key={`${fee.name}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                  >
                    <span className="text-ink-700">{fee.name}</span>
                    <span className="font-semibold text-ink-900">
                      {fee.min.toLocaleString()} ~ {fee.max.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-300">
                요양병원 비용은 건강보험이 적용돼요. 아래 시뮬레이터로 간병비·상급병실료 같은
                비급여 실부담을 가늠해 보세요.
              </p>
            </DetailSection>

            <DetailSection id="copay" title="월 실부담 시뮬레이터">
              <HospitalCostEstimator fees={hospital.nonCoveredFees} />
            </DetailSection>

            {/* 의사·간호인력 등급 — 값이 없는 시설은 0등급처럼 보이지 않게 안내로 대체.
                전체 기준표를 다 펼쳐두면 지저분해서, 이 시설 등급의 의미만 한 줄로 보여주고
                기준표 전체는 접어둔다. */}
            <DetailSection id="staff-grade" title="의사·간호인력 등급" tooltip={TOOLTIPS.nurseGrade}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-ink-100/30 p-4">
                  <div className="mb-3 flex items-baseline justify-between">
                    <p className="text-[15px] font-semibold text-ink-700">의사 인력</p>
                    {hospital.doctorGrade > 0 && (
                      <p className={`text-2xl font-extrabold ${gradeTextClass(hospital.doctorGrade)}`}>
                        {hospital.doctorGrade}
                        <span className="text-[15px] font-bold">등급</span>
                      </p>
                    )}
                  </div>
                  {hospital.doctorGrade > 0 ? (
                    <>
                      <GradeScaleBar grade={hospital.doctorGrade} levels={4} />
                      <p className="mt-3 rounded-xl bg-white px-3 py-2.5 text-sm leading-relaxed text-ink-600">
                        의사 1명이 환자{" "}
                        <b className="text-ink-900">
                          {DOCTOR_GRADE_TABLE.find((r) => r.grade === hospital.doctorGrade)?.desc}
                        </b>
                        를 돌봐요
                      </p>
                    </>
                  ) : (
                    <p className="text-[15px] text-ink-400">아직 공개된 등급이 없어요</p>
                  )}
                </div>
                <div className="rounded-2xl bg-ink-100/30 p-4">
                  <div className="mb-3 flex items-baseline justify-between">
                    <p className="text-[15px] font-semibold text-ink-700">간호 인력</p>
                    {hospital.nurseGrade > 0 && (
                      <p className={`text-2xl font-extrabold ${gradeTextClass(hospital.nurseGrade)}`}>
                        {hospital.nurseGrade}
                        <span className="text-[15px] font-bold">등급</span>
                      </p>
                    )}
                  </div>
                  {hospital.nurseGrade > 0 ? (
                    <>
                      <GradeScaleBar grade={hospital.nurseGrade} levels={6} />
                      <p className="mt-3 rounded-xl bg-white px-3 py-2.5 text-sm leading-relaxed text-ink-600">
                        간호사 1명이 환자{" "}
                        <b className="text-ink-900">
                          {NURSE_GRADE_TABLE.find((r) => r.grade === hospital.nurseGrade)?.desc}
                        </b>
                        을 돌봐요
                      </p>
                    </>
                  ) : (
                    <p className="text-[15px] text-ink-400">아직 공개된 등급이 없어요</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGradeCriteria((v) => !v)}
                className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-xl bg-ink-100/40 text-xs font-semibold text-ink-500 transition hover:bg-ink-100/70 hover:text-ink-700"
              >
                등급 기준 전체 {showGradeCriteria ? "접기" : "보기"}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showGradeCriteria ? "rotate-180" : ""}`}
                />
              </button>

              {showGradeCriteria && (
                <div className="mt-3 grid grid-cols-1 gap-4 rounded-2xl border border-ink-100 p-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold text-ink-700">의사 1명이 돌보는 환자수</p>
                    <ul className="space-y-1">
                      {DOCTOR_GRADE_TABLE.map((row) => (
                        <li
                          key={row.grade}
                          className={`flex items-baseline gap-2 rounded-lg px-2 py-1 text-xs ${
                            row.grade === hospital.doctorGrade
                              ? "bg-mint-50 font-bold text-ink-900"
                              : "text-ink-500"
                          }`}
                        >
                          <span className="w-9 shrink-0 font-semibold">{row.grade}등급</span>
                          {row.desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold text-ink-700">간호사 1명이 돌보는 환자수</p>
                    <ul className="space-y-1">
                      {NURSE_GRADE_TABLE.map((row) => (
                        <li
                          key={row.grade}
                          className={`flex items-baseline gap-2 rounded-lg px-2 py-1 text-xs ${
                            row.grade === hospital.nurseGrade
                              ? "bg-primary-50 font-bold text-ink-900"
                              : "text-ink-500"
                          }`}
                        >
                          <span className="w-9 shrink-0 font-semibold">{row.grade}등급</span>
                          {row.desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </DetailSection>

            {/* 인력현황 */}
            <DetailSection id="workforce" title="인력 현황">
              <StatTileGrid
                colorClassName="bg-primary-50 text-primary-600"
                items={[
                  { label: "의과일반의", value: hospital.staff.generalDoctors},
                  { label: "의과전문의", value: hospital.staff.specialistDoctors},
                  { label: "사회복지사", value: hospital.staff.socialWorkers},
                  { label: "물리치료사", value: hospital.staff.physicalTherapists},
                  { label: "작업치료사", value: hospital.staff.occupationalTherapists},
                  { label: "약사", value: hospital.staff.pharmacists},
                ]}
              />
            </DetailSection>

            {/* 진료과목 */}
            <DetailSection id="departments" title="진료 과목">
              <div className="flex flex-wrap gap-2">
                {hospital.departments.map((d) => (
                  <span
                    key={d.name}
                    className="rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700"
                  >
                    {d.name} ({d.doctorCount}명)
                  </span>
                ))}
              </div>
            </DetailSection>

            {/* 시설현황 */}
            <DetailSection id="facility-status" title="시설 현황">
              <StatTileGrid
                unit="실"
                colorClassName="bg-mint-50 text-mint-700"
                items={[
                  { label: "일반병상", value: hospital.facilityStatus.generalBeds},
                  { label: "상급병상", value: hospital.facilityStatus.upgradeBeds},
                  { label: "물리치료실", value: hospital.facilityStatus.physicalTherapyRooms},
                  { label: "격리병실", value: hospital.facilityStatus.isolationRooms},
                ]}
              />
            </DetailSection>

            {/* 응급실 */}
            <DetailSection id="emergency" title="응급실" tooltip={TOOLTIPS.emergencyRoom}>
              <div className="grid grid-cols-2 gap-3">
                {(["day", "night"] as const).map((key) => (
                  <div
                    key={key}
                    className={`rounded-2xl p-4 text-center ${
                      hospital.emergencyRoom[key]
                        ? "bg-mint-50 text-mint-700"
                        : "bg-ink-100/40 text-ink-300"
                    }`}
                  >
                    <Siren size={20} className="mx-auto mb-1" />
                    <p className="text-xs font-medium">{key === "day" ? "주간" : "야간"}</p>
                    <p className="text-lg font-bold">
                      {hospital.emergencyRoom[key] ? "운영" : "미운영"}
                    </p>
                  </div>
                ))}
              </div>
            </DetailSection>

            {/* 의료장비 */}
            <DetailSection id="equipment" title="의료 장비">
              <EquipmentGrid items={hospital.equipment} />
            </DetailSection>
          </>
        )}

        {!isHospital(facility) && (
          <>
            <DetailSection
              id="workforce"
              title={facility.facilityType === "HOME_CARE" ? "이용 방식" : "정원 현황"}
              tooltip={facility.facilityType === "HOME_CARE" ? undefined : TOOLTIPS.capacity}
            >
              {facility.facilityType === "HOME_CARE" ? (
                // 방문요양은 입소 시설이 아니라 정원·현원이 의미가 없다 — 대신 서비스 성격을 안내한다
                <div className="space-y-2.5 rounded-2xl bg-mint-50/60 p-4">
                  {[
                    ["집으로 방문해요", "요양보호사가 어르신 댁으로 찾아가 일상생활을 도와드려요."],
                    ["정원 제한이 없어요", "입소 시설이 아니라서 자리가 차거나 대기하는 개념이 없어요. 전화 상담 후 방문 일정을 조율해요."],
                    ["재가급여로 이용해요", "장기요양등급이 있으면 월 한도 내에서 본인부담금만 내고 이용할 수 있어요. 아래 시뮬레이터로 계산해 보세요."],
                  ].map(([title, desc]) => (
                    <div key={title}>
                      <p className="text-sm font-semibold text-ink-900">{title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{desc}</p>
                    </div>
                  ))}
                </div>
              ) : facility.capacity > 0 ? (
                <>
                  <CapacityMeter
                    capacity={facility.capacity}
                    occupancy={facility.currentOccupancy}
                    waitlistCount={facility.waitlistCount}
                  />
                  {/* 공단이 집계한 "이용 가능 인원" — 정원-현원 계산과 다를 수 있는 공식 값 */}
                  {(facility.availableSlots ?? 0) > 0 && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-3 py-1.5 text-sm font-bold text-mint-700">
                      지금 {facility.availableSlots}자리 이용 가능 (공단 집계)
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-300">이 시설 유형은 정원 정보가 공개되지 않았어요.</p>
              )}
              {facility.roomTypes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {facility.roomTypes.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-mint-50 px-3 py-1.5 text-sm font-medium text-mint-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </DetailSection>

            {facility.nonCoveredFees.length > 0 && (
              <DetailSection id="fees" title="비급여 비용" tooltip={TOOLTIPS.nonCovered}>
                <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
                  {facility.nonCoveredFees.map((fee, i) => {
                    // 원본에 "1일 1원" 같은 값이 섞여 있어, 그대로 보여주면 오히려 오해를 준다
                    const quality = checkFee(fee);
                    return (
                      <div key={`${fee.name}-${i}`} className="px-4 py-3">
                        <p className="mb-1.5 text-sm text-ink-700">{fee.name}</p>
                        {quality.kind === "ok" ? (
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-ink-100/60 px-2.5 py-1 text-xs font-semibold text-ink-900">
                              월 {fee.monthly.toLocaleString()}원
                            </span>
                            {fee.daily > 0 && (
                              <span className="rounded-full bg-ink-100/60 px-2.5 py-1 text-xs text-ink-500">
                                1일 {fee.daily.toLocaleString()}원
                              </span>
                            )}
                          </div>
                        ) : quality.kind === "unpublished" ? (
                          <p className="text-xs text-ink-300">공개된 금액이 없어요</p>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-600">
                              <AlertTriangle size={11} />
                              시설 문의 필요
                            </span>
                            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-300">
                              공공데이터에 {quality.reason}. 실제 금액과 다를 수 있어 그대로 표시하지
                              않았어요.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-ink-300">{MONTHLY_BASIS_NOTE}</p>
              </DetailSection>
            )}

            <DetailSection id="workforce-detail" title="인력 현황">
              {/* 전 항목이 0이면 미확보 데이터다 — 0명으로 단정 표시하지 않고 이유를 밝힌다 */}
              {[
                ...Object.values(facility.staffDetail.administrative),
                ...Object.values(facility.staffDetail.socialCare),
                ...Object.values(facility.staffDetail.medical),
                nhis?.careWorkerDetail?.total ?? 0,
              ].every((v) => v === 0) ? (
                <p className="rounded-2xl bg-ink-100/40 p-4 text-sm leading-relaxed text-ink-500">
                  이 시설의 인력현황은 공공데이터에 아직 공개되지 않았어요. 상담하실 때
                  요양보호사·간호인력 배치를 직접 확인해 보시는 것을 권해요.
                </p>
              ) : (
              <div className="space-y-5">
                {/* 요양보호사는 어르신을 실제로 돌보는 인력이라 맨 위에 크게 보여준다 */}
                {(nhis?.careWorkerDetail?.total ?? 0) > 0 && (
                  <div className="flex items-center justify-between rounded-2xl bg-primary-50 px-4 py-3.5">
                    <div>
                      <p className="text-sm font-bold text-ink-900">요양보호사</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        어르신을 직접 돌보시는 분들이에요
                        {(nhis?.staffTotal ?? 0) > 0 && ` · 전체 직원 ${nhis!.staffTotal}명`}
                      </p>
                    </div>
                    <p className="shrink-0 text-2xl font-extrabold text-primary-600">
                      {nhis!.careWorkerDetail!.total}
                      <span className="text-sm font-bold">명</span>
                    </p>
                  </div>
                )}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-300">
                    <Building2 size={14} />
                    경영·행정 인력
                  </p>
                  <StatTileGrid
                    colorClassName="bg-primary-50 text-primary-600"
                    items={[
                      { label: "시설장", value: facility.staffDetail.administrative.facilityHead},
                      { label: "사무국장", value: facility.staffDetail.administrative.officeManager},
                      { label: "사무원", value: facility.staffDetail.administrative.staff},
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-300">
                    <HeartHandshake size={14} />
                    사회복지·재활 인력
                  </p>
                  <StatTileGrid
                    colorClassName="bg-mint-50 text-mint-700"
                    items={[
                      {
                        label: "사회복지사",
                        value: facility.staffDetail.socialCare.socialWorkers,
                      },
                      {
                        label: "물리치료사",
                        value: facility.staffDetail.socialCare.physicalTherapists,
                      },
                      {
                        label: "작업치료사",
                        value: facility.staffDetail.socialCare.occupationalTherapists,
                      },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-300">
                    <Stethoscope size={14} />
                    의료 인력
                  </p>
                  <StatTileGrid
                    colorClassName="bg-accent-100 text-accent-600"
                    items={[
                      {
                        label: "의사(전임)",
                        value: facility.staffDetail.medical.fullTimeDoctors,
                      },
                      {
                        label: "의사(촉탁)",
                        value: facility.staffDetail.medical.partTimeDoctors,
                      },
                      { label: "간호사", value: facility.staffDetail.medical.nurses},
                      {
                        label: "간호조무사",
                        value: facility.staffDetail.medical.nursingAssistants,
                      },
                    ]}
                  />
                </div>
              </div>
              )}
            </DetailSection>

            {(Object.values(facility.facilityRooms.bedrooms).some((v) => v > 0) ||
              Object.values(facility.facilityRooms.medical).some((v) => v > 0) ||
              Object.values(facility.facilityRooms.dining).some((v) => v > 0)) && (
              <DetailSection id="facility-status" title="시설 현황">
                <div className="space-y-5">
                  {Object.values(facility.facilityRooms.bedrooms).some((v) => v > 0) && (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-300">
                        <BedDouble size={14} />
                        침실 공간
                      </p>
                      <StatTileGrid
                        unit="실"
                        colorClassName="bg-primary-50 text-primary-600"
                        items={[
                          { label: "1인실", value: facility.facilityRooms.bedrooms.single},
                          { label: "2인실", value: facility.facilityRooms.bedrooms.double},
                          { label: "3인실", value: facility.facilityRooms.bedrooms.triple},
                          { label: "4인실", value: facility.facilityRooms.bedrooms.quad},
                          { label: "특수침실", value: facility.facilityRooms.bedrooms.special},
                        ]}
                      />
                    </div>
                  )}
                  {Object.values(facility.facilityRooms.medical).some((v) => v > 0) && (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-300">
                        <Stethoscope size={14} />
                        의료·건강관리 공간
                      </p>
                      <StatTileGrid
                        unit="실"
                        colorClassName="bg-mint-50 text-mint-700"
                        items={[
                          {
                            label: "의료/간호사실",
                            value: facility.facilityRooms.medical.nursingRoom,
                          },
                          {
                            label: "재활/훈련실",
                            value: facility.facilityRooms.medical.rehabRoom,
                          },
                        ]}
                      />
                    </div>
                  )}
                  {Object.values(facility.facilityRooms.dining).some((v) => v > 0) && (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-300">
                        <UtensilsCrossed size={14} />
                        급식·위생 공간
                      </p>
                      <StatTileGrid
                        unit="실"
                        colorClassName="bg-accent-100 text-accent-600"
                        items={[
                          {
                            label: "식당/조리실",
                            value: facility.facilityRooms.dining.diningRoom,
                          },
                          { label: "화장실", value: facility.facilityRooms.dining.restroom},
                          {
                            label: "세면장/목욕실",
                            value: facility.facilityRooms.dining.bathroom,
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
              </DetailSection>
            )}

            {programGroups.length > 0 && (
              <DetailSection id="programs" title="프로그램 운영">
                {/* 태그 요약 — 공단 원본 분류는 '기타'가 많아, 프로그램명을 다시 분류해
                    어르신께 필요한 활동이 있는지 한눈에 보이게 한다 */}
                {nhis?.programTags && nhis.programTags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {nhis.programTags.map((t) => (
                      <span
                        key={t.tag}
                        className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-semibold text-mint-700"
                        title={t.samples.join(", ")}
                      >
                        {PROGRAM_TAG_META[t.tag].emoji} {PROGRAM_TAG_META[t.tag].label}
                        {t.weekly >= 1 && (
                          <span className="font-bold">주 {Math.round(t.weekly)}회</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mb-3 text-xs leading-relaxed text-ink-500">
                  이 시설이 공단에 신고한 프로그램이에요. 종류를 누르면 세부 목록이 열려요.
                </p>
                {/* 종류별 아코디언 — 프로그램이 수십 개인 시설은 다 펼치면 화면이 한없이
                    길어져서, 첫 번째 종류만 열어두고 나머지는 접어둔다 */}
                <div className="space-y-2">
                  {programGroups.map(([category, list], gi) => {
                    const open = openProgramCategory === null ? gi === 0 : openProgramCategory === category;
                    return (
                      <div key={category} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
                        <button
                          type="button"
                          onClick={() => setOpenProgramCategory(open ? "__none__" : category)}
                          aria-expanded={open}
                          className="flex min-h-[52px] w-full items-center justify-between gap-2 px-4 py-3 text-left"
                        >
                          <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                            <Sparkles size={14} className="text-primary-500" />
                            {category}
                            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-600">
                              {list.length}개
                            </span>
                          </span>
                          {/* 화살표만 두면 누를 수 있는 줄 모르고 지나친다 —
                              원형 버튼 모양으로 감싸고, 열리면 색을 채워 상태가 보이게 */}
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                              open
                                ? "bg-primary-500 text-white"
                                : "bg-primary-50 text-primary-600"
                            }`}
                          >
                            <ChevronDown
                              size={17}
                              strokeWidth={2.5}
                              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                            />
                          </span>
                        </button>
                        {open && (
                          <div className="grid grid-cols-1 gap-2 border-t border-ink-100 p-3 sm:grid-cols-2">
                            {list.map((p) => (
                              <div key={p.name} className="rounded-xl bg-ink-100/40 px-3.5 py-3">
                                <p className="text-sm font-bold text-ink-900">{p.name}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                                  {p.frequency}
                                  {p.targetCount > 0 && ` · 대상 ${p.targetCount}명`}
                                  {p.location && ` · ${p.location}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DetailSection>
            )}

            {/* 근속현황 — 오래 일한 직원 비율이 높으면 돌봄이 안정적이라는 신호 */}
            {tenureRows.length > 0 && (
              <DetailSection id="tenure" title="직원 근속 현황">
                <p className="mb-3 text-xs leading-relaxed text-ink-500">
                  2년 이상 일한 직원이 많을수록 어르신이 익숙한 분께 계속 돌봄을 받으실 수 있어요.
                </p>
                <div className="space-y-3">
                  {tenureRows.map((t) => {
                    const pct = Math.round((t.over2y / t.total) * 100);
                    return (
                      <div key={t.role}>
                        <div className="mb-1 flex items-baseline justify-between text-xs">
                          <span className="font-semibold text-ink-700">
                            {t.role}
                            <span className="ml-1 font-medium text-ink-300">{t.total}명</span>
                          </span>
                          <span className="font-bold text-ink-900">2년 이상 {pct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-ink-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-mint-400 to-mint-600 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DetailSection>
            )}

            <DetailSection id="copay" title="월 실부담 시뮬레이터">
              <CopayCalculator
                facilityType={facility.facilityType}
                defaultMonthlyMealCost={
                  facility.nonCoveredFees.find(
                    (f) => f.name.includes("식재료") || f.name.includes("식비")
                  )?.monthly ?? 0
                }
                defaultMonthlySnackCost={
                  facility.nonCoveredFees.find((f) => f.name.startsWith("간식"))?.monthly ?? 0
                }
              />
            </DetailSection>

            {/* 기관 운영 정보 — 시뮬레이터 아래·위치 위에 두어 방문 계획(오시는 길·주차)과
                이어지게 한다 */}
            {institutionInfoItems.length > 0 && (
              <DetailSection id="institution-info" title="운영 정보">
                <dl className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
                  {institutionInfoItems.map(({ label, value }) => (
                    <div key={label} className="flex gap-3 px-4 py-3">
                      <dt className="w-20 shrink-0 text-xs font-semibold text-ink-300">{label}</dt>
                      <dd className="min-w-0 flex-1 text-sm leading-relaxed text-ink-700">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </DetailSection>
            )}
          </>
        )}

        {/* 위치 */}
        <DetailSection id="location" title="위치">
          <p className="mb-3 text-sm text-ink-700">{facility.address}</p>
          <KakaoMap lat={facility.lat} lng={facility.lng} label={facility.address} />
          <p className="mb-2 mt-4 text-xs font-semibold text-ink-300">로드뷰 미리보기 (검토용)</p>
          <KakaoRoadview lat={facility.lat} lng={facility.lng} />
          <a
            href={`https://map.naver.com/v5/search/${encodeURIComponent(facility.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
          >
            <Navigation size={14} />
            길찾기
          </a>
          {facility.parking && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-300">
              <Car size={14} />
              주차 {facility.parking.spots}대 · {facility.parking.isFree ? "무료" : "유료"}
            </p>
          )}
        </DetailSection>

        {relatedFacilities.length > 0 && (
          <DetailSection id="related" title="이 시설과 비슷한 곳">
            <p className="mb-3 text-xs leading-relaxed text-ink-500">
              규모·프로그램 구성·평가등급·비용대를 비교해 비슷한 시설을 찾았어요. 이 시설과
              무엇이 다른지 함께 보여드려요.
            </p>
            <SimilarFacilities facilityId={facility.id} />
          </DetailSection>
        )}

        <DataSourceNote updatedAt={facility.updatedAt} />
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {facility.phone ? (
            <a
              href={`tel:${facility.phone}`}
              aria-label="전화 문의"
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-semibold text-ink-700 transition-all duration-150 hover:bg-ink-100 active:scale-95 sm:px-4"
            >
              <Phone size={16} />
              <span className="hidden sm:inline">전화 문의</span>
            </a>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-semibold text-ink-300 sm:px-4">
              <Phone size={16} />
              <span className="hidden sm:inline">연락처 미제공</span>
            </span>
          )}
          <button
            type="button"
            disabled={!selected && !canAddMore}
            onClick={() => toggle(facility.id)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-150 active:scale-[0.97] sm:px-4 ${
              selected
                ? "bg-primary-100 text-primary-700"
                : "bg-white text-primary-700 border border-primary-300 hover:bg-primary-50"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {selected ? "비교함에서 제거" : "비교함에 담기"}
          </button>
          <button
            type="button"
            onClick={() => setShowConsult(true)}
            className="flex-1 rounded-xl bg-primary-500 px-3 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-95 sm:px-4"
          >
            상담 신청
          </button>
        </div>
      </div>

      {showConsult && (
        <ConsultModal
          facilityId={facility.id}
          facilityName={facility.name}
          onClose={() => setShowConsult(false)}
        />
      )}
    </main>
  );
}
