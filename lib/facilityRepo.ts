import type { Facility as FacilityDTO } from "./types";
import type { Facility as FacilityRow } from "@prisma/client";

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
  return {
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
    photos: anyF.photos,
    // 카드에 표시하거나 필터에서 쓰는 값들만 선별
    capacity: anyF.capacity,
    currentOccupancy: anyF.currentOccupancy,
    facilityStatus: anyF.facilityStatus,
    // 진료과목은 필터 선택지를 만드는 데만 쓰므로 이름만 남긴다
    departments: Array.isArray(anyF.departments)
      ? (anyF.departments as { name: string }[]).map((d) => ({ name: d.name, doctorCount: 0 }))
      : undefined,
    // 행정처분은 카드에서 배지 여부만 필요하므로 첫 건만 남겨 페이로드를 줄인다
    adminActions: Array.isArray(anyF.adminActions)
      ? (anyF.adminActions as unknown[]).slice(0, 1)
      : undefined,
  } as unknown as FacilityDTO;
}
