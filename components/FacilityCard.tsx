"use client";

import Link from "next/link";
import { useRef } from "react";
import { Heart, MapPin, ShieldCheck, Trophy } from "lucide-react";
import { markFacilityCardForTransition } from "@/lib/facilityTransition";
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
  // 연속 터치로 전환이 두 번 시작되는 것을 막는 잠금. state가 아니라 ref를 쓰는 이유는
  // 이 값이 바뀔 때 카드를 다시 그릴 필요가 전혀 없기 때문이다(불필요한 리렌더 방지).
  const navigatingRef = useRef(false);
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
      // 목록으로 되돌아왔을 때 "직전에 누른 시설이 어느 카드였는지" 찾는 표시
      // (lib/facilityTransition.ts의 restoreFacilityCardTransition)
      data-vt-card={facility.id}
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
          // 빠르게 두 번 눌러도 전환이 겹치지 않게 — 이미 넘어가는 중이면 무시한다.
          if (navigatingRef.current) return;
          navigatingRef.current = true;
          // 혹시 이동이 막히는 경우(로그인 모달 등)에 대비해 잠시 뒤 풀어준다.
          window.setTimeout(() => {
            navigatingRef.current = false;
          }, 1000);

          // 누른 카드의 사진·시설명·배지에 상세 페이지와 짝이 될 이름을 붙인다.
          // 자세한 원리와 예외 처리는 lib/facilityTransition.ts 상단 주석 참고.
          markFacilityCardForTransition(e.currentTarget, facility.id);
          requestFacilityView(facility.id);
        }}
        className="block transition-transform duration-150 ease-snappy active:scale-[0.98]"
      >
        <div
          data-vt-hero
          className="relative mb-3 -mx-4 -mt-4 aspect-[16/9] overflow-hidden rounded-t-2xl"
        >
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
          {/* 유형·등급 배지는 상세 페이지 헤더에도 똑같이 있다 — 이 둘만 묶어 전환의
              짝으로 삼는다. 안심지수(카드에만)·설립년차(상세에만)처럼 한쪽에만 있는
              것까지 묶으면 서로 다른 내용이 겹쳐 morph돼 오히려 지저분해진다. */}
          <span data-vt-badges className="flex items-center gap-1">
            <TypeBadge
              type={facility.facilityType}
              label={FACILITY_TYPE_LABEL[facility.facilityType]}
            />
            <GradeBadge grade={facility.grade} gradeSource={facility.gradeSource} />
          </span>
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

        {/* 시설명은 긴 것이 많다("시립서대문노인종합복지관데이케어센터") — 한 줄로 자르면
            어느 시설인지 알 수 없어서 두 줄까지 허용한다 */}
        <h3
          data-vt-title
          className="mb-1 line-clamp-2 text-lg font-bold leading-snug text-ink-900 group-hover:text-primary-600"
        >
          {facility.name}
        </h3>

        {/* 주소는 "어느 동네인가"를 판단하는 핵심 정보라 잘리면 안 된다.
            시/도 정식명칭만 줄이고(서울특별시→서울) 그래도 길면 두 줄로 흘린다. */}
        <div className="mb-1 flex items-start gap-1 text-sm text-ink-500">
          <MapPin size={14} className="mt-[3px] shrink-0" />
          <span className="line-clamp-2 min-w-0 flex-1">{shortAddress(facility.address)}</span>
          {distanceKm !== undefined && (
            <span className="mt-[1px] shrink-0 font-medium text-mint-600">
              {formatDistance(distanceKm)}
            </span>
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
