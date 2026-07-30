"use client";

import { useState } from "react";
import { Bell, BellRing, MapPin } from "lucide-react";
import { useSession } from "next-auth/react";
import { useFavorites } from "@/lib/favoritesContext";
import { useAlertPreferences } from "@/lib/alertPreferencesContext";
import { useFacilitiesByIds } from "@/lib/useFacilities";
import { Switch } from "@/components/Switch";
import { AuthModal } from "@/components/AuthModal";
import { InfoTooltip } from "@/components/InfoTooltip";

const REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

export default function NotificationsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { favoriteIds } = useFavorites();
  const { facilities: favoriteFacilities } = useFacilitiesByIds(favoriteIds);
  const { getPref, setPref, regionInterests, toggleRegionInterest } = useAlertPreferences();
  const [showAuth, setShowAuth] = useState(false);

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <Bell size={32} className="mx-auto mb-3 text-ink-100" />
        <h1 className="mb-2 text-xl font-bold text-ink-900">알림은 로그인 후 이용할 수 있어요</h1>
        <p className="mb-6 text-sm text-ink-500">
          관심시설의 빈자리·등급 변경, 관심 지역 신규 시설 알림을 받으려면 로그인이 필요해요.
        </p>
        <button
          type="button"
          onClick={() => setShowAuth(true)}
          className="rounded-xl bg-primary-500 px-6 py-3 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-95"
        >
          로그인하기
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <h1 className="mb-1 text-xl font-bold text-ink-900">알림</h1>
      <p className="mb-8 text-sm text-ink-500">
        설정해두면 조건에 맞는 변화가 생겼을 때 알려드려요.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center text-base font-bold text-ink-900">
          <MapPin size={16} className="mr-1.5" />
          관심 지역
          <InfoTooltip text="선택한 지역에 새 시설이 등록되면 알려드려요." />
        </h2>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => {
            const active = regionInterests.includes(region);
            return (
              <button
                key={region}
                type="button"
                onClick={() => toggleRegionInterest(region)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-95 ${
                  active
                    ? "border-primary-500 bg-primary-500 text-white"
                    : "border-ink-100 bg-white text-ink-700 hover:border-primary-300 hover:bg-primary-50"
                }`}
              >
                {region}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-ink-900">시설별 알림 설정</h2>
        {favoriteFacilities.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-ink-300 shadow-card">
            관심시설(하트)로 저장한 시설이 있어야 알림을 설정할 수 있어요.
          </div>
        ) : (
          <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
            {favoriteFacilities.map((f) => {
              const pref = getPref(f.id);
              return (
                <div key={f.id} className="p-4">
                  <p className="mb-3 font-semibold text-ink-900">{f.name}</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-ink-500">입소 가능 자리 생기면 알림</span>
                      <Switch
                        checked={pref.vacancy}
                        onChange={(v) => setPref(f.id, "vacancy", v)}
                        label={`${f.name} 빈자리 알림`}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-ink-500">평가등급 변경 시 알림</span>
                      <Switch
                        checked={pref.gradeChange}
                        onChange={(v) => setPref(f.id, "gradeChange", v)}
                        label={`${f.name} 등급 변경 알림`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-ink-900">알림함</h2>
        <div className="rounded-2xl bg-ink-100/30 p-10 text-center">
          <BellRing size={28} className="mx-auto mb-3 text-ink-300" />
          <p className="text-sm text-ink-500">아직 도착한 알림이 없어요.</p>
          <p className="mt-1 text-xs text-ink-300">
            위 설정에 맞는 변화가 생기면 여기에 표시돼요. (실시간 발송은 알림 서버 연동 후
            제공돼요)
          </p>
        </div>
      </section>
    </main>
  );
}
