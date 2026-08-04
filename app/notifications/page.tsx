"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, BellRing, MapPin, Search, X } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useFavorites } from "@/lib/favoritesContext";
import { useAlertPreferences } from "@/lib/alertPreferencesContext";
import { useFacilitiesByIds } from "@/lib/useFacilities";
import { Switch } from "@/components/Switch";
import { AuthModal } from "@/components/AuthModal";
import { InfoTooltip } from "@/components/InfoTooltip";
import { REGIONS } from "@/lib/regions";

interface SavedSearchItem {
  id: string;
  label: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { favoriteIds } = useFavorites();
  const { facilities: favoriteFacilities } = useFacilitiesByIds(favoriteIds);
  const { getPref, setPref, regionInterests, toggleRegionInterest } = useAlertPreferences();
  const [showAuth, setShowAuth] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/saved-searches")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setSavedSearches(d.items ?? []))
      .catch(() => setSavedSearches([]));
  }, [user?.id]);

  async function removeSavedSearch(id: string) {
    setSavedSearches((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    await fetch(`/api/saved-searches/${id}`, { method: "DELETE" }).catch(() => {});
  }

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

      {!user.email && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-accent-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-900">알림을 받으려면 이메일이 필요해요</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
              여기서 설정을 켜두어도, 계정에 이메일이 없으면 보낼 곳이 없어 알림이 전달되지
              않아요. 카카오 로그인에서 이메일 제공에 동의하지 않으면 이렇게 돼요.
            </p>
            <button
              type="button"
              onClick={() => signIn("kakao")}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-accent-500 px-4 text-xs font-bold text-white transition-all duration-150 hover:bg-accent-600 active:scale-95"
            >
              카카오로 다시 로그인해서 이메일 동의하기
            </button>
          </div>
        </div>
      )}

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
        <h2 className="mb-3 flex items-center text-base font-bold text-ink-900">
          <Search size={16} className="mr-1.5" />
          저장한 검색조건
          <InfoTooltip text="시설찾기에서 조건을 골라 저장하면, 그 조건에 맞는 새 시설이 등록될 때 알려드려요." />
        </h2>
        {savedSearches === null ? null : savedSearches.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-ink-300 shadow-card">
            아직 저장한 검색조건이 없어요.{" "}
            <Link href="/search" className="font-semibold text-primary-600 underline">
              시설찾기
            </Link>
            에서 조건을 고르고 저장해보세요.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
            {savedSearches.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                <span className="min-w-0 truncate text-sm font-semibold text-ink-900">
                  {s.label}
                </span>
                <button
                  type="button"
                  aria-label={`${s.label} 검색조건 삭제`}
                  onClick={() => removeSavedSearch(s.id)}
                  className="-m-2 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-ink-300 transition-all duration-150 hover:bg-ink-100 hover:text-ink-700 active:scale-90 active:bg-ink-100"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
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
