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
