"use client";

import { useEffect, useState } from "react";
import { MyPageShell } from "@/components/MyPageShell";
import { Switch } from "@/components/Switch";

const STORAGE_KEY = "dolboda-sitter-notification-prefs";

interface Prefs {
  newJob: boolean;
  matchUpdate: boolean;
}

const DEFAULT_PREFS: Prefs = { newJob: true, matchUpdate: true };

export default function SitterNotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setPrefs(JSON.parse(raw));
  }, []);

  function update(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <MyPageShell>
      <h2 className="mb-1 text-xl font-bold text-ink-900">알림 설정</h2>
      <p className="mb-6 text-sm text-ink-500">
        돌보다 매니저 활동과 관련된 알림을 받을지 선택해요. (실제 발송 인프라는 준비 중이에요)
      </p>

      <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">새 일자리 알림</p>
            <p className="text-xs text-ink-300">내 활동 지역에 새 돌봄 일자리가 올라오면 알려줘요</p>
          </div>
          <Switch checked={prefs.newJob} onChange={(v) => update("newJob", v)} label="새 일자리 알림" />
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">매칭 진행 알림</p>
            <p className="text-xs text-ink-300">지원한 일자리에 진행 상황이 생기면 알려줘요</p>
          </div>
          <Switch
            checked={prefs.matchUpdate}
            onChange={(v) => update("matchUpdate", v)}
            label="매칭 진행 알림"
          />
        </div>
      </div>
    </MyPageShell>
  );
}
