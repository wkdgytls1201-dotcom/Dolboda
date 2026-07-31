import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { rowToFacility, toCardFacility } from "@/lib/facilityRepo";
import FacilityDetailClient from "./FacilityDetailClient";

// 서버에서 시설을 조회해 클라이언트 컴포넌트에 넘긴다.
// 예전처럼 클라이언트에서 fetch하면 검색봇이 받는 초기 HTML이 헤더·푸터뿐이라
// 28,000여 개 상세페이지가 전부 빈 페이지로 색인된다. 여기서 넘겨주면 같은 JSX가
// 서버에서 한 번 렌더돼 시설명·주소·등급·비용·인력이 그대로 HTML에 실린다.
export default async function FacilityDetailPage({ params }: { params: { id: string } }) {
  const row = await prisma.facility.findUnique({ where: { id: params.id } });
  if (!row) notFound();

  const facility = rowToFacility(row);

  // "다른 시설도 확인해 보세요" — 같은 시군구 시설을 서버에서 함께 내려준다.
  // 내부 링크가 초기 HTML에 들어가야 크롤러가 인접 시설 페이지까지 타고 갈 수 있다.
  const sigungu = row.address.trim().split(/\s+/)[1] ?? "";
  const relatedRows = sigungu
    ? await prisma.facility.findMany({
        where: { address: { contains: sigungu }, id: { not: row.id } },
        take: 24,
      })
    : [];

  return (
    <FacilityDetailClient
      facility={facility}
      relatedPool={relatedRows.map((r) => toCardFacility(rowToFacility(r)))}
    />
  );
}
