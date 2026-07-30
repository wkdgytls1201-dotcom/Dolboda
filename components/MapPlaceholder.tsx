import { MapPinned } from "lucide-react";

export function MapPlaceholder({ label = "지도 준비 중" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-100 bg-ink-100/30 text-center">
      <MapPinned size={28} className="text-ink-300" />
      <p className="text-sm font-medium text-ink-500">{label}</p>
      <p className="text-xs text-ink-300">카카오맵/네이버 지도 API 연동 예정</p>
    </div>
  );
}
