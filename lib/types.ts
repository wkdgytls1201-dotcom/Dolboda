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
}

// 행정처분(위반사실 공표) 이력 — scripts/import-admin-actions.mjs 로 채운다
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
  photos?: string[];
  parking?: {
    spots: number;
    isFree: boolean;
  };
  adminActions?: AdminAction[];
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
