"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchHero } from "@/components/SearchHero";
import { FacilityCard } from "@/components/FacilityCard";
import { CompareSelectBar } from "@/components/CompareSelectBar";
import { StatsStrip } from "@/components/StatsStrip";
import { Reveal } from "@/components/Reveal";
import { LocationConsentModal } from "@/components/LocationConsentModal";
import { useFacilities, useFacilityStats, useNearbyFacilities } from "@/lib/useFacilities";
import { DEFAULT_ORIGIN } from "@/lib/distance";
import { isHospital } from "@/lib/types";
import { PROMOTED_FACILITY_IDS } from "@/lib/promotedFacilities";
import { LOCATION_CONSENT_KEY, saveUserLocation, readUserLocation } from "@/lib/userLocation";

export default function HomePage() {
  const { facilities, total } = useFacilities();
  const { stats } = useFacilityStats();
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [showLocationConsent, setShowLocationConsent] = useState(false);

  // 전체 22,000여 건 기준 집계라 /api/facilities/stats에서 서버 계산값을 따로 받아온다.
  // (홈에 표시되는 facilities 배열은 200건 제한이 있어 그걸로 계산하면 숫자가 틀어짐)
  const homeStats = useMemo(
    () => [
      { label: "등록된 시설", value: total, suffix: "곳" },
      {
        label: "1등급 시설",
        value: stats?.grade1Count ?? 0,
        suffix: "곳",
        tooltip: "평가등급 1등급은 인력배치·환경·서비스 평가에서 가장 높은 등급을 받은 시설이에요.",
      },
      {
        label: "입소 가능 시설",
        value: stats?.vacancyCount ?? 0,
        suffix: "곳",
        tooltip:
          "정원 대비 현재 입소 가능한 자리가 있는 시설 수예요. 방문요양센터처럼 정원 개념이 없는 시설은 제외돼요.",
      },
    ],
    [total, stats]
  );

  function requestLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigin(next);
        // 시설 찾기 등 다른 페이지에서도 같은 기준점을 쓰도록 저장해둔다.
        saveUserLocation(next);
      },
      () => setOrigin(DEFAULT_ORIGIN),
      { timeout: 5000 }
    );
  }

  useEffect(() => {
    // 이전 방문에서 받아둔 위치가 있으면 권한 조회 전에 먼저 반영해 깜빡임을 줄인다.
    const saved = readUserLocation();
    if (saved) setOrigin(saved);

    // "허용"은 브라우저 자체 위치 권한과 마찬가지로 영구 기억(localStorage)하지만,
    // "다음에 할게요"는 이번 방문(세션)에서만 다시 안 묻고, 다음에 새로 방문하면 다시 물어본다.
    const granted = localStorage.getItem(LOCATION_CONSENT_KEY) === "granted";
    const skippedThisSession = sessionStorage.getItem(LOCATION_CONSENT_KEY) === "denied";
    if (granted) {
      requestLocation();
    } else if (!skippedThisSession) {
      setShowLocationConsent(true);
    }
  }, []);

  function handleAllowLocation() {
    localStorage.setItem(LOCATION_CONSENT_KEY, "granted");
    setShowLocationConsent(false);
    requestLocation();
  }

  function handleSkipLocation() {
    sessionStorage.setItem(LOCATION_CONSENT_KEY, "denied");
    setShowLocationConsent(false);
  }

  // 한 번에 넉넉히 받아 "내 주변 시설"(가까운 6곳)과 "최근 설립"(주변 후보 중 최신순)에 함께 쓴다.
  const { facilities: nearbyPool } = useNearbyFacilities(origin.lat, origin.lng, 60);
  const nearbyFacilities = useMemo(() => nearbyPool.slice(0, 6), [nearbyPool]);

  // 추천 시설: PROMOTED_FACILITY_IDS에 넣은 시설을 순서 그대로 맨 앞에 고정 노출하고,
  // 남는 자리는 평가등급 1등급 시설로 채운다. (나중에 프리미엄 상품 구매 시 이 배열만 수정하면 됨)
  const recommended = useMemo(() => {
    const promoted = PROMOTED_FACILITY_IDS.map((id) => facilities.find((f) => f.id === id)).filter(
      (f): f is NonNullable<typeof f> => f !== undefined
    );
    const promotedIdSet = new Set(promoted.map((f) => f.id));
    const fallback = facilities.filter((f) => f.grade === 1 && !promotedIdSet.has(f.id));
    return [...promoted, ...fallback].slice(0, 6);
  }, [facilities]);

  // 점수 높은 시설: 평가등급이 좋은(숫자가 낮은) 순, 동점이면 정기평가 총점이 있는 경우 그걸로 비교
  const topScored = useMemo(() => {
    return facilities
      .filter((f) => f.grade !== null)
      .slice()
      .sort((a, b) => {
        if (a.grade !== b.grade) return (a.grade ?? 99) - (b.grade ?? 99);
        const aScore = !isHospital(a) ? a.evaluationDetail?.totalScore ?? 0 : 0;
        const bScore = !isHospital(b) ? b.evaluationDetail?.totalScore ?? 0 : 0;
        return bScore - aScore;
      })
      .slice(0, 6);
  }, [facilities]);

  // 최근 설립: 내 주변 시설 중에서 고른다(먼 곳의 신축 시설은 의미가 적으므로).
  // 정렬 = 설립연도 최신순 → 같은 해면 평가등급 높은 순 → 그래도 같으면 가까운 순.
  // 주변에 설립연도 정보가 있는 시설이 없으면 전국 목록으로 대체한다.
  const recentlyEstablished = useMemo(() => {
    const byRecency = (
      a: { establishedYear?: number; grade: number | null },
      b: { establishedYear?: number; grade: number | null }
    ) => {
      const yearDiff = (b.establishedYear ?? 0) - (a.establishedYear ?? 0);
      if (yearDiff !== 0) return yearDiff;
      // 등급은 숫자가 작을수록 좋고, 등급 없는 시설은 뒤로
      return (a.grade ?? 99) - (b.grade ?? 99);
    };

    const nearbyWithYear = nearbyPool.filter((f) => f.establishedYear !== undefined);
    if (nearbyWithYear.length > 0) {
      // nearbyPool은 이미 가까운 순이라 안정 정렬 덕분에 동점 시 거리순이 유지된다.
      return nearbyWithYear.slice().sort(byRecency).slice(0, 6);
    }

    return facilities
      .filter((f) => f.establishedYear !== undefined)
      .slice()
      .sort(byRecency)
      .slice(0, 6);
  }, [nearbyPool, facilities]);

  return (
    <main className="pb-24">
      {showLocationConsent && (
        <LocationConsentModal onAllow={handleAllowLocation} onSkip={handleSkipLocation} />
      )}
      <SearchHero />

      <Reveal className="mx-auto max-w-6xl px-4 pt-12">
        <StatsStrip stats={homeStats} />
      </Reveal>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <Reveal className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <h2 className="text-xl font-bold text-ink-900">내 주변 시설</h2>
          <span className="text-sm text-ink-300">현재 위치에서 가까운 순</span>
        </Reveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nearbyFacilities.map((f, i) => (
            <Reveal key={f.id} delay={i * 60}>
              <FacilityCard facility={f} distanceKm={f.distanceKm} />
            </Reveal>
          ))}
        </div>
      </section>

      {recommended.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <Reveal className="mb-5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <h2 className="text-xl font-bold text-ink-900">추천 시설</h2>
            <span className="text-sm text-ink-300">돌보다가 엄선한 시설</span>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((f, i) => (
              <Reveal key={f.id} delay={i * 60}>
                <FacilityCard facility={f} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <Reveal className="mb-5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <h2 className="text-xl font-bold text-ink-900">점수 높은 시설</h2>
          <span className="text-sm text-ink-300">평가등급이 높은 시설</span>
        </Reveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topScored.map((f, i) => (
            <Reveal key={f.id} delay={i * 60}>
              <FacilityCard facility={f} />
            </Reveal>
          ))}
        </div>
      </section>

      {recentlyEstablished.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <Reveal className="mb-5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <h2 className="text-xl font-bold text-ink-900">가장 최근 설립</h2>
            <span className="text-sm text-ink-300">설립연도 기준 최신 시설</span>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyEstablished.map((f, i) => (
              <Reveal key={f.id} delay={i * 60}>
                <FacilityCard facility={f} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <CompareSelectBar />
    </main>
  );
}
