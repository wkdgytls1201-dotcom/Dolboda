import type { Facility as FacilityDTO } from "./types";
import type { Facility as FacilityRow } from "@prisma/client";
import { calcDolbodaScore } from "./dolbodaScore";

// DB row(기본 컬럼 + extra jsonb) → 클라이언트가 쓰는 Facility 형태로 복원 (seed.ts의 역변환)
export function rowToFacility(row: FacilityRow): FacilityDTO {
  return {
    id: row.id,
    name: row.name,
    facilityType: row.facilityType,
    dataSource: row.dataSource,
    gradeSource: row.gradeSource,
    grade: row.grade,
    address: row.address,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    phone: row.phone ?? undefined,
    establishedYear: row.establishedYear ?? undefined,
    updatedAt: row.sourceUpdatedAt,
    parking: (row.parking as FacilityDTO["parking"]) ?? undefined,
    ...(row.extra as object),
  } as FacilityDTO;
}

// 목록 카드가 실제로 쓰는 필드만 남긴 가벼운 형태.
// extra 안의 staffDetail·facilityRooms·nonCoveredFees 같은 큰 덩어리가 빠져
// 300건 기준 응답이 290KB → 40KB대로 줄어든다.
export function toCardFacility(f: FacilityDTO): FacilityDTO {
  const anyF = f as unknown as Record<string, unknown>;
  // 안심지수 총점만 계산해 붙인다 — 카드 페이로드에는 계산 재료(평가 도메인·인력 상세)가
  // 빠지므로 클라이언트가 계산할 수 없다. 인근 병원 거리(extras) 없이 계산하는 방식은
  // 유사시설 추천(lib/similarity.ts)과 동일하다.
  const dolbodaTotal = calcDolbodaScore(f).total;
  return {
    dolbodaTotal,
    id: f.id,
    name: f.name,
    facilityType: f.facilityType,
    dataSource: f.dataSource,
    gradeSource: f.gradeSource,
    grade: f.grade,
    address: f.address,
    lat: f.lat,
    lng: f.lng,
    phone: f.phone,
    establishedYear: f.establishedYear,
    updatedAt: f.updatedAt,
    // 카드 썸네일은 첫 장(외관 대표사진)만 쓴다 — 시설당 12장씩 실으면 300건 응답에
    // URL 3,600개(약 350KB)가 헛되이 실린다. R2 대량 사진이 붙으면서 실제 문제가 됐다.
    photos: Array.isArray(anyF.photos) ? (anyF.photos as string[]).slice(0, 1) : undefined,
    // 그 첫 장의 캡션만 함께 — 썸네일 alt에 쓴다.
    // 공단 사진에는 캡션이 거의 항상 붙어 있고(실측 55,008장 중 54,994장) "2층 세면실 입구",
    // "정원전경입니다"처럼 구체적이다. 그동안 목록 썸네일이 alt=""라 이 설명이 통째로
    // 버려지고 있었다 — 이미지 검색 노출과 스크린리더 양쪽에서 손해다.
    // photoItems 전체가 아니라 문자열 하나만 실으므로 페이로드 영향은 무시할 수준이다.
    photoCaption: Array.isArray(anyF.photoItems)
      ? ((anyF.photoItems as { caption?: string | null }[])[0]?.caption ?? undefined)
      : undefined,
    // 카드에 표시하거나 필터에서 쓰는 값들만 선별
    capacity: anyF.capacity,
    currentOccupancy: anyF.currentOccupancy,
    facilityStatus: anyF.facilityStatus,
    // 진료과목은 필터 선택지를 만드는 데만 쓰므로 이름만 남긴다
    departments: Array.isArray(anyF.departments)
      ? (anyF.departments as { name: string }[]).map((d) => ({ name: d.name, doctorCount: 0 }))
      : undefined,
    // 요양병원 카드에서 병상수 외에 눈에 띄는 정보(응급실·간호인력등급)로 쓰는 값들 — 전부 숫자/불리언이라 페이로드 부담 적음
    emergencyRoom: anyF.emergencyRoom,
    nurseGrade: anyF.nurseGrade,
    // 행정처분은 카드에서 배지 여부만 필요하므로 첫 건만 남겨 페이로드를 줄인다
    adminActions: Array.isArray(anyF.adminActions)
      ? (anyF.adminActions as unknown[]).slice(0, 1)
      : undefined,
    // 프로그램 필터·카드 배지에 쓰는 태그 요약 (원본 12만 행 대신 미리 계산된 요약만)
    programTags: anyF.programTags,
    // 홈 "점수 높은 시설"·검색 등급순 동점 비교가 총점만 쓰므로 domains 등 큰 덩어리는 뺀다
    evaluationDetail: anyF.evaluationDetail
      ? { totalScore: (anyF.evaluationDetail as { totalScore: number }).totalScore }
      : undefined,
  } as unknown as FacilityDTO;
}
