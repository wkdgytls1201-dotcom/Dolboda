"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, ChevronRight, Coins, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";
import { BenefitGauge, CopayCompareBars } from "@/components/WelfareBenefitVisuals";
import { WelfareItemTabs } from "@/components/WelfareItemTabs";
import { WelfareConsultForm } from "@/components/WelfareConsultForm";
import { useCareProfiles, type CareProfileSummary } from "@/lib/careProfileContext";
import { ANNUAL_LIMIT, BASE_YEAR, PURCHASE_ITEMS, RENTAL_ITEMS } from "@/lib/welfareEquipment";
import { maskAccount } from "@/lib/maskAccount";
import { REGION_SEO } from "@/lib/regionSeo";

// 마이페이지 — 복지용구 혜택 (보호자 영역).
//
// 4단계로 나뉜다: 등급 없음 → 요양인정번호 등록 → 혜택 안내 → 사업소 찾기.
// 남은 급여 실시간 조회는 공단 연동이 없어 만들지 않는다 — "등록"은 정보 확인용일 뿐,
// 실제 남은 한도는 사업소 상담으로 확인해야 한다는 걸 화면에서 계속 밝힌다
// (없는 데이터를 있는 것처럼 보여주지 않는다는 프로젝트 원칙).

const ELIGIBLE_GRADES = new Set(["1등급", "2등급", "3등급", "4등급", "5등급", "인지지원등급"]);

function CenterMessage({ title, desc, children }: { title: string; desc: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-bold text-ink-900">{title}</h1>
      <p className="mb-6 text-sm leading-relaxed text-ink-500">{desc}</p>
      {children}
    </main>
  );
}

export default function WelfareBenefitPage() {
  const { data: session, status } = useSession();
  const { profiles, loaded } = useCareProfiles();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && profiles.length > 0) setSelectedId(profiles[0].id);
  }, [profiles, selectedId]);

  if (status === "loading") return <PageLoader />;
  if (!session?.user) {
    return (
      <CenterMessage
        title="로그인이 필요해요"
        desc="복지용구 혜택은 로그인 후 확인할 수 있어요."
      />
    );
  }

  return (
    <MyPageShell>
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
          <Sparkles size={18} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-ink-900">복지용구 혜택</h1>
          <p className="text-[13px] text-ink-400">{BASE_YEAR}년 기준 · 연 최대 {ANNUAL_LIMIT.toLocaleString()}원</p>
        </div>
      </div>

      {!loaded ? (
        <PageLoader compact />
      ) : profiles.length === 0 ? (
        <EmptyProfileState />
      ) : (
        <ProfileFlow
          profiles={profiles}
          selectedId={selectedId ?? profiles[0].id}
          onSelect={setSelectedId}
        />
      )}
    </MyPageShell>
  );
}

function EmptyProfileState() {
  return (
    <div className="animate-fade-up rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 p-8 text-center">
      <p className="mb-1 text-[15px] font-bold text-ink-900">먼저 보호자 프로필이 필요해요</p>
      <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
        어르신과의 관계와 장기요양등급을 저장해두면 복지용구 혜택을 바로 확인할 수 있어요.
      </p>
      <Link
        href="/mypage/care-profile"
        className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-soft transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
      >
        보호자 프로필 만들기
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function ProfileFlow({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: CareProfileSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = profiles.find((p) => p.id === selectedId) ?? profiles[0];
  const eligible = selected.ltcGrade != null && ELIGIBLE_GRADES.has(selected.ltcGrade);

  return (
    <div>
      {profiles.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`min-h-[44px] rounded-full px-3.5 text-xs font-bold transition-colors ${
                p.id === selected.id ? "bg-ink-900 text-white" : "bg-white text-ink-500 shadow-card"
              }`}
            >
              {p.relation}
            </button>
          ))}
        </div>
      )}

      {/* 요양인정번호는 여기서 막지 않는다 — 대부분의 보호자는 그 번호를 아직
          모르거나 서류를 찾아봐야 한다. 등급만 있으면 혜택 정보(한도·비교·품목·
          사업소)는 바로 보여주고, 번호 등록은 대시보드 안의 선택 사항으로 둔다. */}
      {!eligible ? <NoGradeState profile={selected} /> : <BenefitDashboard profile={selected} />}
    </div>
  );
}

// 등급테스트 밴드 id → 화면에 짧게 쓸 등급 이름.
//
// GRADE_BANDS의 label("3등급이 예상돼요")과 다른 짧은 표기라 여기 따로 둔다.
// lib/gradeTest.ts를 통째로 import하지 않는 이유도 있다 — 이 화면은 테스트를 실행하지
// 않는데 문항 데이터(TEST_AREAS)까지 번들에 끌려 들어온다.
const ESTIMATED_GRADE_LABEL: Record<string, string> = {
  "1": "1등급",
  "2": "2등급",
  "3": "3등급",
  "4": "4등급",
  "5": "5등급(치매 특별등급)",
  cognitive: "인지지원등급",
  none: "등급 판정이 어려울 수 있어요",
};

function formatEstimatedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function NoGradeState({ profile }: { profile: CareProfileSummary }) {
  const estimated = profile.estimatedBand
    ? ESTIMATED_GRADE_LABEL[profile.estimatedBand] ?? null
    : null;
  // "none"은 "대상이 아닐 수 있다"는 결과다 — 등급을 받은 것처럼 보이면 안 되므로
  // 같은 카드를 쓰되 톤과 문구를 나눈다.
  const isNone = profile.estimatedBand === "none";
  const testedAt = formatEstimatedAt(profile.estimatedAt);

  // 이미 테스트를 해본 사람에게 다시 테스트를 권하지 않는다 — 그 사람에게 남은
  // 다음 행동은 "실제 등급이 나오면 등록하기" 하나뿐이다.
  if (estimated) {
    return (
      <div className="animate-fade-up overflow-hidden rounded-2xl bg-white shadow-card">
        <div
          className={`px-6 py-7 text-center ${
            isNone ? "bg-ivory-100" : "bg-gradient-to-br from-royal-50 to-primary-50"
          }`}
        >
          <span className="mb-2.5 inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-royal-700 shadow-soft backdrop-blur">
            <Sparkles size={12} />
            등급테스트 예상 결과
          </span>
          <p
            className={`font-extrabold text-ink-900 ${
              isNone ? "text-[17px] leading-snug" : "text-[26px]"
            }`}
          >
            {estimated}
          </p>
          {testedAt && <p className="mt-1.5 text-[12px] text-ink-400">{testedAt} 테스트</p>}
        </div>

        <div className="px-6 py-5">
          <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
            {isNone ? (
              <>
                예상 결과로는 복지용구 대상이 아닐 수 있어요. 다만 이 테스트는 참고용이라
                실제 판정과 다를 수 있으니, 공단에 인정 신청을 해보시는 것도 방법이에요.
              </>
            ) : (
              <>
                아직 <strong className="font-bold text-ink-700">공단의 공식 판정</strong>은
                아니에요. 실제로 등급을 받으시면 인정번호와 함께 등록해주세요 — 그때부터 연
                160만원 혜택 정보를 볼 수 있어요.
              </>
            )}
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/mypage/welfare-benefit/cert"
              className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-soft transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
            >
              등급을 받았어요 · 인정번호 등록
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/guide/grade-application"
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-ink-100 bg-white px-5 text-[13px] font-bold text-ink-600 transition-all duration-150 ease-snappy hover:bg-ink-100/60 active:scale-[0.98]"
            >
              등급 신청 방법 보기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up rounded-2xl bg-white p-6 text-center shadow-card">
      <p className="mb-1.5 text-[15px] font-bold text-ink-900">
        {profile.relation}은 아직 장기요양등급이 없어요
      </p>
      <p className="mb-5 text-[13px] leading-relaxed text-ink-500">
        복지용구는 장기요양등급(1~5등급·인지지원등급)을 받은 분만 이용할 수 있어요. 예상
        등급부터 확인해보시겠어요?
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/grade-test"
          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-soft transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
        >
          1분 등급 예상 테스트
        </Link>
        <Link
          href="/mypage/welfare-benefit/cert"
          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-ink-100 bg-white px-5 text-sm font-bold text-ink-700 transition-all duration-150 ease-snappy hover:bg-ink-100 active:scale-[0.98]"
        >
          이미 등급이 있어요
        </Link>
      </div>
    </div>
  );
}

function BenefitDashboard({ profile }: { profile: CareProfileSummary }) {
  return (
    <div className="space-y-4">
      {/* 등록·수정 모두 전용 화면(/mypage/welfare-benefit/cert)이 맡는다 —
          번호가 어디 적혀 있는지, 없으면 무엇을 하면 되는지까지 함께 안내해야 해서
          대시보드 안의 인라인 폼으로는 자리가 부족했다. 여기엔 진입점만 둔다. */}
      {profile.ltcCertNumber ? (
        // 등록됨 — 마스킹해서 보여준다(계좌번호와 같은 규칙)
        <div className="animate-fade-up flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-card">
          <span className="flex min-w-0 items-center gap-2 text-sm text-ink-700">
            <ShieldCheck size={16} className="shrink-0 text-mint-600" />
            <span className="truncate">
              {profile.relation} · 요양인정번호 {maskAccount(profile.ltcCertNumber)} 등록됨
            </span>
          </span>
          <Link
            href="/mypage/welfare-benefit/cert"
            className="-my-3 -mr-2 inline-flex min-h-[44px] shrink-0 items-center px-2 text-xs font-semibold text-ink-300 transition-colors duration-150 hover:text-ink-500 active:text-ink-700"
          >
            다시 등록
          </Link>
        </div>
      ) : (
        // 미등록 — 콘텐츠를 막지는 않되(대부분 이 번호를 지금은 모른다), 등록하면
        // 좋다는 건 적극적으로 알린다.
        <Link
          href="/mypage/welfare-benefit/cert"
          className="animate-fade-up group flex w-full items-center gap-3.5 rounded-2xl border-2 border-royal-200 bg-royal-50/60 p-4 text-left shadow-card transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:border-royal-300 hover:bg-royal-50 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-royal-500 shadow-soft transition-transform duration-200 group-hover:scale-110">
            <ShieldCheck size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-ink-900">
              요양인정번호를 등록해두세요
            </span>
            <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">
              다음에 다시 찾아볼 필요 없이 이 화면에 저장돼요. 없어도 아래 혜택 정보는
              지금 바로 볼 수 있어요.
            </span>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-royal-300 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      )}

      {/* 한도 카드 */}
      <div
        className="animate-fade-up relative rounded-3xl bg-gradient-to-br from-primary-500 to-peach-500 p-6 text-center text-white shadow-soft"
        style={{ animationDelay: "60ms" }}
      >
        {/* 동전이 가끔 한 번씩 휙 뒤집힌다 — app/globals.css .animate-coin-flip 참고 */}
        <span
          aria-hidden
          className="animate-coin-flip absolute -right-2.5 -top-3.5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary-500 shadow-soft"
        >
          <Coins size={20} />
        </span>
        <p className="mb-3 text-[13px] font-semibold text-white/85">{BASE_YEAR}년 연간 한도</p>
        <BenefitGauge value={ANNUAL_LIMIT} />
        <p className="mt-2 text-[12px] leading-relaxed text-white/80">
          정확한 남은 금액은 아래 사업소 상담으로 확인해보세요
        </p>
      </div>

      {/* 잔액 계산기 — 이로움돌봄의 "급여 잔액 확인"에서 배웠지만, 우리는 공단 연동이
          없으므로(위 주석의 원칙) 지어내지 않고 "직접 입력한 사용액" 기준임을 명시한다 */}
      <div className="animate-fade-up" style={{ animationDelay: "90ms" }}>
        <RemainingCalculator />
      </div>

      {/* 비교 그래픽 */}
      <div className="animate-fade-up rounded-2xl bg-white p-5 shadow-card" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-3 text-[15px] font-bold text-ink-900">10만원어치 구매 시 본인부담금</h2>
        <CopayCompareBars />
      </div>

      {/* 품목 */}
      <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
        <h2 className="mb-3 text-[15px] font-bold text-ink-900">받을 수 있는 품목</h2>
        <WelfareItemTabs purchase={PURCHASE_ITEMS} rental={RENTAL_ITEMS} />
      </div>

      {/* 상담 신청 */}
      <div className="animate-fade-up" style={{ animationDelay: "210ms" }}>
        <WelfareConsultForm compact />
      </div>

      {/* 사업소 찾기 */}
      <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <ProviderFinder />
      </div>

      {/* 내 상담 신청 내역 */}
      <div className="animate-fade-up" style={{ animationDelay: "270ms" }}>
        <WelfareConsultHistory />
      </div>
    </div>
  );
}

// ── 잔액 계산기 ──────────────────────────────────────────────────────────
// "올해 얼마나 썼는지"를 입력하면 남은 한도를 보여준다. 공단 실시간 조회가 아니라
// 사용자가 아는 만큼 적는 메모형 도구다 — 연도가 바뀌면 저장값도 자연히 초기화된다.
const USED_KEY = `dolboda-welfare-used-${BASE_YEAR}`;

function RemainingCalculator() {
  const [used, setUsed] = useState<number | null>(null); // null = 아직 복원 전
  const [restored, setRestored] = useState(false);

  // 렌더 중 localStorage를 읽지 않는다(CLAUDE.md 하이드레이션 규칙) — 복원은 effect에서,
  // 복원 전에는 저장도 하지 않는다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(USED_KEY);
      const n = raw === null ? 0 : Number(raw);
      setUsed(Number.isFinite(n) && n >= 0 ? Math.min(n, ANNUAL_LIMIT) : 0);
    } catch {
      setUsed(0);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored || used === null) return;
    try {
      localStorage.setItem(USED_KEY, String(used));
    } catch {
      /* 저장소가 막혀 있어도 계산기는 계속 동작한다 */
    }
  }, [used, restored]);

  const remaining = Math.max(0, ANNUAL_LIMIT - (used ?? 0));
  const pct = Math.round((remaining / ANNUAL_LIMIT) * 100);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="mb-1 text-[15px] font-bold text-ink-900">올해 얼마나 남았을까요?</h2>
      <p className="mb-3 text-[12px] leading-relaxed text-ink-400">
        올해 복지용구에 쓴 금액을 적으면 남은 한도를 보여드려요.
      </p>

      <label className="mb-3 flex items-center gap-2 rounded-xl border border-ink-100 px-3.5 py-2.5 focus-within:border-primary-400">
        <span className="shrink-0 text-[13px] font-semibold text-ink-500">올해 사용액</span>
        <input
          type="text"
          inputMode="numeric"
          value={used === null ? "" : used === 0 ? "" : used.toLocaleString()}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9]/g, ""));
            setUsed(Number.isFinite(n) ? Math.min(n, ANNUAL_LIMIT) : 0);
          }}
          placeholder="0"
          className="min-w-0 flex-1 bg-transparent text-right text-[15px] font-bold text-ink-900 outline-none"
        />
        <span className="shrink-0 text-[13px] text-ink-400">원</span>
      </label>

      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] text-ink-500">남은 한도</span>
        <span className="text-lg font-extrabold text-primary-600">
          {remaining.toLocaleString()}원
        </span>
      </div>
      {/* 게이지 — transform이 아니라 width지만 입력 때만 바뀌는 값이라 프레임 단위 변경이 아니다 */}
      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-peach-400 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
        직접 입력하신 금액 기준이에요. 공단이 확인해주는 실제 잔액은 사업소 상담이나
        국민건강보험공단(1577-1000)으로 확인해주세요.
      </p>
    </div>
  );
}

interface WelfareConsultHistoryItem {
  id: string;
  sido: string;
  sigungu: string;
  items: string[];
  status: string | null;
  createdAt: string;
}

// WelfareConsultRequest.items는 Json 컬럼이라 타입이 배열임을 DB가 보장해주지 않는다.
// 문자열 배열만 남기고 나머지는 버린다 — lib/viewLimit.ts에서 localStorage 값이 배열이
// 아닐 때 시설 상세가 통째로 죽었던 것과 같은 계열의 사고를 막는다.
function normalizeItems(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

function WelfareConsultHistory() {
  const [items, setItems] = useState<WelfareConsultHistoryItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/welfare-consult/mine")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setItems(
          Array.isArray(d?.items)
            ? d.items.map((row: WelfareConsultHistoryItem) => ({
                ...row,
                items: normalizeItems(row.items),
              }))
            : []
        )
      )
      .catch(() => setItems([]));
  }, []);

  async function toggleReceived(id: string, current: string | null) {
    setBusyId(id);
    const next = current ? null : "연락받음";
    setItems((list) => list?.map((i) => (i.id === id ? { ...i, status: next } : i)) ?? null);
    try {
      await fetch("/api/welfare-consult/mine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
    } finally {
      setBusyId(null);
    }
  }

  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="mb-3 text-[15px] font-bold text-ink-900">내 상담 신청 내역</h2>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-ink-100 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-ink-900">
                  {item.sido} {item.sigungu}
                </p>
                {item.items.length > 0 && (
                  <p className="mt-0.5 truncate text-[12px] text-ink-400">{item.items.join(", ")}</p>
                )}
              </div>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => toggleReceived(item.id, item.status)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-60 ${
                  item.status ? "bg-mint-100 text-mint-700" : "bg-ivory-100 text-ink-400"
                }`}
              >
                {item.status ?? "대기중"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Provider {
  name: string;
  address: string;
  phone: string;
}

function ProviderFinder() {
  const [sido, setSido] = useState<string | null>(null);
  const [sigunguList, setSigunguList] = useState<{ sigungu: string; count: number }[] | null>(null);
  const [sigungu, setSigungu] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [loading, setLoading] = useState(false);

  const regions = useMemo(() => REGION_SEO, []);

  useEffect(() => {
    if (!sido) return;
    setLoading(true);
    setSigunguList(null);
    setSigungu(null);
    setProviders(null);
    fetch(`/api/welfare-providers?sido=${encodeURIComponent(sido)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSigunguList(Array.isArray(d?.sigunguList) ? d.sigunguList : []))
      .finally(() => setLoading(false));
  }, [sido]);

  useEffect(() => {
    if (!sido || !sigungu) return;
    setLoading(true);
    fetch(`/api/welfare-providers?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigungu)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProviders(Array.isArray(d?.providers) ? d.providers : []))
      .finally(() => setLoading(false));
  }, [sido, sigungu]);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
        <MapPin size={16} className="text-royal-500" />
        가까운 복지용구 사업소 찾기
      </h2>
      <p className="mb-4 text-[12px] leading-relaxed text-ink-500">
        지역을 골라주시면 상담·주문이 가능한 사업소로 바로 전화 연결해드려요.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <select
          value={sido ?? ""}
          onChange={(e) => setSido(e.target.value || null)}
          className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm text-ink-900"
        >
          <option value="">시/도 선택</option>
          {regions.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={sigungu ?? ""}
          onChange={(e) => setSigungu(e.target.value || null)}
          disabled={!sigunguList || sigunguList.length === 0}
          className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm text-ink-900 disabled:bg-ink-100/40 disabled:text-ink-300"
        >
          <option value="">시/군/구 선택</option>
          {sigunguList?.map((s) => (
            <option key={s.sigungu} value={s.sigungu}>
              {s.sigungu} ({s.count})
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="py-4 text-center text-xs text-ink-300">불러오는 중…</p>}

      {!loading && providers && providers.length === 0 && (
        <p className="rounded-xl bg-ivory-100 p-4 text-center text-xs text-ink-400">
          이 지역에서 등록된 사업소를 찾지 못했어요. 다른 지역도 확인해보세요.
        </p>
      )}

      {!loading && providers && providers.length > 0 && (
        <ul className="space-y-2">
          {providers.map((p) => (
            <li
              key={p.name + p.address}
              className="flex items-center gap-3 rounded-xl border border-ink-100 p-3.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink-900">{p.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-400">
                  <MapPin size={10} className="shrink-0" />
                  <span className="truncate">{p.address}</span>
                </span>
              </span>
              <a
                href={`tel:${p.phone}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-700 transition-all duration-150 ease-snappy hover:bg-mint-200 active:scale-90"
                aria-label={`${p.name}에 전화`}
              >
                <Phone size={15} />
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-300">
        국민건강보험공단에 등록된 사업소 정보이며, 실제 운영 여부는 전화로 확인해주세요.
      </p>
    </div>
  );
}
