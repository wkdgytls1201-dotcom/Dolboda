export type FacilityType =
  | "NURSING_HOSPITAL" // 요양병원 (HIRA)
  | "NURSING_HOME" // 요양원 (NHIS)
  | "DAY_NIGHT_CARE" // 주야간보호센터 (NHIS)
  | "HOME_CARE" // 방문요양센터 (NHIS)
  | "SILVER_TOWN"; // 실버타운 (민간)

export const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  NURSING_HOSPITAL: "요양병원",
  NURSING_HOME: "요양원",
  DAY_NIGHT_CARE: "주야간보호센터",
  HOME_CARE: "방문요양센터",
  SILVER_TOWN: "실버타운",
};

export interface NonCoveredFee {
  name: string;
  min: number;
  max: number;
}

export interface Department {
  name: string;
  doctorCount: number;
}

export interface EquipmentItem {
  name: string;
  count: number;
}

// 요양병원 전용 (건강보험심사평가원 HIRA 데이터 구조)
export interface NursingHospitalExtra {
  doctorGrade: number; // 의사 인력 등급 (1~6)
  nurseGrade: number; // 간호 인력 등급 (1~6)
  nonCoveredFees: NonCoveredFee[];
  departments: Department[];
  staff: {
    generalDoctors: number;
    specialistDoctors: number;
    socialWorkers: number;
    physicalTherapists: number;
    occupationalTherapists: number;
    pharmacists: number;
  };
  facilityStatus: {
    generalBeds: number;
    upgradeBeds: number;
    physicalTherapyRooms: number;
    isolationRooms: number;
  };
  emergencyRoom: {
    day: boolean;
    night: boolean;
  };
  equipment: EquipmentItem[];
}

export interface MealCostItem {
  name: string; // 식재료비, 간식비용 등
  monthly: number;
  daily: number;
}

export interface EvaluationDomainScore {
  name: string;
  score: number; // 0~100
}

// 국민건강보험공단 장기요양기관 정기평가 상세 (해당 있는 시설만)
export interface EvaluationDetail {
  evaluatedAt: string;
  totalScore: number;
  nationalAverage: number;
  /** 같은 시군구 평균 — import-evaluations.mjs가 시군구당 3곳 이상일 때만 채움 */
  regionAverage?: number;
  regionName?: string;
  domains: EvaluationDomainScore[];
}

export interface CareProgram {
  name: string;
  targetCount: number;
  frequency: string;
  location: string;
  category?: string; // 인지기능향상·신체활동 등 (공단 상세정보에서 채움)
}

// 공단 "장기요양기관 상세정보"에서만 오는 값들 — scripts/map-institutions-to-facilities.mjs 참고
export interface InstitutionInfo {
  homepage?: string;
  email?: string;
  transport?: string; // 교통편 안내
  operatingHours?: string;
  parkingInfo?: string;
  designatedAt?: string; // 지정일자
  liabilityInsurance?: boolean; // 손해배상책임보험
  professionalLiabilityInsurance?: boolean; // 전문인배상책임보험
  integratedHomeCare?: boolean; // 통합재가급여 제공
}

// 직종별 근속 분포 — 오래 일한 직원이 많을수록 돌봄이 안정적이라는 신호
export interface TenureStat {
  role: string;
  total: number;
  over2y: number;
  y1to2: number;
  under1y: number;
  // 1년 미만을 세 구간으로 나눈 값 (공단 원본에 있던 것을 2026-08-03에 살렸다).
  // 근무환경 지수의 "초기 이직" 신호가 이 값을 쓴다 — 1년 이상 근속률은 오래된
  // 시설일수록 유리해서 "지금 사람이 나가고 있는가"를 못 본다.
  // 옛 데이터에는 없을 수 있어 optional이다.
  under3m?: number;
  m3to6?: number;
  m6to1y?: number;
}

// 요양원 / 주야간보호 / 방문요양 (국민건강보험공단 NHIS 데이터 구조)
export interface NursingHomeExtra {
  capacity: number; // 정원
  currentOccupancy?: number; // 현원 (공공데이터 미제공 시 undefined)
  waitlistCount?: number; // 대기자 수 (공공데이터 미제공 시 undefined)
  staff: {
    careWorkers: number; // 요양보호사
    nurses: number; // 간호(조무)사
    socialWorkers: number; // 사회복지사
    physicalTherapists: number;
  };
  staffDetail: {
    administrative: { facilityHead: number; officeManager: number; staff: number };
    socialCare: { socialWorkers: number; physicalTherapists: number; occupationalTherapists: number };
    medical: { fullTimeDoctors: number; partTimeDoctors: number; nurses: number; nursingAssistants: number };
  };
  roomTypes: string[]; // 다인실/1인실 등 (뱃지용 요약)
  facilityRooms: {
    bedrooms: { single: number; double: number; triple: number; quad: number; special: number };
    medical: { nursingRoom: number; rehabRoom: number };
    dining: { diningRoom: number; restroom: number; bathroom: number };
  };
  nonCoveredFees: MealCostItem[];
  evaluationDetail?: EvaluationDetail;
  programs: CareProgram[];

  // --- 아래는 공단 상세정보(Institution)에서 매핑해 채우는 값들. 매칭 안 된 시설은 없다. ---
  instCode?: string; // 공단 기관번호 — 다음 갱신 때 이름 대신 이걸로 붙인다
  staffTotal?: number;
  careWorkerDetail?: { level1: number; level2: number; provisional: number; total: number };
  programRoomCount?: number;
  /** 프로그램 태그 요약 — scripts/build-program-tags.mts가 미리 계산해 넣는다 */
  programTags?: import("./programTaxonomy").ProgramTagSummary[];
  availableSlots?: number; // 이용 가능 인원 (정원-현원과 다를 수 있는 공단 집계값)
  tenure?: TenureStat[];
  institutionInfo?: InstitutionInfo;
  otherServices?: string[]; // 같은 기관이 함께 제공하는 다른 급여 (방문목욕·복지용구 등)
  hasDementiaUnit?: boolean; // 치매전담실 보유
}

// 행정처분(위반사실 공표) 이력 — scripts/import-admin-actions.mjs 로 채운다
// 시설 실사진의 촬영 영역 — 메인은 반드시 외관(건물 밖에서 본 모습)이어야 한다.
// 보호자가 찾아갈 때 알아볼 수 있는 사진이 첫인상이 되게 하기 위함.
export type FacilityPhotoArea =
  | "exterior" // 외관 (메인)
  | "entrance" // 입구·로비
  | "common" // 거실·공용공간
  | "room" // 생활실·침실
  | "program" // 프로그램·활동
  | "dining" // 식당·급식
  | "rehab" // 재활·물리치료
  | "outdoor" // 마당·산책로
  | "etc"; // 기타

export const PHOTO_AREA_LABEL: Record<FacilityPhotoArea, string> = {
  exterior: "외관",
  entrance: "입구·로비",
  common: "거실·공용공간",
  room: "생활실",
  program: "프로그램·활동",
  dining: "식당·급식",
  rehab: "재활·물리치료",
  outdoor: "마당·산책로",
  etc: "기타",
};

/** 갤러리에서 보여주는 순서 — 외관(찾아가는 길) → 생활 공간 → 활동 → 부대시설 */
export const PHOTO_AREA_ORDER: FacilityPhotoArea[] = [
  "exterior",
  "common",
  "room",
  "program",
  "dining",
  "rehab",
  "outdoor",
  "entrance",
  "etc",
];

export interface FacilityPhoto {
  url: string;
  area: FacilityPhotoArea;
  caption?: string;
}

export interface AdminAction {
  type: string; // 처분 내용 (업무정지, 지정취소, 경고 등)
  reason: string; // 위반 내용
  date: string; // 처분일 또는 공표일
}

export interface FacilityBase {
  id: string;
  name: string;
  facilityType: FacilityType;
  // "mock" = 데모용 가상 시설(스톡 사진 사용 가능), "public" = 실제 공공데이터로 채운 실존 시설
  // (실명 시설에 무관한 사진을 붙이면 오인 소지가 있어 실사진 확보 전까지는 플레이스홀더만 사용)
  dataSource: "mock" | "public";
  gradeSource: "HIRA" | "NHIS";
  grade: number | null; // 1~5, null=등급 제외
  address: string;
  lat?: number; // 지도 API 연동 전까지 실데이터 시설은 좌표 미제공
  lng?: number;
  phone?: string; // 공공데이터에 연락처가 없는 경우 undefined
  establishedYear?: number; // 공공데이터에 설립연도가 없는 경우 undefined
  updatedAt: string;
  // 시설이 동의하고 제공한 실제 사진 URL 목록 (아직 수집 전이라 대부분 undefined/빈 배열).
  // 2장 이상일 때만 상세페이지에서 옆으로 넘기는 갤러리로 보여준다.
  // 가져오기 스크립트가 외관 사진을 항상 첫 번째로 넣는다 — 카드 썸네일은 [0]만 쓴다.
  photos?: string[];
  // 영역 정보가 붙은 구조화 사진 목록 (photos와 같은 사진, 상세 갤러리가 영역 라벨에 사용).
  // scripts/import-facility-photos.mts가 photos와 함께 채운다.
  photoItems?: FacilityPhoto[];
  parking?: {
    spots: number;
    isFree: boolean;
  };
  adminActions?: AdminAction[];
  /** 목록 카드용 안심지수 총점 — 서버(toCardFacility)가 미리 계산해 실어준다.
      상세 페이지는 인근 병원 거리(extras)까지 반영해 직접 계산하므로 몇 점 다를 수 있다. */
  dolbodaTotal?: number | null;
}

export type Facility =
  | (FacilityBase & { facilityType: "NURSING_HOSPITAL" } & NursingHospitalExtra)
  | (FacilityBase & {
      facilityType: "NURSING_HOME" | "DAY_NIGHT_CARE" | "HOME_CARE" | "SILVER_TOWN";
    } & NursingHomeExtra);

export function isHospital(
  f: Facility
): f is FacilityBase & { facilityType: "NURSING_HOSPITAL" } & NursingHospitalExtra {
  return f.facilityType === "NURSING_HOSPITAL";
}
