// 돌보다 AI기반 안심지수 — 공공데이터 항목을 6개 영역 점수로 매핑해 가중 평균한 값.
// 원칙: 없는 데이터는 지어내지 않는다. 데이터가 없는 신호는 제외하고 가중치를 남은 영역에 재분배하며,
// 확보된 가중치가 절반 미만이면 점수를 아예 내지 않는다(산출 보류).

import { Facility, isHospital } from "./types";

export type ScoreAreaKey =
  | "safety"
  | "medical"
  | "care"
  | "environment"
  | "transparency"
  | "availability";

// 보호자 의사결정 우선순위 기반 가중치:
// 1순위 "학대당하지 않을까" → 안전·신뢰 27%
// 2순위 "갑자기 아프면 대응이 될까" → 의료·간호 대응 23%
// 환경(청결·냄새 등)은 방문하면 직접 확인 가능해 플랫폼 정보가치가 낮아 10%
export const SCORE_AREAS: { key: ScoreAreaKey; label: string; weight: number }[] = [
  { key: "safety", label: "안전·신뢰", weight: 27 },
  { key: "medical", label: "의료·간호 대응", weight: 23 },
  { key: "care", label: "돌봄·운영 전문성", weight: 20 },
  { key: "environment", label: "생활·환경", weight: 10 },
  { key: "transparency", label: "정보 투명성", weight: 10 },
  { key: "availability", label: "이용 가능성", weight: 10 },
];

// 화면에는 가중치를 숫자로 노출하지 않는다.
// 퍼센트를 그대로 나열하면 우리가 설계한 지표라기보다 계산표처럼 보이고,
// 반대로 아예 가리면 "뭘 숨기나" 싶어 신뢰를 잃는다 — 비중의 크기만 말로 밝힌다.
export function weightTier(weight: number): { label: string; tone: string } {
  if (weight >= 25) return { label: "핵심 반영", tone: "bg-primary-50 text-primary-600" };
  if (weight >= 15) return { label: "높게 반영", tone: "bg-royal-50 text-royal-600" };
  return { label: "보조 반영", tone: "bg-ink-100/60 text-ink-500" };
}

export interface ScoreSignal {
  label: string;
  score: number | null; // null = 공공데이터 미확보
  weight?: number; // 영역 내 상대 중요도 (기본 1)
  note?: string;
}

export interface ScoreArea {
  key: ScoreAreaKey;
  label: string;
  weight: number;
  score: number | null; // null = 이 영역을 계산할 데이터가 전혀 없음
  signals: ScoreSignal[];
}

export interface DolbodaScore {
  total: number | null; // null = 데이터가 부족해 산출 보류
  coverage: number; // 확보된 가중치 비율 0~100
  areas: ScoreArea[];
}

function gradeToScore(grade: number | null): number | null {
  if (grade == null || grade < 1 || grade > 5) return null;
  return [95, 80, 65, 45, 25][grade - 1];
}

// 데이터가 부족한 시설이 만점처럼 보이지 않게, 미확보 가중치만큼 전국 평균 수준으로 수렴시킨다
const PRIOR_SCORE = 65;

// 영역 내 신호별 가중 평균 — 중요한 신호(평가등급·인력등급)가 부수 신호(연락처 등)에 희석되지 않게 한다
function weightedAvg(signals: ScoreSignal[]): number | null {
  const available = signals.filter((s) => s.score != null);
  if (available.length === 0) return null;
  const totalWeight = available.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  return Math.round(
    available.reduce((sum, s) => sum + (s.score as number) * (s.weight ?? 1), 0) / totalWeight
  );
}

const CURRENT_YEAR = new Date().getFullYear();

// 행정처분(위반사실 공표) 이력은 안전·신뢰의 최우선 감점 요인.
// 이력이 없는 시설엔 신호 자체를 만들지 않는다 — 공표 안 됨과 무위반을 구분할 수 없기 때문.
function adminActionSignal(f: Facility): ScoreSignal[] {
  if (!f.adminActions || f.adminActions.length === 0) return [];
  return [
    {
      label: "행정처분 이력",
      score: 0,
      weight: 4,
      note: `${f.adminActions.length}건 공표됨`,
    },
  ];
}

function historyScore(establishedYear?: number): number | null {
  if (!establishedYear) return null;
  const years = CURRENT_YEAR - establishedYear;
  if (years >= 10) return 100;
  if (years >= 5) return 80;
  if (years >= 3) return 60;
  return 40;
}

function findDomain(f: Facility, keyword: string): number | null {
  if (isHospital(f)) return null;
  const d = f.evaluationDetail?.domains.find((x) => x.name.includes(keyword));
  return d ? Math.round(d.score) : null;
}

function hospitalAreas(f: Facility & { facilityType: "NURSING_HOSPITAL" }): ScoreSignal[][] {
  const totalDoctors = f.staff.generalDoctors + f.staff.specialistDoctors;
  const rehabStaff = f.staff.physicalTherapists + f.staff.occupationalTherapists;

  const safety: ScoreSignal[] = [
    ...adminActionSignal(f),
    { label: "심평원 적정성 평가등급", score: gradeToScore(f.grade), weight: 3 },
    {
      label: "격리실 보유(감염 대응)",
      score: f.facilityStatus.isolationRooms > 0 ? 100 : 40,
      note: f.facilityStatus.isolationRooms > 0 ? `${f.facilityStatus.isolationRooms}실` : "없음",
    },
    { label: "운영 연혁", score: historyScore(f.establishedYear) },
  ];

  const medical: ScoreSignal[] = [
    {
      label: "의사인력 등급",
      score: f.doctorGrade > 0 ? Math.max(0, 100 - (f.doctorGrade - 1) * 25) : null,
      weight: 3,
    },
    {
      label: "간호인력 등급",
      score: f.nurseGrade > 0 ? Math.max(0, 100 - (f.nurseGrade - 1) * 16) : null,
      weight: 3,
    },
    {
      label: "전문의 비중",
      score:
        totalDoctors > 0 ? Math.round((f.staff.specialistDoctors / totalDoctors) * 100) : null,
      weight: 2,
    },
    {
      label: "진료과목 다양성",
      score:
        f.departments.length >= 6
          ? 100
          : f.departments.length >= 4
          ? 80
          : f.departments.length >= 2
          ? 60
          : f.departments.length === 1
          ? 40
          : null,
    },
  ];
  if (f.emergencyRoom.day || f.emergencyRoom.night) {
    medical.push({ label: "응급실 운영", score: 100 });
  }

  const care: ScoreSignal[] = [
    {
      label: "재활 인력(물리·작업치료사)",
      score: rehabStaff >= 5 ? 100 : rehabStaff >= 2 ? 75 : rehabStaff >= 1 ? 55 : 25,
      note: `${rehabStaff}명`,
      weight: 3,
    },
    {
      label: "물리치료실",
      score: f.facilityStatus.physicalTherapyRooms > 0 ? 100 : 30,
    },
    { label: "사회복지사 배치", score: f.staff.socialWorkers > 0 ? 100 : 40 },
    { label: "약사 배치", score: f.staff.pharmacists > 0 ? 100 : 40 },
  ];

  const beds = f.facilityStatus.generalBeds;
  const environment: ScoreSignal[] = [
    {
      label: "상급병상(1~3인실) 보유",
      score: f.facilityStatus.upgradeBeds > 0 ? 100 : 50,
      note: f.facilityStatus.upgradeBeds > 0 ? `${f.facilityStatus.upgradeBeds}병상` : undefined,
    },
    {
      label: "병상 규모",
      score: beds >= 100 && beds <= 300 ? 100 : beds >= 50 ? 75 : beds > 0 ? 55 : null,
      note: beds > 0 ? `${beds}병상` : undefined,
    },
    {
      label: "의료장비 보유",
      score: f.equipment.length >= 3 ? 100 : f.equipment.length >= 1 ? 75 : 40,
    },
  ];

  const transparency: ScoreSignal[] = [
    {
      label: "비급여 비용 공개",
      score: f.nonCoveredFees.length >= 5 ? 100 : f.nonCoveredFees.length >= 1 ? 75 : 20,
      note: `${f.nonCoveredFees.length}개 항목`,
      weight: 2,
    },
    { label: "연락처 공개", score: f.phone ? 100 : 30 },
  ];

  const availability: ScoreSignal[] = [
    { label: "병상 여유", score: null, note: "실시간 병상 정보는 아직 공개되지 않았어요" },
  ];

  return [safety, medical, care, environment, transparency, availability];
}

// 점수 계산에 시설 객체 밖에서 오는 보조 데이터 (없어도 동작)
export interface ScoreExtras {
  /** 최근접 요양병원까지 거리(km) — 응급 상황 의료 접근성의 대리 지표 */
  nearestHospitalKm?: number | null;
}

function nhisAreas(
  f: Facility & { facilityType: "NURSING_HOME" | "DAY_NIGHT_CARE" | "HOME_CARE" | "SILVER_TOWN" },
  extras?: ScoreExtras
): ScoreSignal[][] {
  const hasCapacity = f.capacity > 0;
  const occupancy = f.currentOccupancy ?? 0;
  const vacancy = hasCapacity ? f.capacity - occupancy : 0;
  const waitlist = f.waitlistCount ?? 0;

  const safety: ScoreSignal[] = [
    ...adminActionSignal(f),
    { label: "공단 정기평가 등급", score: gradeToScore(f.grade), weight: 3 },
    { label: "환경·안전 평가점수", score: findDomain(f, "안전"), weight: 2 },
    { label: "수급자 권리보장 점수", score: findDomain(f, "권리"), weight: 2 },
  ];
  // 입소 대기가 있다는 건 지역 보호자들이 기다려서라도 선택한다는 신뢰 신호
  if ((f.waitlistCount ?? 0) > 0) {
    safety.push({
      label: "입소 대기 수요",
      score: f.waitlistCount! >= 10 ? 95 : f.waitlistCount! >= 5 ? 85 : 75,
      note: `대기 ${f.waitlistCount}명`,
    });
  }

  const km = extras?.nearestHospitalKm;
  // 공단 상세정보를 매핑한 시설은 실제 인력 수가 있다. 정원 대비 간호인력 비율로 대응력을 본다.
  const nurseCount = f.staffDetail.medical.nurses + f.staffDetail.medical.nursingAssistants;
  const hasStaffData = (f.staffTotal ?? 0) > 0;
  const perNurse = nurseCount > 0 && f.capacity > 0 ? f.capacity / nurseCount : null;
  const medical: ScoreSignal[] = [
    {
      label: "간호인력 배치",
      score: !hasStaffData
        ? null
        : nurseCount === 0
        ? 30
        : perNurse == null
        ? 70 // 재가처럼 정원 개념이 없으면 배치 사실만으로 중간 이상
        : perNurse <= 15
        ? 100
        : perNurse <= 25
        ? 85
        : perNurse <= 40
        ? 65
        : 45,
      weight: 3,
      note: !hasStaffData
        ? "이 시설의 인력현황은 공공데이터에 아직 공개되지 않았어요"
        : nurseCount === 0
        ? "간호사·간호조무사 배치 없음"
        : perNurse == null
        ? `간호인력 ${nurseCount}명`
        : `간호인력 ${nurseCount}명 · 1명당 정원 ${Math.round(perNurse)}명`,
    },
    {
      label: "인근 요양병원 접근성",
      score:
        km == null ? null : km <= 2 ? 100 : km <= 5 ? 85 : km <= 10 ? 70 : km <= 20 ? 50 : 30,
      weight: 2,
      note: km == null ? "위치 정보 확인 중" : `가장 가까운 요양병원 ${km.toFixed(1)}km`,
    },
  ];

  // 요양보호사 1명이 몇 분을 돌보는지 — 법정 기준은 요양원 2.1:1, 낮을수록 여유가 있다
  const careWorkers = f.careWorkerDetail?.total ?? 0;
  const perCareWorker = careWorkers > 0 && f.capacity > 0 ? f.capacity / careWorkers : null;
  // 프로그램 종류 수 — 인지·신체활동이 다양할수록 하루가 단조롭지 않다
  const programCategories = new Set((f.programs ?? []).map((p) => p.category ?? "기타")).size;
  // 2년 이상 근속 비율 — 익숙한 분이 계속 돌봐주는지
  const tenureTotal = (f.tenure ?? []).reduce((s, t) => s + t.total, 0);
  const tenureOver2y = (f.tenure ?? []).reduce((s, t) => s + t.over2y, 0);
  const tenureRate = tenureTotal > 0 ? (tenureOver2y / tenureTotal) * 100 : null;

  const care: ScoreSignal[] = [
    { label: "공단 정기평가 등급(돌봄 과정 반영)", score: gradeToScore(f.grade), weight: 2 },
    { label: "급여제공 과정 점수", score: findDomain(f, "급여제공과정"), weight: 2 },
    { label: "급여제공 결과 점수", score: findDomain(f, "급여제공결과"), weight: 2 },
    { label: "기관운영 점수", score: findDomain(f, "기관운영") },
    {
      label: "요양보호사 배치",
      score:
        perCareWorker == null
          ? null
          : perCareWorker <= 2.1
          ? 100
          : perCareWorker <= 2.5
          ? 85
          : perCareWorker <= 3
          ? 70
          : 50,
      weight: 3,
      note: perCareWorker == null ? undefined : `1명당 어르신 ${perCareWorker.toFixed(1)}명`,
    },
    {
      label: "프로그램 다양성",
      score:
        programCategories === 0
          ? null
          : programCategories >= 4
          ? 100
          : programCategories >= 3
          ? 85
          : programCategories >= 2
          ? 70
          : 55,
      weight: 2,
      note: programCategories > 0 ? `${programCategories}개 분야 운영` : undefined,
    },
    {
      label: "직원 근속 안정성",
      score:
        tenureRate == null
          ? null
          : tenureRate >= 60
          ? 100
          : tenureRate >= 40
          ? 85
          : tenureRate >= 20
          ? 65
          : 45,
      weight: 2,
      note: tenureRate == null ? undefined : `2년 이상 ${Math.round(tenureRate)}%`,
    },
  ];

  const environment: ScoreSignal[] = [
    {
      label: "정원 대비 운영 안정성",
      score: !hasCapacity
        ? null
        : occupancy <= 0
        ? 40
        : occupancy / f.capacity >= 1.02
        ? 55
        : occupancy / f.capacity >= 0.6
        ? 100
        : occupancy / f.capacity >= 0.3
        ? 70
        : 45,
      note: hasCapacity ? `정원 ${f.capacity}명 · 현원 ${occupancy}명` : "정원 개념이 없는 유형이에요",
    },
  ];

  // 침실 구성 — 1·2인실이 있으면 사생활이 보장된다. 공단 시설현황을 매핑한 시설만 값이 있다.
  const rooms = f.facilityRooms?.bedrooms;
  const roomTotal = rooms
    ? rooms.single + rooms.double + rooms.triple + rooms.quad + rooms.special
    : 0;
  if (roomTotal > 0) {
    const privateRate = ((rooms!.single + rooms!.double) / roomTotal) * 100;
    environment.push({
      label: "1·2인실 비중",
      score: privateRate >= 50 ? 100 : privateRate >= 25 ? 85 : privateRate > 0 ? 65 : 45,
      weight: 2,
      note: `전체 ${roomTotal}실 중 ${Math.round(privateRate)}%`,
    });
    environment.push({
      label: "프로그램실·재활실",
      score:
        (f.programRoomCount ?? 0) > 0 && f.facilityRooms.medical.rehabRoom > 0
          ? 100
          : (f.programRoomCount ?? 0) > 0 || f.facilityRooms.medical.rehabRoom > 0
          ? 75
          : 40,
    });
  }
  if (f.hasDementiaUnit) {
    environment.push({
      label: "치매전담실 운영",
      score: 100,
      note: "치매 어르신 전용 생활공간이 있어요",
    });
  }

  const transparency: ScoreSignal[] = [
    { label: "평가등급 공개", score: f.grade != null ? 100 : 30, weight: 2 },
    { label: "연락처 공개", score: f.phone ? 100 : 30 },
  ];
  if (f.institutionInfo) {
    transparency.push({
      label: "운영정보 공개",
      score:
        [
          f.institutionInfo.homepage,
          f.institutionInfo.operatingHours,
          f.institutionInfo.transport,
          f.institutionInfo.parkingInfo,
        ].filter(Boolean).length >= 3
          ? 100
          : 70,
      note: f.institutionInfo.homepage ? "홈페이지·운영시간 공개" : "운영시간 등 공개",
    });
    // 배상책임보험은 사고가 났을 때 보호자가 실제로 보호받는지와 직결된다
    transparency.push({
      label: "배상책임보험",
      score: f.institutionInfo.liabilityInsurance ? 100 : 40,
      weight: 2,
      note: f.institutionInfo.liabilityInsurance ? "가입" : "미가입",
    });
  }

  const availability: ScoreSignal[] = hasCapacity
    ? [
        {
          label: "입소 여유",
          score: vacancy > 0 ? 100 : waitlist > 0 ? 30 : 60,
          note: vacancy > 0 ? `${vacancy}자리` : "빈자리 없음",
          weight: 2,
        },
        {
          label: "대기 부담",
          score: waitlist === 0 ? 100 : waitlist <= 5 ? 70 : 40,
          note: waitlist > 0 ? `대기 ${waitlist}명` : "대기 없음",
        },
      ]
    : [{ label: "입소 여유", score: null, note: "정원 개념이 없는 유형이에요" }];

  return [safety, medical, care, environment, transparency, availability];
}

export function calcDolbodaScore(f: Facility, extras?: ScoreExtras): DolbodaScore {
  const signalGroups = isHospital(f) ? hospitalAreas(f) : nhisAreas(f, extras);

  const areas: ScoreArea[] = SCORE_AREAS.map((area, i) => ({
    ...area,
    signals: signalGroups[i],
    score: weightedAvg(signalGroups[i]),
  }));

  const availableWeight = areas.reduce((sum, a) => sum + (a.score != null ? a.weight : 0), 0);
  const coverage = Math.round(availableWeight);

  // 확보된 가중치가 절반 미만이면 점수를 내지 않는다 — 부족한 데이터로 시설을 단정하지 않기 위함
  if (availableWeight < 50) {
    return { total: null, coverage, areas };
  }

  const weighted = areas.reduce(
    (sum, a) => sum + (a.score != null ? a.score * a.weight : 0),
    0
  );
  const rawTotal = weighted / availableWeight;
  const total = Math.round((rawTotal * availableWeight + PRIOR_SCORE * (100 - availableWeight)) / 100);
  return { total, coverage, areas };
}

export function scoreLevel(total: number): { label: string; colorClassName: string } {
  if (total >= 85) return { label: "매우 우수", colorClassName: "text-mint-700" };
  if (total >= 70) return { label: "우수", colorClassName: "text-primary-600" };
  if (total >= 55) return { label: "보통", colorClassName: "text-accent-600" };
  return { label: "확인 필요", colorClassName: "text-ink-500" };
}
