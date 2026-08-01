"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchHero } from "@/components/SearchHero";
import type { HeroSlide } from "@/components/HeroBanner";
import { FacilityCard } from "@/components/FacilityCard";
import { CompareSelectBar } from "@/components/CompareSelectBar";
import { StatsStrip } from "@/components/StatsStrip";
import { Reveal } from "@/components/Reveal";
import { LocationConsentModal } from "@/components/LocationConsentModal";
import { useFacilities, useNearbyFacilities, type FacilityStats } from "@/lib/useFacilities";
import { DEFAULT_ORIGIN, haversineDistanceKm } from "@/lib/distance";
import { isHospital } from "@/lib/types";
import { PROMOTED_FACILITY_IDS } from "@/lib/promotedFacilities";
import { LOCATION_CONSENT_KEY, saveUserLocation, readUserLocation } from "@/lib/userLocation";

export default function HomeClient({
  initialStats,
  heroSlides,
}: {
  initialStats: FacilityStats;
  heroSlides: HeroSlide[];
}) {
  // 홈 카드들은 슬림 응답이면 충분 — 전체 응답은 평가 세부점수까지 실려 두 배 넘게 무겁다
  const { facilities } = useFacilities({ cardView: true });
  // 통계는 서버(page.tsx)가 이미 넘겨줬다. 예전엔 여기서 /api/facilities/stats를 한 번 더
  // 불렀는데, 그 API도 같은 lib/facilityStats.ts 하루 캐시를 읽어서 값이 언제나 동일했다.
  // 방문마다 나가던 왕복 한 번을 그대로 없앤 것.
  const stats = initialStats;
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  // 저장된 위치를 읽기 전에는 주변 시설을 부르지 않는다 — 먼저 서울시청 기준으로 한 번 부르고
  // 좌표가 정해지면 또 부르느라, 300건짜리 요청이 방문마다 두 번씩 나가고 있었다.
  const [originReady, setOriginReady] = useState(false);
  const [showLocationConsent, setShowLocationConsent] = useState(false);

  // 전체 22,000여 건 기준 집계라 /api/facilities/stats에서 서버 계산값을 따로 받아온다.
  // (홈에 표시되는 facilities 배열은 200건 제한이 있어 그걸로 계산하면 숫자가 틀어짐)
  const homeStats = useMemo(
    () => [
      // 서버에서 미리 집계한 값이라 첫 HTML부터 실제 숫자가 실린다(예전엔 0이 잠깐 보였다)
      { label: "등록된 시설", value: stats.total, suffix: "곳" },
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
    [stats]
  );

  function requestLocation(onSettled?: () => void) {
    if (!("geolocation" in navigator)) {
      onSettled?.();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // 저장해둔 위치와 사실상 같은 자리면 좌표를 갈아끼우지 않는다 —
        // 몇 미터 차이로도 주변 시설 300건 요청이 한 번 더 나갔다.
        setOrigin((prev) =>
          haversineDistanceKm(prev.lat, prev.lng, next.lat, next.lng) < 0.5 ? prev : next
        );
        // 시설 찾기 등 다른 페이지에서도 같은 기준점을 쓰도록 저장해둔다.
        saveUserLocation(next);
        onSettled?.();
      },
      () => {
        setOrigin(DEFAULT_ORIGIN);
        onSettled?.();
      },
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
      // 이미 허용한 사용자는 가진 좌표(저장분 또는 기본값)로 즉시 보여준다 —
      // 위치 응답을 기다리며 "내 주변 시설"을 비워두면 최대 5초간 빈 화면이 된다.
      // 저장된 좌표가 정확하면 아래 0.5km 가드가 재요청을 막아준다.
      setOriginReady(true);
      requestLocation();
    } else if (!skippedThisSession) {
      // 동의 모달이 화면을 덮고 있는 동안은 기준점이 안 정해진 상태라 요청하지 않는다.
      setShowLocationConsent(true);
    } else {
      setOriginReady(true);
    }
  }, []);

  function handleAllowLocation() {
    localStorage.setItem(LOCATION_CONSENT_KEY, "granted");
    setShowLocationConsent(false);
    // 여기서는 좌표가 올 때까지 기다린다 — 방금 "허용"을 누른 사용자에게 서울 기준 목록을
    // 먼저 보여줬다가 갈아끼우면 결과가 통째로 바뀌는 것처럼 보인다.
    requestLocation(() => setOriginReady(true));
  }

  function handleSkipLocation() {
    sessionStorage.setItem(LOCATION_CONSENT_KEY, "denied");
    setShowLocationConsent(false);
    setOriginReady(true);
  }

  // 한 번에 넉넉히 받아 "내 주변 시설"(가까운 6곳)·"최근 설립"(주변 후보 중 최신순)·
  // "점수 높은 시설"(주변 100km 이내 등급순)에 함께 쓴다. 300건이면 100km 반경을
  // 등급순으로 훑기에 충분하다(위치 미허용이면 origin이 서울시청 기본값이라 그 기준으로 온다).
  const { facilities: nearbyPool } = useNearbyFacilities(origin.lat, origin.lng, 300, {
    enabled: originReady,
  });
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

  // 점수 높은 시설: 내 위치(또는 서울 기본값) 100km 이내로 좁힌 뒤 평가등급이 좋은(숫자가
  // 낮은) 순, 동점이면 정기평가 총점 순으로 정렬한다. 먼 지역의 고득점 시설은 의미가 적다.
  const topScored = useMemo(() => {
    return nearbyPool
      .filter((f) => f.grade !== null && f.distanceKm <= 100)
      .slice()
      .sort((a, b) => {
        if (a.grade !== b.grade) return (a.grade ?? 99) - (b.grade ?? 99);
        const aScore = !isHospital(a) ? a.evaluationDetail?.totalScore ?? 0 : 0;
        const bScore = !isHospital(b) ? b.evaluationDetail?.totalScore ?? 0 : 0;
        return bScore - aScore;
      })
      .slice(0, 6);
  }, [nearbyPool]);

  // 최근 설립: 설립연도 데이터는 요양병원(HIRA 소스)에만 있고 방문요양·요양원·주야간보호
  // (NHIS 소스)엔 원본에 그 항목 자체가 없다. 그래서 요양병원을 설립연도 최신순으로 먼저
  // 채우고, 남는 자리는 나머지 유형을 평가등급 높은 순(숫자가 작을수록 좋음)으로 채운다.
  // 각각 내 주변 시설을 우선하고, 주변에 해당 유형이 없으면 전국 목록으로 대체한다.
  const recentlyEstablished = useMemo(() => {
    const SLOTS = 6;
    const byRecency = (a: { establishedYear?: number }, b: { establishedYear?: number }) =>
      (b.establishedYear ?? 0) - (a.establishedYear ?? 0);
    const byGrade = (a: { grade: number | null }, b: { grade: number | null }) =>
      (a.grade ?? 99) - (b.grade ?? 99);

    const nearbyHospitals = nearbyPool.filter(
      (f) => f.facilityType === "NURSING_HOSPITAL" && f.establishedYear !== undefined
    );
    const hospitals = (
      nearbyHospitals.length > 0
        ? nearbyHospitals
        : facilities.filter((f) => f.facilityType === "NURSING_HOSPITAL" && f.establishedYear !== undefined)
    )
      .slice()
      .sort(byRecency)
      .slice(0, SLOTS);

    const remaining = SLOTS - hospitals.length;
    if (remaining <= 0) return hospitals;

    const otherTypes = new Set(["HOME_CARE", "NURSING_HOME", "DAY_NIGHT_CARE"]);
    const nearbyOthers = nearbyPool.filter((f) => otherTypes.has(f.facilityType) && f.grade !== null);
    const others = (
      nearbyOthers.length > 0
        ? nearbyOthers
        : facilities.filter((f) => otherTypes.has(f.facilityType) && f.grade !== null)
    )
      .slice()
      .sort(byGrade)
      .slice(0, remaining);

    return [...hospitals, ...others];
  }, [nearbyPool, facilities]);

  return (
    <main className="pb-24">
      {showLocationConsent && (
        <LocationConsentModal onAllow={handleAllowLocation} onSkip={handleSkipLocation} />
      )}
      <SearchHero heroSlides={heroSlides} />

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
          <span className="text-sm text-ink-300">내 주변 100km 이내 · 평가등급이 높은 시설</span>
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
            <span className="text-sm text-ink-300">요양병원은 설립연도순 · 그 외는 평가등급순</span>
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
