import { NextResponse } from "next/server";
import { Prisma, FacilityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rowToFacility } from "@/lib/facilityRepo";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

// 22,000건 넘는 전국 데이터를 매번 통째로 내려주면 응답이 20MB에 달해 브라우저가 멈춘다.
// q(이름/주소 검색)나 type으로 서버에서 먼저 좁히고, limit으로 상한을 둔다.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type");
  const ids = searchParams.get("ids");
  const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);

  // ids가 있으면 특정 시설들을 정확히 지정해서 가져오는 것 — limit/필터 무시하고 그대로 반환
  // (비교하기·찜한시설처럼 기본 200건 안에 없을 수도 있는 특정 시설을 조회할 때 씀)
  if (ids) {
    const idList = ids.split(",").filter(Boolean);
    const rows = await prisma.facility.findMany({ where: { id: { in: idList } } });
    return NextResponse.json({ items: rows.map(rowToFacility), total: rows.length });
  }

  const where: Prisma.FacilityWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }
  if (type) {
    where.facilityType = { in: type.split(",") as FacilityType[] };
  }

  const [rows, total] = await Promise.all([
    prisma.facility.findMany({ where, orderBy: { createdAt: "asc" }, take: limit }),
    prisma.facility.count({ where }),
  ]);

  return NextResponse.json({ items: rows.map(rowToFacility), total });
}
