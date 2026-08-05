"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SearchHero } from "@/components/SearchHero";
import type { HeroSlide } from "@/components/HeroBanner";
import { FacilityCard } from "@/components/FacilityCard";
import { FacilityCardSkeleton } from "@/components/FacilityCardSkeleton";
import { CompareSelectBar } from "@/components/CompareSelectBar";
import { StatsStrip } from "@/components/StatsStrip";
import { RecentFacilitiesSection } from "@/components/RecentFacilitiesSection";
import { Reveal } from "@/components/Reveal";
import { LocationConsentModal } from "@/components/LocationConsentModal";
import { useNearbyFacilities, type FacilityStats } from "@/lib/useFacilities";
import { DEFAULT_ORIGIN, haversineDistanceKm } from "@/lib/distance";
import { isHospital, type Facility } from "@/lib/types";
import { SCORE_LEVEL_THRESHOLDS } from "@/lib/dolbodaScore";
import { LOCATION_CONSENT_KEY, saveUserLocation, readUserLocation } from "@/lib/userLocation";

// 홈 전용 경량 목록 — 추천 시설과 "가장 최근 설립"의 전국 대체 후보만 담겨 있다.
// 예전엔 이 20여 건을 뽑으려고 전국 등록순 200건(약 150KB)을 통째로 받았다.
interface HomeLists {
  recommended: Facility[];
  hospitals: Facility[];
  others: Facility[];
}
const EMPTY_LISTS: HomeLists = { recommended: [], hospitals: [], others: [] };

export default function HomeClient({
  initialStats,
  heroSlides,
}: {
  initialStats: FacilityStats;
  heroSlides: HeroSlide[];
}) {
  const [homeLists, setHomeLists] = useState<HomeLists>(EMPTY_LISTS);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/facilities/home")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.recommended) setHomeLists(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
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
  const { facilities: nearbyPool, loading: nearbyLoading } = useNearbyFacilities(
    origin.lat,
    origin.lng,
    300,
    { enabled: originReady }
  );
  const nearbyFacilities = useMemo(() => nearbyPool.slice(0, 6), [nearbyPool]);
  // 위치 결정 전(동의 모달·저장분 복원)과 첫 응답 전에는 "기다리는 중"이다.
  // 이 동안 목록 자리를 빈 그리드(높이 0)로 두면 아래 섹션·푸터가 위로 올라왔다가
  // 데이터 도착과 함께 화면 전체가 내려앉는다(11차 §1-B에서 겪은 그 증상).
  // 같은 모양의 뼈대가 자리를 지키면 도착 시 바뀌는 건 내용뿐이다.
  const nearbyPending = !originReady || nearbyLoading;

  // 추천 시설: 서버(/api/facilities/home)가 프리미엄 고정 노출 + 1등급 채움까지
  // 같은 기준으로 계산해서 6곳만 내려준다.
  const recommended = homeLists.recommended;

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

  // 이 지역 안심지수 TOP — 이미 받아둔 주변 300건에 서버가 실어준 점수(dolbodaTotal)가
  // 들어 있어서 추가 요청 없이 계산만 하면 된다.
  //
  // "점수 높은 시설"(위)은 공단 평가등급 기준이라 1등급 안에서는 순서가 사실상 거리순인데,
  // 안심지수는 등급·인력·현원·행정처분까지 묶은 값이라 같은 1등급 안에서도 순위가 갈린다.
  //
  // 표본이 적으면 "TOP"이 의미가 없어서(주변에 몇 곳뿐인 지역) 50곳 이상일 때만 내보내고,
  // "우수" 문턱(전국 상위 25%) 아래는 넣지 않는다 — 주변이 전부 낮은 지역에서 60점대
  // 시설이 "1위"로 걸리면 보호자가 안심해도 되는 곳으로 오해할 수 있다.
  const regionTop = useMemo(() => {
    if (nearbyPool.length < 50) return [];
    return nearbyPool
      .filter((f) => (f.dolbodaTotal ?? 0) >= SCORE_LEVEL_THRESHOLDS.good)
      .slice()
      .sort((a, b) => (b.dolbodaTotal ?? 0) - (a.dolbodaTotal ?? 0) || a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }, [nearbyPool]);

  // 상위 3곳만 리본을 단다 — 6장 전부에 순위를 붙이면 "6위"까지 강조돼 변별력이 없어진다.
  // 문구는 카드 사진 위에 얹히는 자리라 짧을수록 좋다("이 지역 안심지수 1위"는 길었다).
  const rankBadgeById = useMemo(
    () => new Map(regionTop.slice(0, 3).map((f, i) => [f.id, `지역 안심지수 ${i + 1}위`])),
    [regionTop]
  );

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
    // 주변에 요양병원이 없으면 서버가 내려준 전국 최신 설립 후보(homeLists.hospitals)를 쓴다
    const hospitals = (nearbyHospitals.length > 0 ? nearbyHospitals : homeLists.hospitals)
      .slice()
      .sort(byRecency)
      .slice(0, SLOTS);

    const remaining = SLOTS - hospitals.length;
    if (remaining <= 0) return hospitals;

    const otherTypes = new Set(["HOME_CARE", "NURSING_HOME", "DAY_NIGHT_CARE"]);
    const nearbyOthers = nearbyPool.filter((f) => otherTypes.has(f.facilityType) && f.grade !== null);
    const others = (nearbyOthers.length > 0 ? nearbyOthers : homeLists.others)
      .slice()
      .sort(byGrade)
      .slice(0, remaining);

    return [...hospitals, ...others];
  }, [nearbyPool, homeLists]);

  return (
    <main className="pb-24">
      {showLocationConsent && (
        <LocationConsentModal onAllow={handleAllowLocation} onSkip={handleSkipLocation} />
      )}
      <SearchHero heroSlides={heroSlides} />

      <Reveal className="mx-auto max-w-6xl px-4 pt-12">
        <StatsStrip stats={homeStats} />
      </Reveal>

      {/* 통계 바로 다음 자리 — 돌보다만 가진 지표라 홈에서 가장 먼저 보여준다.
          섹션 자체를 옅은 보라 판 위에 올려 다른 목록 섹션과 구분한다. */}
      {regionTop.length > 0 && (
        <section className="mt-12 bg-royal-50/50 py-12">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal className="mb-5">
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-royal-500 px-3 py-1 text-[11px] font-bold text-white shadow-royal">
                <Sparkles size={12} aria-hidden />
                돌보다 AI
              </span>
              <h2 className="text-xl font-bold text-ink-900">이 지역 안심지수 TOP</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">
                평가등급 하나만 보지 않고 인력·현원·운영 정보까지 함께 계산해, 내 주변 시설의
                순위를 매겼어요.{" "}
                {/* 설명 끝에 이어 붙인다 — 제목 옆에 두면 모바일에서 한 줄을 통째로 차지해
                    목록보다 링크가 먼저 눈에 들어온다 */}
                <Link
                  href="/data-policy"
                  className="whitespace-nowrap font-semibold text-royal-600 underline underline-offset-2"
                >
                  계산 방식 보기
                </Link>
              </p>
            </Reveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regionTop.map((f, i) => (
                <Reveal key={f.id} delay={i * 60}>
                  <FacilityCard
                    facility={f}
                    distanceKm={f.distanceKm}
                    rankBadge={rankBadgeById.get(f.id)}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-12">
        <Reveal className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <h2 className="text-xl font-bold text-ink-900">내 주변 시설</h2>
          <span className="text-sm text-ink-300">현재 위치에서 가까운 순</span>
        </Reveal>
        {nearbyPending && nearbyFacilities.length === 0 ? (
          <FacilityCardSkeleton />
        ) : nearbyFacilities.length === 0 ? (
          // 응답이 왔는데 비었다 = 사실상 API 오류(주변 API는 거리 제한 없이 가까운 순으로
          // 채워준다). 무한 스켈레톤 대신 다른 길을 안내한다.
          <div className="rounded-2xl border border-ink-100 bg-white px-5 py-10 text-center">
            <p className="text-sm text-ink-500">주변 시설을 불러오지 못했어요.</p>
            <Link
              href="/search"
              className="mt-2 inline-block text-sm font-semibold text-royal-600 underline underline-offset-2"
            >
              시설찾기에서 지역으로 검색하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nearbyFacilities.map((f, i) => (
              <Reveal key={f.id} delay={i * 60}>
                <FacilityCard facility={f} distanceKm={f.distanceKm} rankBadge={rankBadgeById.get(f.id)} />
              </Reveal>
            ))}
          </div>
        )}
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
                <FacilityCard facility={f} rankBadge={rankBadgeById.get(f.id)} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 최근 본 시설 — 로컬 기록이 있는 재방문자에게만 나타난다(신규 방문자는 빈 섹션도
          자리도 없음). 추천 아래에 두는 이유: 첫 화면의 가치 제안(내주변·추천)은 그대로
          두되, 재방문자의 "아까 그 시설" 재진입을 스크롤 한 번 안에서 잇는다. */}
      <RecentFacilitiesSection />

      {/* content-visibility: 첫 화면에서 두 화면 이상 아래에 있는 섹션들은 화면에
          가까워질 때까지 렌더링을 미룬다(스펙 §3-7). auto 값이라 한 번 그려지면 실제
          높이를 기억해 스크롤바 튐이 없고, 미지원 브라우저에선 그냥 무시된다.
          내주변 섹션은 폴드 바로 아래라 추정 높이 오차가 보일 수 있어 제외. */}
      <section className="mx-auto max-w-6xl px-4 pb-12 [content-visibility:auto] [contain-intrinsic-size:auto_1200px]">
        <Reveal className="mb-5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <h2 className="text-xl font-bold text-ink-900">점수 높은 시설</h2>
          <span className="text-sm text-ink-300">내 주변 100km 이내 · 평가등급이 높은 시설</span>
        </Reveal>
        {nearbyPending && topScored.length === 0 ? (
          <FacilityCardSkeleton />
        ) : topScored.length === 0 ? (
          <div className="rounded-2xl border border-ink-100 bg-white px-5 py-10 text-center">
            <p className="text-sm text-ink-500">주변 100km 안에 평가등급이 있는 시설이 없어요.</p>
            <Link
              href="/search"
              className="mt-2 inline-block text-sm font-semibold text-royal-600 underline underline-offset-2"
            >
              전국에서 찾아보기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topScored.map((f, i) => (
              <Reveal key={f.id} delay={i * 60}>
                <FacilityCard facility={f} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {recentlyEstablished.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12 [content-visibility:auto] [contain-intrinsic-size:auto_1200px]">
          <Reveal className="mb-5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <h2 className="text-xl font-bold text-ink-900">가장 최근 설립</h2>
            <span className="text-sm text-ink-300">요양병원은 설립연도순 · 그 외는 평가등급순</span>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyEstablished.map((f, i) => (
              <Reveal key={f.id} delay={i * 60}>
                <FacilityCard facility={f} rankBadge={rankBadgeById.get(f.id)} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <CompareSelectBar />
    </main>
  );
}
