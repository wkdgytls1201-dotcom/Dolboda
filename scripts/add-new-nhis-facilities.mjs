// 인천·전북·경북 재수집분처럼, 이미 시딩된 nhis2- 시설의 좌표(lat/lng)를 건드리지 않고
// realNhisDataV2.json에만 새로 생긴 id(신규 시설)만 골라서 추가하는 스크립트.
// prisma/seed.ts의 seedNhisV2()는 delete-then-insert라 기존 좌표를 날리므로 이 용도엔 쓰지 않는다.
import { config } from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const BASE_KEYS = [
  "id", "name", "facilityType", "dataSource", "gradeSource", "grade",
  "address", "lat", "lng", "phone", "establishedYear", "updatedAt", "parking",
];

function toRow(f) {
  const extra = {};
  for (const key of Object.keys(f)) {
    if (!BASE_KEYS.includes(key)) extra[key] = f[key];
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
    parking: f.parking ?? undefined,
    extra,
  };
}

async function main() {
  const jsonPath = path.resolve(__dirname, "..", "lib", "realNhisDataV2.json");
  const facilities = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log(`JSON 총 ${facilities.length}건`);

  const existing = await prisma.facility.findMany({
    where: { id: { startsWith: "nhis2-" } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((r) => r.id));
  console.log(`DB에 이미 있는 nhis2- 시설: ${existingIds.size}건`);

  const newRows = facilities.filter((f) => !existingIds.has(f.id)).map(toRow);
  console.log(`신규로 추가할 시설: ${newRows.length}건`);

  const BATCH = 1000;
  for (let i = 0; i < newRows.length; i += BATCH) {
    const batch = newRows.slice(i, i + BATCH);
    await prisma.facility.createMany({ data: batch, skipDuplicates: true });
    console.log(`진행: ${Math.min(i + BATCH, newRows.length)}/${newRows.length}`);
  }
  console.log("완료. 기존 시설의 좌표는 건드리지 않았음.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
