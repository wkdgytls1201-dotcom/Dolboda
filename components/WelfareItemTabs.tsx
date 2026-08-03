"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { EquipmentItem } from "@/lib/welfareEquipment";
import { WelfareItemIcon } from "@/components/WelfareItemIcon";

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
          <Link
            key={item.name}
            href={`/welfare-equipment/${encodeURIComponent(item.slug)}`}
            className="animate-fade-up group flex flex-col rounded-2xl bg-white p-3.5 shadow-card transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.97]"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <WelfareItemIcon
              name={item.name}
              index={i}
              size={22}
              className="mb-2 h-10 w-10 transition-transform duration-200 group-hover:scale-110"
            />
            <p className="text-[13px] font-bold text-ink-900">{item.name}</p>
            <p className="mt-0.5 line-clamp-2 flex-1 text-[11px] leading-snug text-ink-400">
              {item.desc}
            </p>
            <span className="mt-1.5 flex items-center gap-0.5 text-[11px] font-bold text-primary-600">
              자세히
              <ChevronRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
