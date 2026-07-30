"use client";

import { useEffect, useRef, useState } from "react";
import { notFound, useParams } from "next/navigation";
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
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useFavorites } from "@/lib/favoritesContext";
import { canViewFacility, registerFacilityView } from "@/lib/viewLimit";
import { FacilityPhotoGallery } from "@/components/FacilityPhotoGallery";
import { useFacility, useFacilities } from "@/lib/useFacilities";
import { FACILITY_TYPE_LABEL, isHospital } from "@/lib/types";
import { GradeBadge, TypeBadge } from "@/components/GradeBadge";
import { DetailSection } from "@/components/DetailSection";
import { KakaoMap } from "@/components/KakaoMap";
import { KakaoRoadview } from "@/components/KakaoRoadview";
import { ConsultModal } from "@/components/ConsultModal";
import { FacilityCard } from "@/components/FacilityCard";
import { useCompare } from "@/lib/compareContext";
import { haversineDistanceKm } from "@/lib/distance";
import { InfoTooltip } from "@/components/InfoTooltip";
import { TOOLTIPS } from "@/lib/tooltips";
import {
  CapacityMeter,
  DomainRadar,
  EquipmentGrid,
  GradeScaleBar,
  ScoreCompareBar,
  StatTileGrid,
} from "@/components/DetailVisuals";
import { CopayCalculator } from "@/components/CopayCalculator";

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

export default function FacilityDetailPage() {
  const params = useParams<{ id: string }>();
  const { facility, loading } = useFacility(params.id);
  const { facilities } = useFacilities();
  const { toggle, isSelected, canAddMore } = useCompare();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { data: session } = useSession();
  const user = session?.user;
  const [showConsult, setShowConsult] = useState(false);
  const relatedTrackRef = useRef<HTMLDivElement>(null);

  function scrollRelated(direction: "left" | "right") {
    const track = relatedTrackRef.current;
    if (!track) return;
    const cardWidth = track.firstElementChild?.clientWidth ?? 288;
    track.scrollBy({ left: direction === "left" ? -(cardWidth + 16) : cardWidth + 16, behavior: "smooth" });
  }

  // 카드/배너 클릭 시점에 이미 게이트를 통과했지만, 직접 URL로 들어온 경우를 대비해 조회 기록만 남긴다.
  useEffect(() => {
    if (!facility || user) return;
    if (canViewFacility(facility.id)) registerFacilityView(facility.id);
  }, [facility, user]);

  if (!facility) {
    if (loading) return null;
    return notFound();
  }

  const hospital = isHospital(facility) ? facility : null;
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
    if (facility.staffDetail.medical.nurses > 0) highlightTags.push("간호 인력 배치");
    if (facility.facilityRooms.medical.rehabRoom > 0) highlightTags.push("재활·훈련실 있음");
    if (facility.programs.length > 0) highlightTags.push("프로그램 운영 중");
  }

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
            <GradeScaleBar grade={facility.grade} levels={5} />
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
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-700">
                    {facility.evaluationDetail.evaluatedAt} 평가 · 전체 평균 대비
                  </p>
                  <ScoreCompareBar
                    score={facility.evaluationDetail.totalScore}
                    average={facility.evaluationDetail.nationalAverage}
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
                {hospital.nonCoveredFees.map((fee) => (
                  <div
                    key={fee.name}
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
                요양병원 비용은 건강보험이 적용돼요.
                <br />
                장기요양보험 본인부담금 계산기는 요양원·주야간보호·방문요양 페이지에서 확인할 수 있어요.
              </p>
            </DetailSection>

            {/* 의사(간호인력) 등급 */}
            <DetailSection id="staff-grade" title="의사(간호인력) 등급" tooltip={TOOLTIPS.nurseGrade}>
              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-mint-50 p-4">
                  <p className="text-sm font-medium text-ink-500">의사 인력</p>
                  <p className="mb-3 mt-0.5 text-2xl font-extrabold text-mint-700">
                    {hospital.doctorGrade}등급
                  </p>
                  <GradeScaleBar grade={hospital.doctorGrade} levels={4} />
                </div>
                <div className="rounded-2xl bg-primary-50 p-4">
                  <p className="text-sm font-medium text-ink-500">간호 인력</p>
                  <p className="mb-3 mt-0.5 text-2xl font-extrabold text-primary-700">
                    {hospital.nurseGrade}등급
                  </p>
                  <GradeScaleBar grade={hospital.nurseGrade} levels={6} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-300">
                    의사 1명이 돌보는 환자수
                  </p>
                  <ul className="space-y-1 text-sm text-ink-500">
                    {DOCTOR_GRADE_TABLE.map((row) => (
                      <li key={row.grade}>
                        <span className="font-semibold text-ink-900">{row.grade}등급</span>{" "}
                        {row.desc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-300">
                    간호사 1명이 돌보는 환자수
                  </p>
                  <ul className="space-y-1 text-sm text-ink-500">
                    {NURSE_GRADE_TABLE.map((row) => (
                      <li key={row.grade}>
                        <span className="font-semibold text-ink-900">{row.grade}등급</span>{" "}
                        {row.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
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
            <DetailSection id="workforce" title="정원 현황" tooltip={TOOLTIPS.capacity}>
              {facility.capacity > 0 ? (
                <CapacityMeter
                  capacity={facility.capacity}
                  occupancy={facility.currentOccupancy}
                  waitlistCount={facility.waitlistCount}
                />
              ) : (
                <p className="text-sm text-ink-300">방문요양 서비스는 정원 개념이 없어요.</p>
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
                  {facility.nonCoveredFees.map((fee) => (
                    <div key={fee.name} className="px-4 py-3">
                      <p className="mb-1.5 text-sm text-ink-700">{fee.name}</p>
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
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            <DetailSection id="workforce-detail" title="인력 현황">
              <div className="space-y-5">
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

            {facility.programs.length > 0 && (
              <DetailSection id="programs" title="프로그램 운영">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {facility.programs.map((p) => (
                    <div key={p.name} className="flex items-start gap-3 rounded-xl bg-ink-100/40 p-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary-600 shadow-sm">
                        <Sparkles size={16} />
                      </span>
                      <div>
                        <p className="mb-1 font-bold text-ink-900">{p.name}</p>
                        <p className="text-xs text-ink-500">
                          대상 {p.targetCount}명 · {p.frequency} · {p.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            <DetailSection id="copay" title="본인부담금 계산기">
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

        {/* 이야기 */}
        <DetailSection id="story" title="이 시설 이야기">
          <div className="rounded-2xl bg-ink-100/30 p-8 text-center text-sm text-ink-300">
            아직 등록된 이야기가 없어요.
          </div>
        </DetailSection>

        {relatedFacilities.length > 0 && (
          <DetailSection id="related" title="다른 시설도 확인해 보세요">
            {/* 가로 스크롤 컨테이너는 위아래도 잘라내므로 py-2/-my-2로 여백을 만들어
                1등급 카드의 노란 테두리(ring-2)와 hover 시 떠오르는 효과가 잘리지 않게 한다. */}
            <div className="group relative">
              <div
                ref={relatedTrackRef}
                className="-mx-4 -my-2 flex snap-x gap-4 overflow-x-auto px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {relatedFacilities.map(({ f, dist }) => (
                  <div key={f.id} className="w-72 shrink-0 snap-start">
                    <FacilityCard facility={f} distanceKm={dist} />
                  </div>
                ))}
              </div>

              {relatedFacilities.length > 3 && (
                <>
                  <button
                    type="button"
                    aria-label="이전 시설"
                    onClick={() => scrollRelated("left")}
                    className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-ink-100 bg-white text-ink-700 opacity-0 shadow-card transition-all duration-200 ease-snappy hover:scale-110 hover:bg-ink-100 active:scale-95 group-hover:opacity-100"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="다음 시설"
                    onClick={() => scrollRelated("right")}
                    className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-ink-100 bg-white text-ink-700 opacity-0 shadow-card transition-all duration-200 ease-snappy hover:scale-110 hover:bg-ink-100 active:scale-95 group-hover:opacity-100"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>
          </DetailSection>
        )}
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
