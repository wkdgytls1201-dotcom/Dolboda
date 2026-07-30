import { config } from "dotenv";
import path from "node:path";
import fs from "node:fs";
config({ path: path.resolve(__dirname, "..", ".env.local") });

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { MOCK_FACILITIES } from "../lib/mockData";
import type { Facility as FacilityDTO, FacilityBase } from "../lib/types";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

// FacilityBase 필드만 뽑아내고 나머지(타입별 상세 필드)는 전부 extra(jsonb)로 저장
const BASE_KEYS: (keyof FacilityBase)[] = [
  "id",
  "name",
  "facilityType",
  "dataSource",
  "gradeSource",
  "grade",
  "address",
  "lat",
  "lng",
  "phone",
  "establishedYear",
  "updatedAt",
  "parking",
];

function toRow(f: FacilityDTO) {
  const extra: Record<string, unknown> = {};
  for (const key of Object.keys(f) as (keyof FacilityDTO)[]) {
    if (!BASE_KEYS.includes(key as keyof FacilityBase)) extra[key] = f[key];
  }
  return {
    id: f.id,
    name: f.name,
    facilityType: f.facilityType,
    dataSource: f.dataSource,
    gradeSource: f.gradeSource,
    grade: f.grade,
    address: f.address,
    lat: f.lat ?? null,
    lng: f.lng ?? null,
    phone: f.phone ?? null,
    establishedYear: f.establishedYear ?? null,
    sourceUpdatedAt: f.updatedAt,
    parking: (f.parking ?? undefined) as Prisma.InputJsonValue | undefined,
    extra: extra as Prisma.InputJsonValue,
  };
}

async function seedSmallSet() {
  let count = 0;
  for (const f of MOCK_FACILITIES) {
    await prisma.facility.upsert({
      where: { id: f.id },
      create: toRow(f),
      update: toRow(f),
    });
    count++;
  }
  console.log(`데모+HIRA 시딩 완료: ${count}건`);
}

// 전국 NHIS v2(longtermcare.or.kr 출처, 22,535건)는 upsert 루프 대신 배치 insert로 처리 —
// 건수가 많아 한 건씩 upsert하면 너무 느림. 기존 행은 지우고 새로 넣는 방식(재실행 시 최신화).
async function seedNhisV2() {
  const jsonPath = path.resolve(__dirname, "..", "lib", "realNhisDataV2.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("realNhisDataV2.json 없음 — 스킵");
    return;
  }
  const facilities: FacilityDTO[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const rows = facilities.map(toRow);

  await prisma.facility.deleteMany({ where: { id: { startsWith: "nhis2-" } } });

  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await prisma.facility.createMany({ data: batch, skipDuplicates: true });
    console.log(`NHIS v2 진행: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log(`NHIS v2 시딩 완료: ${rows.length}건`);
}

// 예전 파이프라인(data.go.kr, 서울 20건 표본)으로 넣었던 "nhis-" 접두어 행은
// 이제 "nhis2-"(longtermcare.or.kr, 전국)로 대체됐으니 정리
async function cleanupOldNhis() {
  const { count } = await prisma.facility.deleteMany({ where: { id: { startsWith: "nhis-" } } });
  if (count) console.log(`예전 NHIS 표본 ${count}건 삭제`);
}

async function main() {
  await seedSmallSet();
  await cleanupOldNhis();
  await seedNhisV2();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
