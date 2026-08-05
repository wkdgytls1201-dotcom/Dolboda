import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { rowToFacility } from "@/lib/facilityRepo";
import FacilityDetailClient from "./FacilityDetailClient";
import { SimilarSection, SimilarSectionSkeleton } from "./SimilarSection";

// 28,000여 개 상세페이지는 방문마다 (레이아웃 조회 + 본문 조회 + 유사시설 60행 조회)를
// 다시 돌고 있었다. 시설 데이터는 import 스크립트를 돌릴 때만 바뀌므로 하루 캐시로 충분하다.
// generateStaticParams는 두지 않는다 — 빌드 때 2만 8천 페이지를 미리 굽는 건 지나치고,
// dynamicParams 기본값(true) 덕분에 처음 요청된 시설만 그때 생성돼 캐시된다.
export const revalidate = 86400;

// 서버에서 시설을 조회해 클라이언트 컴포넌트에 넘긴다.
// 예전처럼 클라이언트에서 fetch하면 검색봇이 받는 초기 HTML이 헤더·푸터뿐이라
// 28,000여 개 상세페이지가 전부 빈 페이지로 색인된다. 여기서 넘겨주면 같은 JSX가
// 서버에서 한 번 렌더돼 시설명·주소·등급·비용·인력이 그대로 HTML에 실린다.
export default async function FacilityDetailPage({ params }: { params: { id: string } }) {
  const row = await prisma.facility.findUnique({ where: { id: params.id } });
  if (!row) notFound();

  const facility = rowToFacility(row);

  // ★ 두 조회를 동시에 던진다. 예전엔 하나씩 기다렸는데(소개 → 소식) 서로 아무 상관이
  //   없는 조회라 기다릴 이유가 없었다.
  //
  //   여기에 "비슷한 시설" 조회가 하나 더 있었고 그게 전체 시간을 지배했다(실측 98ms).
  //   지금은 SimilarSection으로 떼어내 <Suspense>로 흘려보낸다 — 본문은 그걸 안 기다린다.
  const [ownerRow, ownerPosts] = await Promise.all([
    // 시설이 콘솔에서 직접 쓴 소개·사진 (없으면 null — 대부분의 시설이 아직 없다).
    // 공단 데이터와 별개 테이블(FacilityContent)이라 따로 읽는다.
    // 조회 실패(테이블 미생성 등)가 상세 페이지 2만 8천 장을 죽이면 안 되므로 조용히 무시한다.
    prisma.facilityContent
      .findUnique({
        where: { facilityId: row.id },
        select: { intro: true, photos: true, updatedAt: true },
      })
      .catch(() => null),
    // 시설 소식(비즈니스 플러스) — 최신 3개만 싣는다. 페이로드를 지키면서도
    // "살아 있는 시설"이라는 인상을 주기엔 충분하다.
    prisma.facilityPost
      .findMany({
        where: { facilityId: row.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, title: true, body: true, createdAt: true },
      })
      .catch(() => []),
  ]);

  const ownerContent =
    ownerRow && (ownerRow.intro || (Array.isArray(ownerRow.photos) && ownerRow.photos.length > 0))
      ? {
          intro: ownerRow.intro,
          photos: Array.isArray(ownerRow.photos) ? (ownerRow.photos as string[]) : [],
          updatedAt: ownerRow.updatedAt.toISOString().slice(0, 10),
        }
      : null;

  return (
    <FacilityDetailClient
      facility={facility}
      // 서버 컴포넌트를 클라이언트 컴포넌트에 prop(슬롯)으로 꽂아 넣는다. 정상적인 패턴이고,
      // 이렇게 해야 1,100줄짜리 FacilityDetailClient를 건드리지 않고 이 섹션만 스트리밍된다.
      similarSlot={
        <Suspense fallback={<SimilarSectionSkeleton />}>
          <SimilarSection facilityId={facility.id} />
        </Suspense>
      }
      ownerContent={ownerContent}
      ownerPosts={ownerPosts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        date: p.createdAt.toISOString().slice(0, 10),
      }))}
    />
  );
}
