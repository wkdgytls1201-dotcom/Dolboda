"use client";

import { useMemo, useState } from "react";
import { Phone, Check, X, ExternalLink, RefreshCw } from "lucide-react";
import { findPlan, formatPlanPrice, SPONSOR_SLOTS_PER_SIGUNGU } from "@/lib/businessPlans";
import { canonicalRegionKey } from "@/lib/regionSeo";

// 운영자 콘솔 화면. 하루에도 여러 번 여는 화면이라 "지금 뭘 해야 하는지"가
// 열자마자 보여야 한다 — 그래서 기본 탭이 '처리 대기'다.

interface Inquiry {
  id: string;
  facilityName: string;
  registryType: string;
  registryNo: string;
  facilityId: string | null;
  managerName: string;
  managerRole: string | null;
  phone: string;
  email: string;
  plan: string;
  message: string | null;
  status: string | null;
  memo: string | null;
  createdAt: string;
}

interface Subscription {
  id: string;
  facilityId: string;
  plan: string;
  status: string;
  monthlyPrice: number;
  startedAt: string;
  endsAt: string | null;
}

interface Placement {
  id: string;
  facilityId: string;
  scope: string;
  regionKey: string;
  active: boolean;
}

interface FacilityLite {
  id: string;
  name: string;
  address: string;
}

interface Correction {
  id: string;
  facilityId: string;
  message: string;
  status: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "처리 대기",
  contacted: "확인전화 완료",
  verified: "승인됨",
  rejected: "거절",
};

const CORRECTION_STATUS_LABEL: Record<string, string> = {
  new: "확인 필요",
  done: "반영 완료",
  rejected: "반영 불가",
};

const SUB_STATUS_LABEL: Record<string, string> = {
  pending: "입금 대기",
  active: "노출 중",
  paused: "일시중지",
  cancelled: "해지",
};

const CARD = "rounded-2xl bg-white p-4 shadow-card";
const BTN =
  "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors disabled:opacity-40";

export function AdminClient({
  adminEmail,
  inquiries: initialInquiries,
  subscriptions: initialSubs,
  placements: initialPlacements,
  facilities,
  statusCounts,
  corrections: initialCorrections,
  correctionCounts,
}: {
  adminEmail: string;
  inquiries: Inquiry[];
  subscriptions: Subscription[];
  placements: Placement[];
  facilities: FacilityLite[];
  statusCounts: { status: string | null; count: number }[];
  corrections: Correction[];
  correctionCounts: { status: string | null; count: number }[];
}) {
  const [tab, setTab] = useState<"inquiries" | "subs" | "corrections">("inquiries");
  const [filter, setFilter] = useState<string>("new");
  const [correctionFilter, setCorrectionFilter] = useState<string>("new");
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [subs, setSubs] = useState(initialSubs);
  const [placements, setPlacements] = useState(initialPlacements);
  const [corrections, setCorrections] = useState(initialCorrections);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const facilityById = useMemo(
    () => new Map(facilities.map((f) => [f.id, f])),
    [facilities]
  );

  // 시·군·구별로 스폰서 슬롯이 얼마나 찼는지 — 승인 전에 여기부터 본다.
  // 상한을 넘겨 팔면 /business에 공개한 약속이 바로 거짓이 된다.
  const slotUsage = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of placements) {
      if (p.scope !== "sigungu" || !p.active) continue;
      m.set(p.regionKey, (m.get(p.regionKey) ?? 0) + 1);
    }
    return m;
  }, [placements]);

  const shown = useMemo(() => {
    if (filter === "all") return inquiries;
    if (filter === "new") return inquiries.filter((i) => !i.status);
    return inquiries.filter((i) => i.status === filter);
  }, [inquiries, filter]);

  const countOf = (key: string) =>
    key === "new"
      ? statusCounts.find((c) => c.status === null)?.count ?? 0
      : statusCounts.find((c) => c.status === key)?.count ?? 0;

  const shownCorrections = useMemo(() => {
    if (correctionFilter === "all") return corrections;
    if (correctionFilter === "new") return corrections.filter((c) => !c.status);
    return corrections.filter((c) => c.status === correctionFilter);
  }, [corrections, correctionFilter]);

  const correctionCountOf = (key: string) =>
    key === "new"
      ? correctionCounts.find((c) => c.status === null)?.count ?? 0
      : correctionCounts.find((c) => c.status === key)?.count ?? 0;

  async function patchInquiry(id: string, payload: Record<string, unknown>) {
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        inquiry?: Inquiry;
        approved?: { facilityId: string; plan: string; sponsorRegion: string | null };
      };
      if (!res.ok) {
        setError(json.error ?? "처리하지 못했어요.");
        return;
      }
      if (json.inquiry) {
        setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, ...json.inquiry } : i)));
      } else if (json.approved) {
        setInquiries((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, status: "verified", facilityId: json.approved!.facilityId } : i
          )
        );
        setNotice(
          `승인했어요. 구독은 '입금 대기' 상태이고, 스폰서 노출은 입금 확인 후 켜집니다.${
            json.approved.sponsorRegion ? ` (지역: ${json.approved.sponsorRegion})` : ""
          }`
        );
      }
    } catch {
      setError("네트워크 상태를 확인해주세요.");
    } finally {
      setBusy(null);
    }
  }

  async function patchSub(id: string, status: string) {
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        subscription?: Subscription;
      };
      if (!res.ok) {
        setError(json.error ?? "처리하지 못했어요.");
        return;
      }
      if (json.subscription) {
        const next = json.subscription;
        setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));
        // 슬롯 사용량 표시가 즉시 맞도록 노출 상태도 같이 반영한다
        setPlacements((prev) =>
          prev.map((p) =>
            p.facilityId === next.facilityId ? { ...p, active: next.status === "active" } : p
          )
        );
      }
    } catch {
      setError("네트워크 상태를 확인해주세요.");
    } finally {
      setBusy(null);
    }
  }

  async function patchCorrection(id: string, status: string) {
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/corrections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        correction?: Correction;
      };
      if (!res.ok) {
        setError(json.error ?? "처리하지 못했어요.");
        return;
      }
      if (json.correction) {
        setCorrections((prev) => prev.map((c) => (c.id === id ? { ...c, ...json.correction } : c)));
      }
    } catch {
      setError("네트워크 상태를 확인해주세요.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-ink-900">운영자 콘솔</h1>
        <span className="text-xs text-ink-300">{adminEmail}</span>
      </div>

      <div className="mb-4 flex gap-2">
        {(
          [
            ["inquiries", "입점 신청"],
            ["subs", "구독·광고"],
            ["corrections", `정정 요청${correctionCountOf("new") > 0 ? ` (${correctionCountOf("new")})` : ""}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-[44px] flex-1 rounded-xl px-4 text-sm font-bold transition-colors ${
              tab === key ? "bg-ink-900 text-white" : "bg-white text-ink-500 shadow-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-primary-50 p-3 text-sm text-primary-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 rounded-xl bg-mint-100 p-3 text-sm text-mint-700">{notice}</p>
      )}

      {tab === "inquiries" && (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {["new", "contacted", "verified", "rejected", "all"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`min-h-[36px] rounded-full px-3 text-xs font-semibold transition-colors ${
                  filter === key
                    ? "bg-primary-500 text-white"
                    : "bg-white text-ink-500 shadow-card"
                }`}
              >
                {key === "all" ? "전체" : STATUS_LABEL[key]}
                {key !== "all" && countOf(key) > 0 && (
                  <span className="ml-1 opacity-70">{countOf(key)}</span>
                )}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className={`${CARD} text-center text-sm text-ink-300`}>해당하는 신청이 없어요.</p>
          ) : (
            <ul className="space-y-3">
              {shown.map((i) => (
                <InquiryRow
                  key={i.id}
                  inquiry={i}
                  facility={i.facilityId ? facilityById.get(i.facilityId) : undefined}
                  slotUsage={slotUsage}
                  busy={busy === i.id}
                  onPatch={patchInquiry}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "subs" && (
        <>
          {subs.length === 0 ? (
            <p className={`${CARD} text-center text-sm text-ink-300`}>아직 구독이 없어요.</p>
          ) : (
            <ul className="space-y-3">
              {subs.map((s) => {
                const f = facilityById.get(s.facilityId);
                const mine = placements.filter((p) => p.facilityId === s.facilityId);
                return (
                  <li key={s.id} className={CARD}>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold text-ink-900">{f?.name ?? s.facilityId}</span>
                      <span className="text-sm font-bold text-ink-700">
                        {findPlan(s.plan)?.name ?? s.plan} ·{" "}
                        {s.monthlyPrice.toLocaleString()}원
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-ink-500">
                      상태 <strong className="text-ink-700">{SUB_STATUS_LABEL[s.status]}</strong>
                      {mine.length > 0 && (
                        <>
                          {" · "}광고 지역 {mine.map((p) => p.regionKey).join(", ")}{" "}
                          {mine.some((p) => p.active) ? "(노출 중)" : "(꺼짐)"}
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy === s.id || s.status === "active"}
                        onClick={() => patchSub(s.id, "active")}
                        className={`${BTN} bg-mint-100 text-mint-700 hover:bg-mint-200`}
                      >
                        <Check size={13} /> 입금 확인 · 노출 시작
                      </button>
                      <button
                        type="button"
                        disabled={busy === s.id || s.status === "paused"}
                        onClick={() => patchSub(s.id, "paused")}
                        className={`${BTN} bg-ink-100 text-ink-700 hover:bg-ink-100/70`}
                      >
                        <RefreshCw size={13} /> 일시중지
                      </button>
                      <button
                        type="button"
                        disabled={busy === s.id || s.status === "cancelled"}
                        onClick={() => patchSub(s.id, "cancelled")}
                        className={`${BTN} bg-primary-50 text-primary-700 hover:bg-primary-100`}
                      >
                        <X size={13} /> 해지
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === "corrections" && (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {["new", "done", "rejected", "all"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCorrectionFilter(key)}
                className={`min-h-[36px] rounded-full px-3 text-xs font-semibold transition-colors ${
                  correctionFilter === key
                    ? "bg-primary-500 text-white"
                    : "bg-white text-ink-500 shadow-card"
                }`}
              >
                {key === "all" ? "전체" : CORRECTION_STATUS_LABEL[key]}
                {key !== "all" && correctionCountOf(key) > 0 && (
                  <span className="ml-1 opacity-70">{correctionCountOf(key)}</span>
                )}
              </button>
            ))}
          </div>

          {shownCorrections.length === 0 ? (
            <p className={`${CARD} text-center text-sm text-ink-300`}>
              해당하는 정정 요청이 없어요.
            </p>
          ) : (
            <ul className="space-y-3">
              {shownCorrections.map((c) => {
                const f = facilityById.get(c.facilityId);
                return (
                  <li key={c.id} className={CARD}>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                      {f ? (
                        <a
                          href={`/facility/${f.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-royal-600 hover:underline"
                        >
                          {f.name} <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="font-bold text-ink-900">{c.facilityId}</span>
                      )}
                      <span className="text-xs text-ink-300">
                        {new Date(c.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    {f && <p className="mb-2 text-xs text-ink-300">{f.address}</p>}
                    <p className="mb-3 rounded-xl bg-ivory-100 p-3 text-sm leading-relaxed text-ink-700">
                      {c.message}
                    </p>
                    <p className="mb-2 text-xs font-semibold text-ink-700">
                      상태: {c.status ? CORRECTION_STATUS_LABEL[c.status] ?? c.status : "확인 필요"}
                    </p>
                    {!c.status && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={busy === c.id}
                          onClick={() => patchCorrection(c.id, "done")}
                          className={`${BTN} bg-mint-100 text-mint-700 hover:bg-mint-200`}
                        >
                          <Check size={13} /> 반영 완료로 표시
                        </button>
                        <button
                          type="button"
                          disabled={busy === c.id}
                          onClick={() => patchCorrection(c.id, "rejected")}
                          className={`${BTN} bg-primary-50 text-primary-700 hover:bg-primary-100`}
                        >
                          <X size={13} /> 반영 불가
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

function InquiryRow({
  inquiry,
  facility,
  slotUsage,
  busy,
  onPatch,
}: {
  inquiry: Inquiry;
  facility: FacilityLite | undefined;
  slotUsage: Map<string, number>;
  busy: boolean;
  onPatch: (id: string, payload: Record<string, unknown>) => void;
}) {
  const [ownerUserId, setOwnerUserId] = useState("");
  const [memo, setMemo] = useState(inquiry.memo ?? "");
  const plan = findPlan(inquiry.plan);
  const needsSponsor = ["sponsor", "premium", "silvertown"].includes(inquiry.plan);

  // 광고 지역은 정규 키("경남 김해시") — 서버 저장·지역 페이지 조회와 같은 함수를 쓴다
  const region = facility ? canonicalRegionKey(facility.address) ?? "" : "";
  const used = slotUsage.get(region) ?? 0;
  const left = SPONSOR_SLOTS_PER_SIGUNGU - used;

  return (
    <li className={CARD}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-bold text-ink-900">{inquiry.facilityName}</span>
        <span className="text-xs font-bold text-primary-600">
          {plan?.name ?? inquiry.plan} · {plan ? formatPlanPrice(plan) : "-"}
        </span>
      </div>

      <p className="mb-2 text-xs leading-relaxed text-ink-500">
        {inquiry.registryType === "instCode" ? "기관기호" : "사업자번호"} {inquiry.registryNo} ·{" "}
        {inquiry.managerName}
        {inquiry.managerRole ? ` (${inquiry.managerRole})` : ""}
        <br />
        {inquiry.phone} · {inquiry.email}
        <br />
        {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
      </p>

      {facility ? (
        <p className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
          <a
            href={`/facility/${facility.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-royal-600 hover:underline"
          >
            {facility.name} <ExternalLink size={11} />
          </a>
          <span className="text-ink-300">{facility.address}</span>
        </p>
      ) : (
        <p className="mb-2 rounded-lg bg-accent-50 px-2.5 py-1.5 text-xs text-ink-700">
          시설 자동 매칭 실패 — 승인하려면 시설 id를 직접 넣어야 해요.
        </p>
      )}

      {inquiry.message && (
        <p className="mb-2 rounded-lg bg-ivory-100 p-2.5 text-xs leading-relaxed text-ink-500">
          {inquiry.message}
        </p>
      )}

      {needsSponsor && region && (
        <p
          className={`mb-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
            left > 0 ? "bg-mint-100 text-mint-700" : "bg-primary-50 text-primary-700"
          }`}
        >
          {region} 스폰서 슬롯 {used}/{SPONSOR_SLOTS_PER_SIGUNGU}
          {left > 0 ? ` · ${left}자리 남음` : " · 가득 참 (대기 안내 필요)"}
        </p>
      )}

      <p className="mb-2 text-xs font-semibold text-ink-700">
        상태: {inquiry.status ? STATUS_LABEL[inquiry.status] ?? inquiry.status : "처리 대기"}
      </p>

      {inquiry.status !== "verified" && inquiry.status !== "rejected" && (
        <div className="space-y-2">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="통화 메모 (시설에는 보이지 않아요)"
            className="w-full rounded-xl border border-ink-100 px-3 py-2 text-xs outline-none focus:border-primary-400"
          />
          <input
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
            placeholder="승인 시 필요 — 담당자가 로그인한 계정 id"
            className="w-full rounded-xl border border-ink-100 px-3 py-2 text-xs outline-none focus:border-primary-400"
          />

          <div className="flex flex-wrap gap-1.5">
            <a
              href={`tel:${inquiry.phone}`}
              className={`${BTN} bg-royal-50 text-royal-700 hover:bg-royal-100`}
            >
              <Phone size={13} /> 담당자에게 전화
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => onPatch(inquiry.id, { status: "contacted", memo })}
              className={`${BTN} bg-ink-100 text-ink-700 hover:bg-ink-100/70`}
            >
              확인전화 완료
            </button>
            <button
              type="button"
              disabled={busy || !ownerUserId || (needsSponsor && left <= 0)}
              onClick={() =>
                onPatch(inquiry.id, {
                  status: "verified",
                  memo,
                  ownerUserId,
                  facilityId: facility?.id ?? "",
                  regionKey: region,
                })
              }
              className={`${BTN} bg-mint-100 text-mint-700 hover:bg-mint-200`}
            >
              <Check size={13} /> 승인
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onPatch(inquiry.id, { status: "rejected", memo })}
              className={`${BTN} bg-primary-50 text-primary-700 hover:bg-primary-100`}
            >
              <X size={13} /> 거절
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
