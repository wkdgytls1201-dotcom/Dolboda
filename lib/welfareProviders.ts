import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { REGION_SEO } from "./regionSeo";

// 복지용구 사업소 조회 (서버 전용).
//
// 복지용구 사업소는 Facility 테이블에 없다 — 공단 원본에서 이 유형(급여종류 B06·C06)은
// 시설 목록 성격이 아니라 판매·대여업이라 처음부터 우리 시설 타입 체계 밖에 뒀다
// (scripts/import-nhis-v2.mjs 참고). 그래서 원본 Institution 테이블을 지역 페이지와
// 같은 방식(시도 접두어 + 시군구 포함)으로 직접 조회한다.
//
// 전화 연결만 제공하고 주문·결제 플로우는 만들지 않는다 — 시설과 마찬가지로 상담은
// 사업소가 직접 하고, 회사는 계약 당사자가 되지 않는다는 원칙(care-agreement-spec.md §1)을
// 그대로 따른다.

const WELFARE_SERVICE_CODES = ["B06", "C06"];

export interface WelfareProvider {
  name: string;
  address: string;
  phone: string;
}

async function loadProviders(sidoSlug: string, sigungu: string): Promise<WelfareProvider[]> {
  const region = REGION_SEO.find((r) => r.slug === sidoSlug);
  if (!region) return [];

  const rows = await prisma.institution.findMany({
    where: {
      serviceCode: { in: WELFARE_SERVICE_CODES },
      OR: region.prefixes.map((p) => ({ address: { startsWith: p } })),
      address: { contains: ` ${sigungu} ` },
    },
    select: { name: true, address: true, phone: true },
    orderBy: { name: "asc" },
    take: 30,
  });

  // phone은 스키마상 nullable이지만 실측(2026-08)으로 복지용구 사업소는 100% 보유 —
  // 그래도 스키마가 허용하는 한 방어적으로 없는 행은 제외한다(전화 연결이 유일한 기능이라
  // 전화번호 없는 행은 화면에서 아무 쓸모가 없다)
  return rows.filter((r): r is WelfareProvider => Boolean(r.phone)) as WelfareProvider[];
}

/** 지역 페이지·복지용구 혜택 화면에서 부른다. 하루 캐시 — 사업소 목록은 자주 안 바뀐다. */
export const getWelfareProviders = unstable_cache(
  async (sidoSlug: string, sigungu: string) => {
    try {
      return await loadProviders(sidoSlug, sigungu);
    } catch (e) {
      console.error("복지용구 사업소 조회 실패:", e);
      return [];
    }
  },
  ["welfare-providers"],
  { revalidate: 86400 }
);

/** 시·도 안에서 사업소가 있는 시·군·구 목록 — 지역 선택 UI용. 하루 캐시. */
export const getWelfareSigunguList = unstable_cache(
  async (sidoSlug: string): Promise<{ sigungu: string; count: number }[]> => {
    const region = REGION_SEO.find((r) => r.slug === sidoSlug);
    if (!region) return [];
    try {
      const rows = await prisma.institution.findMany({
        where: {
          serviceCode: { in: WELFARE_SERVICE_CODES },
          OR: region.prefixes.map((p) => ({ address: { startsWith: p } })),
        },
        select: { address: true },
      });
      const counts = new Map<string, number>();
      for (const row of rows) {
        const token = row.address.trim().split(/\s+/)[1];
        if (token && /^[가-힣]{1,10}(시|군|구)$/.test(token)) {
          counts.set(token, (counts.get(token) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .map(([sigungu, count]) => ({ sigungu, count }))
        .sort((a, b) => b.count - a.count);
    } catch (e) {
      console.error("복지용구 시군구 목록 조회 실패:", e);
      return [];
    }
  },
  ["welfare-sigungu-list"],
  { revalidate: 86400 }
);
