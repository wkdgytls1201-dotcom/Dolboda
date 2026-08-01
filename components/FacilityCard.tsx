"use client";

import Link from "next/link";
import { Heart, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Facility, FACILITY_TYPE_LABEL, isHospital } from "@/lib/types";
import { formatDistance } from "@/lib/distance";
import { GradeBadge, TypeBadge } from "./GradeBadge";
import { useCompare } from "@/lib/compareContext";
import { useFavorites } from "@/lib/favoritesContext";
import { FacilityThumbnail } from "./FacilityThumbnail";
import { useViewGate } from "@/lib/viewGateContext";

export function FacilityCard({
  facility,
  distanceKm,
  selectable = true,
}: {
  facility: Facility;
  distanceKm?: number;
  selectable?: boolean;
}) {
  const { toggle, isSelected, selectedIds, canAddMore } = useCompare();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { requestFacilityView } = useViewGate();
  const favorite = isFavorite(facility.id);
  const selected = isSelected(facility.id);
  const order = selected ? selectedIds.indexOf(facility.id) + 1 : null;
  const disabled = !selected && !canAddMore;

  // 방문요양센터는 입소 시설이 아니라 정원 개념이 없다 — "정원 0명" 대신 서비스 성격을 알려준다
  const keyStat = isHospital(facility)
    ? `병상 ${facility.facilityStatus.generalBeds + facility.facilityStatus.upgradeBeds}개` +
      (facility.departments?.length ? ` · 진료과 ${facility.departments.length}개` : "")
    : facility.facilityType === "HOME_CARE"
    ? "우리 집으로 방문 · 정원 제한 없음"
    : facility.currentOccupancy !== undefined
    ? `정원 ${facility.capacity}명 · 현원 ${facility.currentOccupancy}명`
    : `정원 ${facility.capacity}명`;

  const isTopGrade = facility.grade === 1;

  return (
    <div
      className={`group relative rounded-2xl bg-white p-4 shadow-card transition-all duration-300 ease-snappy hover:-translate-y-1 hover:shadow-card-hover ${
        isTopGrade ? "ring-2 ring-accent-300" : ""
      }`}
    >
      <button
        type="button"
        aria-label={favorite ? "관심시설에서 제거" : "관심시설에 추가"}
        onClick={() => toggleFavorite(facility.id)}
        className={`absolute left-2.5 top-2.5 z-10 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition-all duration-200 ease-snappy active:scale-90 ${
          favorite
            ? "scale-110 bg-white text-accent-500"
            : "bg-black/20 text-white hover:scale-110 hover:bg-white hover:text-accent-500"
        }`}
      >
        <Heart size={16} fill={favorite ? "currentColor" : "none"} />
      </button>

      {selectable && (
        <button
          type="button"
          aria-label={selected ? "비교 목록에서 제거" : "비교 목록에 추가"}
          disabled={disabled}
          onClick={() => toggle(facility.id)}
          className={`absolute right-2.5 top-2.5 z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200 ease-snappy active:scale-90 ${
            selected
              ? "scale-110 border-primary-500 bg-primary-500 text-white"
              : disabled
              ? "border-ink-100 text-ink-300 cursor-not-allowed"
              : "border-ink-100 bg-white text-ink-300 hover:scale-110 hover:border-primary-300 hover:text-primary-500"
          }`}
        >
          {order ?? ""}
        </button>
      )}

      <Link
        href={`/facility/${facility.id}`}
        onClick={(e) => {
          e.preventDefault();
          requestFacilityView(facility.id);
        }}
        className="block"
      >
        <div className="mb-3 -mx-4 -mt-4 aspect-[16/9] overflow-hidden rounded-t-2xl">
          <FacilityThumbnail
            facility={facility}
            className="transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5 pr-10">
          <TypeBadge
            type={facility.facilityType}
            label={FACILITY_TYPE_LABEL[facility.facilityType]}
          />
          <GradeBadge grade={facility.grade} gradeSource={facility.gradeSource} />
          {/* 안심지수 — 돌보다의 핵심 지표라 등급 바로 옆, 배지들 중 가장 눈에 띄는 톤으로.
              점수는 목록 API(toCardFacility)가 실어준 것만 쓴다(없으면 안 보여줌).
              "안심지수" 글자를 다 쓰면 "방문요양센터"(6자)+"등급 제외"(4자) 조합에서
              375px 폭을 넘어 두 번째 줄로 밀려났다 — 아이콘이 이미 뜻을 전달하니
              숫자만 남기고, 스크린리더에는 aria-label로 전체 의미를 준다. */}
          {facility.dolbodaTotal != null && (
            <span
              aria-label={`안심지수 ${facility.dolbodaTotal}점`}
              className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                facility.dolbodaTotal >= 85
                  ? "bg-mint-100 text-mint-700"
                  : facility.dolbodaTotal >= 70
                  ? "bg-royal-50 text-royal-600"
                  : "bg-ink-100/70 text-ink-500"
              }`}
            >
              <ShieldCheck size={11} aria-hidden />
              {facility.dolbodaTotal}
            </span>
          )}
          {facility.adminActions && facility.adminActions.length > 0 && (
            <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-600">
              행정처분 이력
            </span>
          )}
          {isHospital(facility) &&
            (facility.emergencyRoom?.day || facility.emergencyRoom?.night) && (
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-bold text-primary-600">
                응급실 운영
              </span>
            )}
          {isHospital(facility) && facility.nurseGrade > 0 && facility.nurseGrade <= 2 && (
            <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-bold text-mint-700">
              간호인력 {facility.nurseGrade}등급
            </span>
          )}
          {facility.establishedYear !== undefined && (
            <span className="text-xs text-ink-300">
              설립 {new Date().getFullYear() - facility.establishedYear}년차
            </span>
          )}
        </div>

        <h3 className="mb-1 text-lg font-bold text-ink-900 group-hover:text-primary-600">
          {facility.name}
        </h3>

        <div className="mb-1 flex items-center gap-1 text-sm text-ink-500">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">{facility.address}</span>
          {distanceKm !== undefined && (
            <span className="ml-1 shrink-0 font-medium text-mint-600">
              {formatDistance(distanceKm)}
            </span>
          )}
        </div>

        {facility.phone && (
          <div className="flex items-center gap-1 text-sm text-ink-500">
            <Phone size={14} className="shrink-0" />
            <span>{facility.phone}</span>
          </div>
        )}

        <div className="mt-3 rounded-xl bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700">
          {keyStat}
        </div>
      </Link>
    </div>
  );
}
