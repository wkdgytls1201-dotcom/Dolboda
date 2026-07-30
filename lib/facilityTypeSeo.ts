import type { FacilityType } from "./types";

// 지역+유형 조합 랜딩(/region/[시도]/[시군구]/[유형])에서 쓰는 매핑.
// slug는 사람들이 실제로 검색하는 짧은 말(방문요양, 요양원 …)을 그대로 URL에 쓴다.
export interface FacilityTypeSeo {
  slug: string;
  type: FacilityType;
  label: string; // 공식 명칭
  short: string; // 제목에 쓰는 짧은 표기
  keywords: string[]; // 설명문에 자연스럽게 녹일 동의어
  intro: string; // 유형 설명 한 문단
}

export const FACILITY_TYPE_SEO: FacilityTypeSeo[] = [
  {
    slug: "방문요양",
    type: "HOME_CARE",
    label: "방문요양센터",
    short: "방문요양",
    keywords: ["방문요양센터", "재가요양", "재가복지센터", "가정 방문 돌봄", "요양보호사 방문"],
    intro:
      "요양보호사가 어르신 댁으로 찾아가 식사·세면·가사·말벗 등 일상생활을 돕는 재가급여 서비스예요. 장기요양등급을 받으면 본인부담금만 내고 이용할 수 있어 집에서 계속 지내고 싶은 어르신께 적합해요.",
  },
  {
    slug: "요양원",
    type: "NURSING_HOME",
    label: "요양원",
    short: "요양원",
    keywords: ["노인요양시설", "요양시설", "입소시설", "장기요양기관"],
    intro:
      "어르신이 입소해 24시간 생활하며 돌봄을 받는 노인요양시설이에요. 요양보호사가 상주해 식사·목욕·배설을 돕고, 장기요양 1~2등급(또는 시설급여 판정)을 받은 경우 이용할 수 있어요.",
  },
  {
    slug: "주야간보호",
    type: "DAY_NIGHT_CARE",
    label: "주야간보호센터",
    short: "주야간보호",
    keywords: ["데이케어센터", "노인주간보호", "낮 돌봄", "데이케어"],
    intro:
      "낮 시간 동안 어르신을 모셔 프로그램·식사·건강관리를 제공하고 저녁에 댁으로 모셔다드리는 서비스예요. 가족이 낮에 일해야 하는 경우 집에서 계속 모시면서 돌봄 공백을 메울 수 있어요.",
  },
  {
    slug: "요양병원",
    type: "NURSING_HOSPITAL",
    label: "요양병원",
    short: "요양병원",
    keywords: ["노인병원", "재활병원", "입원 치료", "간병"],
    intro:
      "의사와 간호사가 상주하는 의료기관으로, 치료·재활·투약 관리가 필요한 어르신이 입원해 지내는 곳이에요. 건강보험이 적용되며 요양원과 달리 의료 행위가 가능해요.",
  },
  {
    slug: "실버타운",
    type: "SILVER_TOWN",
    label: "실버타운",
    short: "실버타운",
    keywords: ["노인복지주택", "시니어타운", "유료양로시설"],
    intro:
      "건강한 어르신이 생활 편의·여가 서비스를 받으며 지내는 노인복지주택이에요. 요양등급 없이 이용하며 비용은 전액 본인 부담이에요.",
  },
];

export function findTypeSeoBySlug(slug: string): FacilityTypeSeo | undefined {
  return FACILITY_TYPE_SEO.find((t) => t.slug === slug);
}

export function findTypeSeoByType(type: FacilityType): FacilityTypeSeo | undefined {
  return FACILITY_TYPE_SEO.find((t) => t.type === type);
}
