// 장기요양등급별 이용 가능 급여 안내.
//
// 제도의 구조만 설명한다 — 금액·한도는 매년 고시로 바뀌므로 적지 않는다(프로젝트 규칙).
// 근거: 노인장기요양보험 급여 체계 — 시설급여(요양원)는 1·2등급 원칙,
// 3~5등급은 재가급여가 원칙이고 시설 입소는 예외 사유 인정 시 가능,
// 인지지원등급은 재가(주야간보호 중심)만 이용할 수 있다.

import type { FacilityType } from "./types";

export interface LtcGuide {
  /** 한 줄 요약 — 프로필 카드·대시보드에서 사용 */
  summary: string;
  /** 이용 가능/권장 서비스 설명 */
  detail: string;
  /** 맞춤 검색 CTA */
  cta: { label: string; href: string } | null;
}

export function ltcGuideFor(ltcGrade: string | null): LtcGuide | null {
  switch (ltcGrade) {
    case "1등급":
    case "2등급":
      return {
        summary: "요양원 입소와 재가 서비스 모두 이용하실 수 있어요",
        detail:
          "시설급여(요양원 입소)와 재가급여(방문요양·주야간보호) 중 상황에 맞게 선택할 수 있는 등급이에요.",
        cta: { label: "요양원 찾아보기", href: "/search?type=NURSING_HOME" },
      };
    case "3등급":
    case "4등급":
      return {
        summary: "재가 서비스(방문요양·주야간보호)가 기본이에요",
        detail:
          "자택에서 방문요양·주야간보호를 이용하는 것이 원칙이에요. 요양원 입소는 가족 돌봄이 어려운 사유가 인정될 때 가능해요.",
        cta: {
          label: "주야간보호·방문요양 찾아보기",
          href: "/search?type=DAY_NIGHT_CARE,HOME_CARE",
        },
      };
    case "5등급":
      return {
        summary: "치매 어르신 대상 재가 서비스를 이용하실 수 있어요",
        detail:
          "치매 진단이 확인된 경우의 등급으로, 인지활동형 방문요양과 주야간보호(치매전담)를 주로 이용해요.",
        cta: {
          label: "인지 프로그램 있는 주야간보호 보기",
          href: "/search?type=DAY_NIGHT_CARE&programTags=cognitive",
        },
      };
    case "인지지원등급":
      return {
        summary: "주야간보호를 중심으로 이용하실 수 있어요",
        detail:
          "신체 기능이 비교적 유지되는 치매 어르신 대상 등급이라 요양원 입소는 해당되지 않고, 주야간보호 중심으로 이용해요.",
        cta: {
          label: "주야간보호센터 찾아보기",
          href: "/search?type=DAY_NIGHT_CARE&programTags=cognitive",
        },
      };
    case "등급 외 판정":
      return {
        summary: "장기요양보험 급여 대상은 아니지만 다른 지원이 있어요",
        detail:
          "지자체의 노인맞춤돌봄서비스나 치매안심센터 프로그램을 이용할 수 있어요. 상태가 달라지면 등급을 다시 신청할 수 있어요.",
        cta: { label: "등급이 어떻게 나올지 다시 확인해보기", href: "/grade-test" },
      };
    case "신청 준비 중":
      return {
        summary: "신청 전 예상 등급을 미리 확인해보세요",
        detail:
          "공단 방문조사 전에 예상 구간을 알아두면 어떤 서비스를 알아볼지 가늠하기 좋아요.",
        cta: { label: "예상 등급 테스트 해보기", href: "/grade-test" },
      };
    case "아직 몰라요":
      return {
        summary: "장기요양등급부터 알아보시는 걸 권해요",
        detail:
          "등급이 있으면 요양원·방문요양 비용의 상당 부분을 보험이 부담해요. 3분 테스트로 예상 구간을 확인해보세요.",
        cta: { label: "예상 등급 테스트 해보기", href: "/grade-test" },
      };
    default:
      return null;
  }
}

/**
 * 시설 상세 체크포인트용 — 이 등급으로 이 유형의 시설을 이용할 수 있는지.
 * 확실히 말할 수 있는 조합만 값을 내고, 애매하면 null(항목 미생성).
 */
export function gradeFacilityFit(
  ltcGrade: string | null,
  facilityType: FacilityType
): { ok: boolean; note: string } | null {
  if (!ltcGrade) return null;

  if (facilityType === "NURSING_HOME") {
    if (ltcGrade === "1등급" || ltcGrade === "2등급") {
      return { ok: true, note: "시설급여 대상 등급이라 입소 신청이 가능해요" };
    }
    if (ltcGrade === "3등급" || ltcGrade === "4등급" || ltcGrade === "5등급") {
      return {
        ok: false,
        note: "재가급여가 원칙인 등급이에요 — 입소는 예외 사유 인정이 필요하니 시설·공단에 확인하세요",
      };
    }
    if (ltcGrade === "인지지원등급") {
      return { ok: false, note: "인지지원등급은 요양원 시설급여 대상이 아니에요" };
    }
  }

  if (facilityType === "DAY_NIGHT_CARE" || facilityType === "HOME_CARE") {
    if (
      ["1등급", "2등급", "3등급", "4등급", "5등급", "인지지원등급"].includes(ltcGrade)
    ) {
      return { ok: true, note: "재가급여로 이용하실 수 있는 등급이에요" };
    }
  }

  return null;
}
