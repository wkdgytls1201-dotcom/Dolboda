"use client";

import Link from "next/link";
import { Heart, MapPin, ShieldCheck, Trophy } from "lucide-react";
import { Facility, FACILITY_TYPE_LABEL, isHospital } from "@/lib/types";
import { formatDistance } from "@/lib/distance";
import { shortAddress } from "@/lib/shortAddress";
import { GradeBadge, TypeBadge } from "./GradeBadge";
import { SCORE_LEVEL_THRESHOLDS } from "@/lib/dolbodaScore";
import { PROGRAM_TAG_META } from "@/lib/programTaxonomy";
import { useCompare } from "@/lib/compareContext";
import { useFavorites } from "@/lib/favoritesContext";
import { FacilityThumbnail } from "./FacilityThumbnail";
import { useViewGate } from "@/lib/viewGateContext";
import { tagFacilityTransition } from "@/lib/navTransition";

export function FacilityCard({
  facility,
  distanceKm,
  selectable = true,
  rankBadge,
}: {
  facility: Facility;
  distanceKm?: number;
  selectable?: boolean;
  /** "내 주변 안심지수 1위" 같은 순위 리본. 목록이 이미 가진 점수로만 계산해 넘긴다. */
  rankBadge?: string;
}) {
  const { toggle, isSelected, selectedIds, canAddMore } = useCompare();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { requestFacilityView } = useViewGate();
  const favorite = isFavorite(facility.id);
  const selected = isSelected(facility.id);
  const order = selected ? selectedIds.indexOf(facility.id) + 1 : null;
  const disabled = !selected && !canAddMore;

  // 방문요양센터는 입소 시설이 아니라 정원 개념이 없다 — "정원 0명" 대신 서비스 성격을 알려준다.
  //
  // 빈자리는 별도 줄로 빼지 않고 여기 이어 붙인다. 보호자가 실제로 궁금한 건 "들어갈 수
  // 있나"인데, 정원·현원만 주고 뺄셈을 시키면 카드에서 바로 판단이 안 된다.
  // 색을 더 쓰지 않는 이유: 위 배지 줄(유형·등급·안심지수)에 이미 색이 세 개다.
  const keyStat = isHospital(facility)
    ? `병상 ${facility.facilityStatus.generalBeds + facility.facilityStatus.upgradeBeds}개` +
      (facility.departments?.length ? ` · 진료과 ${facility.departments.length}개` : "")
    : facility.facilityType === "HOME_CARE"
    ? "우리 집으로 방문 · 정원 제한 없음"
    : facility.currentOccupancy !== undefined
    ? `정원 ${facility.capacity}명 · 현원 ${facility.currentOccupancy}명 · ` +
      (facility.capacity - facility.currentOccupancy > 0
        ? `빈자리 ${facility.capacity - facility.currentOccupancy}`
        : "정원 마감")
    : `정원 ${facility.capacity}명`;

  const isTopGrade = facility.grade === 1;

  // 전화번호 줄을 대신하는 정보. 전화번호는 카드에서 누를 일이 없다(문의는 상담 신청으로
  // 모았다). 프로그램 태그는 종류가 많아도 카드에선 2개까지만 — 더 넣으면 줄이 밀리고
  // 눈에도 안 들어온다.
  const programTags = (isHospital(facility) ? [] : facility.programTags ?? [])
    .slice(0, 2)
    .map((t) => PROGRAM_TAG_META[t.tag]?.label)
    .filter(Boolean) as string[];

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
          // 수정키 클릭(새 탭·창)은 브라우저 기본 동작에 맡긴다 — href가 진짜라서 가능
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          // 클릭한 카드의 사진·시설명만 상세로 이어지는 전환 대상으로 표시
          tagFacilityTransition(e.currentTarget);
          requestFacilityView(facility.id);
        }}
        className="block transition-transform duration-150 ease-snappy active:scale-[0.98]"
      >
        <div data-vt-hero="" className="relative mb-3 -mx-4 -mt-4 aspect-[16/9] overflow-hidden rounded-t-2xl">
          <FacilityThumbnail
            facility={facility}
            className="transition-transform duration-500 group-hover:scale-105"
          />
          {/* 순위 리본은 사진 위에 올린다 — 배지 줄(유형·등급·안심지수)은 이미 좁은 폭에서
              두 줄로 밀리기 직전이라 여기에 더 넣으면 주소까지 아래로 밀린다.
              브랜드 보라 그라데이션 + 금색 트로피로, 사진 톤이 무엇이든 눈에 먼저 들어오게. */}
          {rankBadge && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-royal-gradient px-3 py-1.5 text-xs font-extrabold tracking-tight text-white shadow-royal ring-2 ring-white/70">
              <Trophy size={13} className="shrink-0 text-accent-300" aria-hidden />
              {rankBadge}
            </span>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1 pr-10">
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
                facility.dolbodaTotal >= SCORE_LEVEL_THRESHOLDS.veryGood
                  ? "bg-mint-100 text-mint-700"
                  : facility.dolbodaTotal >= SCORE_LEVEL_THRESHOLDS.good
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

        {/* 시설명·주소 모두 한 줄로 자르고 뒤를 …로 표기한다.
            예전엔 둘 다 두 줄까지 허용했는데, 긴 것이 겹치면 카드 높이가 제각각이 돼
            목록이 들쭉날쭉해졌다("의료법인승인의료재단동창원요양병원" +
            "…, 동창원요양병원 1,2,3,4층 지하1층(103호)호" 조합에서 실제로 4줄이 됐다).
            잘려도 정보가 남는다 — 시설명은 앞쪽에 법인명이 아니라 고유명이 오는 경우가
            대부분이고, 주소는 "어느 동네인가"를 정하는 시/군/구·동이 맨 앞에 있어서
            뒤로 밀리는 건 건물명·층·호수처럼 목록에서는 볼 이유가 없는 부분이다.
            (전체 값은 상세 페이지에 그대로 있다.) */}
        <h3
          data-vt-title=""
          className="mb-1 truncate text-lg font-bold leading-snug text-ink-900 group-hover:text-primary-600"
        >
          {facility.name}
        </h3>

        <div className="mb-1 flex items-center gap-1 text-sm text-ink-500">
          <MapPin size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{shortAddress(facility.address)}</span>
          {distanceKm !== undefined && (
            <span className="shrink-0 font-medium text-mint-600">{formatDistance(distanceKm)}</span>
          )}
        </div>

        {/* 프로그램은 "무엇을 하며 하루를 보내는가"라 알아둘 값어치가 있지만, 카드의 주인공은
            아니다. 칩·색을 쓰면 위쪽 배지들과 뒤엉켜 조잡해져서 옅은 한 줄로만 둔다. */}
        {programTags.length > 0 && (
          <p className="line-clamp-1 text-xs text-ink-300">{programTags.join(" · ")}</p>
        )}

        <div className="mt-3 rounded-xl bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700">
          {keyStat}
        </div>
      </Link>
    </div>
  );
}
