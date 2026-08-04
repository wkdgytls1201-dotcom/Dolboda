"use client";

import { useEffect, useState } from "react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";
import { Switch } from "@/components/Switch";

interface Prefs {
  newJob: boolean;
  matchUpdate: boolean;
}

// /api/sitter/notification-prefs가 없을 때(로딩 중) 보여줄 기본값.
// 서버 쪽 DEFAULT_PREFS(app/api/sitter/notification-prefs/route.ts)와 같은 값이어야
// 화면이 깜빡이지 않는다 — 둘이 다르면 "로딩 중엔 켜져 보이다가 로딩 끝나면 꺼져 보이는"
// 이상한 깜빡임이 생긴다.
const DEFAULT_PREFS: Prefs = { newJob: true, matchUpdate: true };

// 2026-08-04까지는 이 설정이 브라우저 localStorage에만 저장됐다. localStorage는 그
// 브라우저·그 기기에만 남기 때문에, 알림을 실제로 보내는 서버 쪽 프로그램은 "누가
// 알림을 켜뒀는지" 전혀 알 수 없었다 — 화면 스위치는 켜져 있어도 실제로는 아무도
// 알림을 못 받는 상태였다. 그래서 서버 API(GET·PATCH)로 바꿨다. 자세한 이유는
// app/api/sitter/notification-prefs/route.ts 상단 주석 참고.
export default function SitterNotificationsPage() {
  // undefined = 아직 서버에서 안 불러온 상태(로딩 중)
  const [prefs, setPrefs] = useState<Prefs | undefined>(undefined);

  useEffect(() => {
    fetch("/api/sitter/notification-prefs")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Prefs) => setPrefs(data))
      .catch(() => setPrefs(DEFAULT_PREFS)); // 못 불러와도 화면이 죽지 않게 기본값으로
  }, []);

  function update(key: keyof Prefs, value: boolean) {
    if (!prefs) return;

    // 먼저 화면을 바로 바꿔준다(눌렀는데 반응이 없으면 답답하다). 대신 서버 저장이
    // 실패하면(res.ok가 false) 원래 값으로 되돌린다.
    //
    // ★ fetch()는 서버가 400·500 같은 에러를 응답해도 "실패"로 치지 않는다(네트워크
    // 자체가 끊겼을 때만 실패로 본다). 그래서 반드시 res.ok를 직접 확인해야 한다 —
    // 이 부분을 빠뜨려서 "화면은 켜졌는데 서버엔 저장 안 됨" 버그가 이 프로젝트에
    // 실제로 있었다(app/api/favorites 관련, 2026-08-04에 발견·수정).
    const prev = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);

    fetch("/api/sitter/notification-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("save failed");
      })
      .catch(() => setPrefs(prev));
  }

  if (!prefs) {
    return (
      <MyPageShell>
        <PageLoader compact />
      </MyPageShell>
    );
  }

  return (
    <MyPageShell>
      <h2 className="mb-2 text-xl font-bold text-ink-900">알림 설정</h2>
      <p className="mb-6 text-sm text-ink-500">
        돌보다 매니저 활동과 관련된 알림을 받을지 선택해요.
      </p>

      <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[15px] font-bold text-ink-900">새 일자리 알림</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">
              내 활동 지역에 새 돌봄 일자리가 올라오면 알려줘요
            </p>
          </div>
          <Switch checked={prefs.newJob} onChange={(v) => update("newJob", v)} label="새 일자리 알림" />
        </div>
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[15px] font-bold text-ink-900">매칭 진행 알림</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">
              지원한 일자리에 진행 상황이 생기면 알려줘요
            </p>
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
