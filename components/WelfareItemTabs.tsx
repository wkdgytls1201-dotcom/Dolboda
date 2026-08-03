"use client";

import { useState } from "react";
import type { EquipmentItem } from "@/lib/welfareEquipment";

// 구입/대여 품목 탭 전환. 유일한 상호작용이라 이 부분만 클라이언트 컴포넌트로 뗀다
// (페이지 나머지는 서버 렌더로 남겨 검색엔진이 그대로 읽는다).
export function WelfareItemTabs({
  purchase,
  rental,
}: {
  purchase: EquipmentItem[];
  rental: EquipmentItem[];
}) {
  const [tab, setTab] = useState<"purchase" | "rental">("purchase");
  const items = tab === "purchase" ? purchase : rental;

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-2xl bg-ink-100/70 p-1">
        {(
          [
            ["purchase", "구입 품목"],
            ["rental", "대여 품목"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-[44px] flex-1 rounded-xl text-sm font-bold transition-all duration-200 ${
              tab === key ? "bg-white text-primary-700 shadow-card" : "text-ink-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* key로 리마운트시켜 탭을 바꿀 때마다 다시 떠오르게 한다(기존 message-in 재사용) */}
      <div key={tab} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {items.map((item, i) => (
          <div
            key={item.name}
            className="animate-fade-up rounded-2xl bg-white p-3.5 shadow-card"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span aria-hidden className="mb-1.5 block text-2xl">
              {item.emoji}
            </span>
            <p className="text-[13px] font-bold text-ink-900">{item.name}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
