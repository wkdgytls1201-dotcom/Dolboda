"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { FacilityCard } from "@/components/FacilityCard";
import { useFavorites } from "@/lib/favoritesContext";
import { useFacilitiesByIds } from "@/lib/useFacilities";

export default function FavoritesPage() {
  const { favoriteIds } = useFavorites();
  const { facilities } = useFacilitiesByIds(favoriteIds);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-24">
      <h1 className="mb-1 text-xl font-bold text-ink-900">관심시설</h1>
      <p className="mb-6 text-sm text-ink-500">
        하트를 눌러 저장한 시설이에요. 나중에 이 목록을 기준으로 빈자리·등급 변경 알림을 받을 수 있어요.
      </p>

      {facilities.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-card">
          <Heart size={32} className="mx-auto mb-3 text-ink-100" />
          <p className="mb-4 text-sm text-ink-300">아직 저장한 시설이 없어요.</p>
          <Link
            href="/search"
            className="inline-block rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
          >
            시설 찾아보기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((f) => (
            <FacilityCard key={f.id} facility={f} />
          ))}
        </div>
      )}
    </main>
  );
}
