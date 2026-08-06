"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  Eye,
  Heart,
  Scale,
} from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";

interface ConsultItem {
  id: string;
  facilityId: string;
  facilityName: string;
  status: string | null;
  createdAt: string;
}

// 보호자가 상담을 넣고 나면 며칠에 걸쳐 여러 시설을 견주게 된다.
// "어디에 넣었더라"를 확인하러 돌아오는 자리가 이 화면이다.
//
// 설계 원칙(탈중개 방지): 여기에는 "전화 걸기" 버튼을 두지 않는다.
// 다음 행동은 전부 플랫폼 안에서 끝나게 한다 — 시설 다시 보기·비교함·관심시설.
// 연락은 시설이 직접 하고, 우리는 그 사이의 판단을 돕는 자리를 지킨다.

const STATUS_STEPS = [
  { key: null, label: "신청함", desc: "시설의 연락을 기다리는 중" },
  { key: "연락받음", label: "연락받음", desc: "시설과 이야기 나눔" },
  { key: "입소결정", label: "입소 결정", desc: "이 시설로 정함" },
] as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function ConsultHistoryPage() {
  const { status: authStatus } = useSession();
  const [items, setItems] = useState<ConsultItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 세션 상태를 기다리지 않고 마운트 시 바로 부른다 — API가 어차피 서버에서
  // auth()로 401을 가리므로 클라이언트가 authStatus를 다시 기다릴 이유가 없다.
  // 예전엔 [authStatus authenticated]를 기다렸다 불러서, 세션 확인과 데이터 조회가
  // 직렬로 이어져 있었다(2026-08-07 감사 — points 페이지와 같은 방식으로 통일).
  useEffect(() => {
    fetch("/api/consult/mine")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.items ?? []))
      .catch(() => setError("상담 내역을 불러오지 못했어요."));
  }, []);

  async function setStatus(id: string, next: string | null) {
    setBusyId(id);
    // 화면부터 바꾸고 실패하면 되돌린다 — 체크 한 번에 응답을 기다리게 하면 답답하다
    const prev = items;
    setItems((list) => list?.map((i) => (i.id === id ? { ...i, status: next } : i)) ?? null);
    try {
      const res = await fetch("/api/consult/mine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prev);
      setError("상태를 바꾸지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusyId(null);
    }
  }

  if (authStatus === "loading") return <PageLoader />;

  if (authStatus !== "authenticated") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm text-ink-500">상담 내역은 로그인 후 확인할 수 있어요.</p>
      </main>
    );
  }

  return (
    <MyPageShell>
      <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-ink-900">
        <ClipboardList size={22} className="text-royal-500" />
        상담 신청 내역
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-ink-500">
        상담을 넣은 시설을 한자리에서 보고, 진행 상황을 직접 표시해두세요.
        여러 곳을 견주는 동안 헷갈리지 않아요.
      </p>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-primary-50 px-4 py-3 text-[13px] font-semibold text-primary-700"
        >
          {error}
        </p>
      )}

      {items === null && !error && <PageLoader compact />}

      {items?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-royal-200 bg-royal-50/50 p-8 text-center">
          <p className="mb-1 text-[15px] font-bold text-ink-900">아직 신청한 상담이 없어요</p>
          <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
            마음에 드는 시설을 찾으면 상세페이지에서 상담을 신청할 수 있어요.
          </p>
          <Link
            href="/search"
            className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-soft transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
          >
            시설 찾아보기
            <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="animate-fade-up rounded-2xl bg-white p-5 shadow-card"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-ink-900">{item.facilityName}</p>
                  <p className="mt-0.5 text-[13px] text-ink-400">
                    {formatDate(item.createdAt)} 신청
                  </p>
                </div>
                {item.status === "입소결정" && (
                  <span className="shrink-0 rounded-full bg-mint-100 px-2.5 py-1 text-[12px] font-bold text-mint-700">
                    입소 결정
                  </span>
                )}
              </div>

              {/* 진행 상황 — 보호자가 스스로 표시한다(시설 응답을 우리가 알 수 없으므로).
                  현재 단계보다 앞선 것은 눌러서 진행, 현재 단계를 다시 누르면 해제된다. */}
              <div className="mb-4 flex gap-1.5">
                {STATUS_STEPS.map((step) => {
                  const active = item.status === step.key;
                  const stepIdx = STATUS_STEPS.findIndex((s) => s.key === step.key);
                  const curIdx = STATUS_STEPS.findIndex((s) => s.key === item.status);
                  const passed = stepIdx < curIdx;
                  return (
                    <button
                      key={step.label}
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => setStatus(item.id, active && step.key ? null : step.key)}
                      className={`flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-xl px-1 text-[12px] font-bold transition-all duration-150 active:scale-95 disabled:opacity-60 ${
                        active
                          ? "bg-royal-500 text-white shadow-soft"
                          : passed
                          ? "bg-royal-50 text-royal-600"
                          : "bg-ivory-100 text-ink-400"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {(active || passed) && <Check size={12} />}
                        {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mb-4 text-[12px] leading-relaxed text-ink-400">
                {STATUS_STEPS.find((s) => s.key === item.status)?.desc}
              </p>

              {/* 다음 행동은 전부 플랫폼 안에서 — 전화 걸기 버튼은 두지 않는다(설계 원칙) */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/facility/${item.facilityId}`}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-royal-50 px-3 text-[13px] font-bold text-royal-700 transition-all duration-150 ease-snappy hover:bg-royal-100 active:scale-95"
                >
                  <Eye size={14} />
                  다시 보기
                </Link>
                <Link
                  href="/compare"
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-ivory-100 px-3 text-[13px] font-bold text-ink-600 transition-all duration-150 ease-snappy hover:bg-ink-100 active:scale-95"
                >
                  <Scale size={14} />
                  비교하기
                </Link>
                <Link
                  href="/favorites"
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-ivory-100 px-3 text-[13px] font-bold text-ink-600 transition-all duration-150 ease-snappy hover:bg-ink-100 active:scale-95"
                >
                  <Heart size={14} />
                  관심시설
                </Link>
              </div>
            </div>
          ))}

          <Link
            href="/search"
            className="flex min-h-[52px] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink-100 bg-white/60 text-sm font-bold text-ink-500 transition-all duration-150 ease-snappy hover:border-primary-300 hover:text-primary-600 active:scale-[0.99]"
          >
            <Building2 size={16} />
            다른 시설도 알아보기
          </Link>
        </div>
      )}
    </MyPageShell>
  );
}
