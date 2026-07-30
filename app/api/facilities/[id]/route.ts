import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rowToFacility } from "@/lib/facilityRepo";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await prisma.facility.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rowToFacility(row));
}
