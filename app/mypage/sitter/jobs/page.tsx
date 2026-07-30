"use client";

import { Briefcase } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";

export default function SitterJobsPage() {
  return (
    <MyPageShell>
      <h2 className="mb-1 text-xl font-bold text-ink-900">일자리 관리</h2>
      <p className="mb-6 text-sm text-ink-500">지원했거나 제안받은 돌봄 일자리를 볼 수 있어요.</p>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-100 bg-ink-100/20 py-16 text-center">
        <Briefcase size={28} className="text-ink-300" />
        <p className="text-sm font-medium text-ink-500">아직 등록된 일자리가 없어요</p>
        <p className="px-6 text-xs text-ink-300">
          요양시설·업체가 구인 글을 올리면 활동 지역·경력에 맞는 일자리가 여기 보여요.
        </p>
      </div>
    </MyPageShell>
  );
}
