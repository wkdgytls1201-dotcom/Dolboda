"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, PhoneCall } from "lucide-react";
import { REGION_SEO } from "@/lib/regionSeo";
import { allEquipmentItems } from "@/lib/welfareEquipment";

// 복지용구 상담 신청 폼.
//
// 로그인한 사람만 이 폼까지 온다 — 공개 페이지에서는 WelfareConsultGate가, 마이페이지
// 에서는 페이지 자체가 앞을 막는다. API(app/api/welfare-consult)도 세션을 확인한다.
//
// 사업소에 자동 전달되지 않는다(이메일 데이터가 없음) — 접수만 하고 운영자가 이어받는다.
// 이 사실을 화면에서 숨기지 않는다("확인 후 연락드려요"로 명시).

const ALL_ITEMS = allEquipmentItems();
const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;

export function WelfareConsultForm({
  defaultItem,
  compact = false,
}: {
  /** 품목 상세 페이지에서 진입하면 그 품목을 기본 선택해둔다 */
  defaultItem?: string;
  /** true면 처음부터 접힌 카드(버튼 눌러 펼침), false면 항상 펼쳐진 상태 */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!compact);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [sigunguList, setSigunguList] = useState<{ sigungu: string; count: number }[] | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>(defaultItem ? [defaultItem] : []);
  const [showAllItems, setShowAllItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!sido) return;
    setSigunguList(null);
    setSigungu("");
    fetch(`/api/welfare-providers?sido=${encodeURIComponent(sido)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSigunguList(Array.isArray(d?.sigunguList) ? d.sigunguList : []));
  }, [sido]);

  function toggleItem(name: string) {
    setSelectedItems((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  async function submit() {
    setError(null);
    if (!name.trim() || name.trim().length > 20) {
      setError("이름을 확인해주세요.");
      return;
    }
    if (!PHONE_RE.test(phone.replace(/\s/g, ""))) {
      setError("연락처 형식을 확인해주세요. (예: 010-1234-5678)");
      return;
    }
    if (!sido || !sigungu) {
      setError("지역을 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/welfare-consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), sido, sigungu, items: selectedItems }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "신청하지 못했어요.");
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "신청하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="animate-fade-up rounded-2xl bg-mint-50 p-6 text-center">
        <CheckCircle2 size={32} className="mx-auto mb-2 text-mint-600" />
        <p className="mb-1 text-[15px] font-bold text-ink-900">상담 신청이 접수됐어요</p>
        <p className="text-[13px] leading-relaxed text-ink-500">
          확인 후 순차적으로 연락드릴게요. 급하시면 아래 사업소 찾기에서 직접 전화하셔도 돼요.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[52px] w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-royal-600 via-royal-500 to-royal-400 text-sm font-bold text-white shadow-royal transition-all duration-200 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
      >
        <PhoneCall size={16} />
        무료로 복지용구 상담 신청하기
      </button>
    );
  }

  return (
    <div className="animate-fade-up rounded-2xl bg-white p-5 shadow-card">
      <p className="mb-0.5 text-[15px] font-bold text-ink-900">복지용구 상담 신청</p>
      <p className="mb-4 text-[12px] leading-relaxed text-ink-500">
        연락처를 남기시면 확인 후 순차적으로 연락드려요. 신청만으로는 아무 비용도 들지 않아요.
      </p>

      <div className="space-y-2.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="w-full rounded-xl border border-ink-100 px-3.5 py-3 text-sm outline-none focus:border-royal-400"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="연락처 (010-1234-5678)"
          inputMode="numeric"
          className="w-full rounded-xl border border-ink-100 px-3.5 py-3 text-sm outline-none focus:border-royal-400"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={sido}
            onChange={(e) => setSido(e.target.value)}
            className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm text-ink-900"
          >
            <option value="">시/도 선택</option>
            {REGION_SEO.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={sigungu}
            onChange={(e) => setSigungu(e.target.value)}
            disabled={!sigunguList || sigunguList.length === 0}
            className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm text-ink-900 disabled:bg-ink-100/40 disabled:text-ink-300"
          >
            <option value="">시/군/구</option>
            {sigunguList?.map((s) => (
              <option key={s.sigungu} value={s.sigungu}>
                {s.sigungu}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-[12px] font-bold text-ink-500">관심 품목 (선택)</p>
          <div className="flex flex-wrap gap-1.5">
            {(showAllItems ? ALL_ITEMS : ALL_ITEMS.slice(0, 8)).map((item) => {
              const active = selectedItems.includes(item.name);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => toggleItem(item.name)}
                  className={`min-h-[44px] rounded-full px-3.5 text-[13px] font-bold transition-colors ${
                    active ? "bg-royal-500 text-white" : "bg-ivory-100 text-ink-500 hover:bg-ink-100"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
            {!showAllItems && (
              <button
                type="button"
                onClick={() => setShowAllItems(true)}
                className="flex min-h-[44px] items-center gap-0.5 rounded-full bg-ivory-100 px-3.5 text-[13px] font-bold text-ink-400"
              >
                더보기
                <ChevronDown size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-xs font-semibold text-primary-600">{error}</p>}

      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="mt-4 flex min-h-[50px] w-full items-center justify-center gap-1.5 rounded-xl bg-royal-500 text-sm font-bold text-white shadow-soft transition-colors hover:bg-royal-600 disabled:opacity-60"
      >
        {submitting ? "신청 중…" : "상담 신청하기"}
      </button>
    </div>
  );
}
