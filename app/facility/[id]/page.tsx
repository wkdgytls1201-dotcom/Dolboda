import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { rowToFacility, toCardFacility } from "@/lib/facilityRepo";
import { compareFacilities, rankByIntent } from "@/lib/similarity";
import FacilityDetailClient from "./FacilityDetailClient";

// 서버에서 시설을 조회해 클라이언트 컴포넌트에 넘긴다.
// 예전처럼 클라이언트에서 fetch하면 검색봇이 받는 초기 HTML이 헤더·푸터뿐이라
// 28,000여 개 상세페이지가 전부 빈 페이지로 색인된다. 여기서 넘겨주면 같은 JSX가
// 서버에서 한 번 렌더돼 시설명·주소·등급·비용·인력이 그대로 HTML에 실린다.
export default async function FacilityDetailPage({ params }: { params: { id: string } }) {
  const row = await prisma.facility.findUnique({ where: { id: params.id } });
  if (!row) notFound();

  const facility = rowToFacility(row);

  // "이 시설과 비슷한 곳" 첫 화면분을 서버에서 미리 계산해 넘긴다.
  // 클라이언트에서만 불러오면 (1) 인접 시설 링크가 초기 HTML에 없어 크롤러가 타고 갈 수 없고
  // (2) 첫 진입 때 스켈레톤이 한 번 깜빡인다. 탭을 바꿀 때만 추가로 조회한다.
  const sigungu = row.address.trim().split(/\s+/)[1] ?? "";
  const relatedRows = sigungu
    ? await prisma.facility.findMany({
        where: {
          address: { contains: sigungu },
          id: { not: row.id },
          facilityType: row.facilityType,
          dataSource: { not: "mock" },
        },
        take: 60,
      })
    : [];

  const scored = relatedRows.map((r) => compareFacilities(facility, rowToFacility(r)));
  const initialSimilar = rankByIntent(facility, scored, "similar")
    .slice(0, 12)
    .map((s) => ({
      facility: toCardFacility(s.facility),
      distanceKm: s.distanceKm,
      similarity: s.similarity,
      reasons: s.reasons,
      deltas: s.deltas,
    }));

  return <FacilityDetailClient facility={facility} initialSimilar={initialSimilar} />;
}
