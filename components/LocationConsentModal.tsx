"use client";

import { MapPin } from "lucide-react";

export function LocationConsentModal({
  onAllow,
  onSkip,
}: {
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-soft">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <MapPin size={26} />
        </span>
        <h3 className="mb-2 text-lg font-bold text-ink-900">
          내 주변 요양시설을 보여드릴까요?
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-ink-500">
          위치 정보를 허용하면 우리 동네 기준으로 가까운 요양시설을 거리순으로 보여드려요.
          위치는 저장되지 않고 검색에만 사용돼요.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onAllow}
            className="rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-95"
          >
            위치 허용하고 보기
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl px-5 py-3 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:bg-ink-100"
          >
            다음에 할게요
          </button>
        </div>
      </div>
    </div>
  );
}
