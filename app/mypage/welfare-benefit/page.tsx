"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, ChevronRight, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";
import { CountUpNumber, CopayCompareBars } from "@/components/WelfareBenefitVisuals";
import { WelfareItemTabs } from "@/components/WelfareItemTabs";
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
        className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-soft transition-colors hover:bg-primary-600"
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
              className={`min-h-[40px] rounded-full px-3.5 text-xs font-bold transition-colors ${
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
      {!eligible ? <NoGradeState relation={selected.relation} /> : <BenefitDashboard profile={selected} />}
    </div>
  );
}

function NoGradeState({ relation }: { relation: string }) {
  return (
    <div className="animate-fade-up rounded-2xl bg-white p-6 text-center shadow-card">
      <p className="mb-1.5 text-[15px] font-bold text-ink-900">
        {relation}은 아직 장기요양등급이 없어요
      </p>
      <p className="mb-5 text-[13px] leading-relaxed text-ink-500">
        복지용구는 장기요양등급(1~5등급·인지지원등급)을 받은 분만 이용할 수 있어요. 예상
        등급부터 확인해보시겠어요?
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/grade-test"
          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-soft transition-colors hover:bg-primary-600"
        >
          1분 등급 예상 테스트
        </Link>
        <Link
          href="/mypage/care-profile"
          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-ink-100 bg-white px-5 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
        >
          이미 등급이 있어요
        </Link>
      </div>
    </div>
  );
}

function BenefitDashboard({ profile }: { profile: CareProfileSummary }) {
  const { replace } = useCareProfiles();
  // 등록된 번호를 고치는 중인지, 아직 없는 번호를 처음 적는 중인지 — 둘 다
  // 같은 인라인 폼(RegisterCertNumberInline)을 쓰되 열림 상태만 다르다.
  // 미등록 상태의 기본값을 false로 둔 이유: 이 필드는 "몰라도 되는" 선택 항목이라
  // 처음부터 입력창을 펼쳐두면 마치 필수처럼 보인다 — 먼저 안내 카드로 권하고,
  // 원할 때 펼치게 한다.
  const [editingCert, setEditingCert] = useState(false);

  return (
    <div className="space-y-4">
      {profile.ltcCertNumber ? (
        // 등록됨 — 마스킹해서 보여준다(계좌번호와 같은 규칙)
        <div className="animate-fade-up flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-card">
          <span className="flex min-w-0 items-center gap-2 text-sm text-ink-700">
            <ShieldCheck size={16} className="shrink-0 text-mint-600" />
            <span className="truncate">
              {profile.relation} · 요양인정번호 {maskAccount(profile.ltcCertNumber)} 등록됨
            </span>
          </span>
          <button
            type="button"
            onClick={() => setEditingCert((v) => !v)}
            className="shrink-0 text-xs font-semibold text-ink-300 hover:text-ink-500"
          >
            다시 등록
          </button>
        </div>
      ) : (
        // 미등록 — 콘텐츠를 막지는 않되(대부분 이 번호를 지금은 모른다), 등록하면
        // 좋다는 건 적극적으로 알린다. 회색 아코디언 대신 눈에 띄는 카드 + 명확한
        // 버튼으로 "지금 등록해두면 좋다"는 신호를 준다.
        !editingCert && (
          <button
            type="button"
            onClick={() => setEditingCert(true)}
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
          </button>
        )
      )}
      {editingCert && (
        <RegisterCertNumberInline
          profile={profile}
          onDone={(p) => {
            replace(p);
            setEditingCert(false);
          }}
          onCancel={() => setEditingCert(false)}
        />
      )}

      {/* 한도 카드 */}
      <div
        className="animate-fade-up rounded-3xl bg-gradient-to-br from-primary-500 to-peach-500 p-6 text-center text-white shadow-soft"
        style={{ animationDelay: "60ms" }}
      >
        <p className="mb-1 text-[13px] font-semibold text-white/85">{BASE_YEAR}년 연간 한도</p>
        <p className="text-4xl font-extrabold">
          <CountUpNumber value={ANNUAL_LIMIT} suffix="원" />
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-white/80">
          정확한 남은 금액은 아래 사업소 상담으로 확인해보세요
        </p>
      </div>

      {/* 비교 그래픽 */}
      <div className="animate-fade-up rounded-2xl bg-white p-5 shadow-card" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-3 text-[15px] font-bold text-ink-900">100만원어치 구매 시 본인부담금</h2>
        <CopayCompareBars />
      </div>

      {/* 품목 */}
      <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
        <h2 className="mb-3 text-[15px] font-bold text-ink-900">받을 수 있는 품목</h2>
        <WelfareItemTabs purchase={PURCHASE_ITEMS} rental={RENTAL_ITEMS} />
      </div>

      {/* 사업소 찾기 */}
      <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <ProviderFinder />
      </div>
    </div>
  );
}

function RegisterCertNumberInline({
  profile,
  onDone,
  onCancel,
}: {
  profile: CareProfileSummary;
  onDone: (p: CareProfileSummary) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = value.trim();
    if (!/^[0-9-]{4,20}$/.test(trimmed)) {
      setError("형식을 확인해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/care-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profile.id, ltcCertNumber: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "");
      onDone(data);
    } catch (e) {
      setError((e instanceof Error && e.message) || "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-up rounded-2xl border border-ink-100 bg-white p-4">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="numeric"
        placeholder="새 요양인정번호"
        className="w-full rounded-xl border border-ink-100 px-3.5 py-3 text-sm outline-none focus:border-primary-400"
      />
      {error && <p className="mt-1.5 text-xs font-semibold text-primary-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-500"
        >
          취소
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="min-h-[44px] flex-[2] rounded-xl bg-primary-500 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-700 transition-colors hover:bg-mint-200"
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
