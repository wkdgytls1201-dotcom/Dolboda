"use client";

import Link from "next/link";
import { useEffect } from "react";

// 스폰서·배너 노출/클릭 추적 — 두 작은 클라이언트 조각.
//
// SponsorSlots·RegionBanner는 서버 컴포넌트로 남겨둔다(가볍고 SEO에 유리). 이 파일만
// 클라이언트 섬으로 떼어 필요한 상호작용(마운트 시 노출 기록, 클릭 시 기록)만 추가한다.
//
// 지역 페이지가 하루 단위 ISR(revalidate)로 캐시되기 때문에, 서버에서 렌더 시점에
// 카운트하면 캐시가 갱신될 때만 올라가 실제 방문자 수를 크게 밑돈다. 그래서 반드시
// 브라우저에서 실제로 화면에 그려질 때 비컨을 쏜다.

function beacon(facilityId: string, kind: string) {
  const url = `/api/ads/track?facilityId=${encodeURIComponent(facilityId)}&kind=${kind}`;
  if (navigator.sendBeacon) navigator.sendBeacon(url);
  else fetch(url, { method: "POST", keepalive: true }).catch(() => {});
}

/** 스폰서 카드·배너가 실제로 화면에 그려질 때 한 번 노출을 기록한다. */
export function AdImpressionBeacon({
  facilityId,
  kind,
}: {
  facilityId: string;
  kind: "sponsor" | "banner";
}) {
  useEffect(() => {
    beacon(facilityId, `${kind}_impression`);
    // facilityId·kind는 마운트 시점에 고정이라 재실행할 이유가 없다(같은 카드가
    // 리마운트되지 않는 한 한 번만) — 의도적으로 최초 1회만 보낸다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** 클릭 시 기록하고 정상적으로 이동하는 링크. next/link의 얇은 래퍼다. */
export function TrackedLink({
  href,
  facilityId,
  kind,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  facilityId: string;
  kind: "sponsor" | "banner";
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => beacon(facilityId, `${kind}_click`)}
    >
      {children}
    </Link>
  );
}
