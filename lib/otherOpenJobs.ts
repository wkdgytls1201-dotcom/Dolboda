import { prisma } from "@/lib/prisma";
import { careRequestSummary } from "@/lib/careLocationTypes";
import type { LocationTypeValue } from "@/lib/careLocationTypes";

/** 미선정·취소 메일에 동봉할 "같은 지역·유형의 다른 OPEN 공고" 요약(최대 3건).
 * 떨어진/취소된 그 순간이 매니저가 이탈하는 지점이라, 위로 문구로 끝내지 않고
 * 살아 있는 공고를 바로 보여줘 다음 지원으로 잇는다.
 * 실패하면 빈 배열 — 동봉 목록 때문에 본 메일이 못 나가면 안 된다. */
export async function findOtherOpenJobSummaries(
  exceptRequestId: string,
  region: string,
  locationType: LocationTypeValue
): Promise<string[]> {
  try {
    const jobs = await prisma.careRequest.findMany({
      where: { status: "OPEN", id: { not: exceptRequestId }, region, locationType },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { locationType: true, region: true, startDate: true, endDate: true },
    });
    return jobs.map((j) => careRequestSummary(j));
  } catch {
    return [];
  }
}
