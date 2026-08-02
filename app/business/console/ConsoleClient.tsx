"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, ExternalLink, Trash2, TrendingUp, MessageCircle } from "lucide-react";
import { toSquareImage } from "@/lib/squareImage";

// 시설 콘솔 화면.
//
// UX 원칙: 담당자는 40~60대, 하루에 한두 번 폰으로 연다.
//  - 시설이 여러 개면 탭으로 전환 (대부분은 1개라 탭이 아예 안 보인다)
//  - "지금 보호자에게 어떻게 보이는지"로 바로 갈 수 있는 링크를 항상 위에 둔다
//  - 저장은 명시적 버튼 — 자동저장은 "저장된 건가?" 불안만 만든다

interface ConsoleFacility {
  facilityId: string;
  facilityName: string;
  plan: string;
  planName: string;
  photoLimit: number;
  intro: string;
  photos: string[];
  consultTotal: number;
  consultRecent30d: number;
}

const CARD = "rounded-2xl bg-white p-5 shadow-card";

export function ConsoleClient({ facilities }: { facilities: ConsoleFacility[] }) {
  const [selected, setSelected] = useState(0);
  const f = facilities[selected];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink-900">시설 콘솔</h1>
        <span className="rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-bold text-royal-700">
          {f.planName}
        </span>
      </div>
      <p className="mb-4 text-sm text-ink-500">
        여기서 고친 내용은 보호자가 보는 시설 페이지에 그대로 반영돼요.
      </p>

      {facilities.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {facilities.map((x, i) => (
            <button
              key={x.facilityId}
              type="button"
              onClick={() => setSelected(i)}
              className={`min-h-[40px] rounded-full px-3.5 text-xs font-bold transition-colors ${
                i === selected ? "bg-ink-900 text-white" : "bg-white text-ink-500 shadow-card"
              }`}
            >
              {x.facilityName}
            </button>
          ))}
        </div>
      )}

      <FacilityPanel key={f.facilityId} facility={f} />
    </main>
  );
}

function FacilityPanel({ facility }: { facility: ConsoleFacility }) {
  const [intro, setIntro] = useState(facility.intro);
  const [savedIntro, setSavedIntro] = useState(facility.intro);
  const [photos, setPhotos] = useState(facility.photos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveIntro() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/business/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId: facility.facilityId, intro }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "저장하지 못했어요.");
        return;
      }
      setSavedIntro(intro);
      setNotice("소개글을 저장했어요.");
    } catch {
      setError("네트워크 상태를 확인해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // 브라우저에서 미리 줄여서 올린다 — 폰 사진 원본(3~8MB)을 그대로 보내지 않는다
      const { blob } = await toSquareImage(file);
      const res = await fetch(
        `/api/business/photos?facilityId=${encodeURIComponent(facility.facilityId)}`,
        { method: "POST", headers: { "Content-Type": blob.type }, body: blob }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        content?: { photos: string[] };
      };
      if (!res.ok) {
        setError(json.error ?? "사진을 올리지 못했어요.");
        return;
      }
      if (json.content) setPhotos(json.content.photos);
      setNotice("사진을 올렸어요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진을 처리하지 못했어요.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto(url: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/business/photos?facilityId=${encodeURIComponent(
          facility.facilityId
        )}&url=${encodeURIComponent(url)}`,
        { method: "DELETE" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        content?: { photos: string[] };
      };
      if (!res.ok) {
        setError(json.error ?? "사진을 지우지 못했어요.");
        return;
      }
      if (json.content) setPhotos(json.content.photos);
    } catch {
      setError("네트워크 상태를 확인해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 지금 보호자에게 보이는 페이지 — 콘솔의 기준점이라 맨 위 고정 */}
      <Link
        href={`/facility/${facility.facilityId}`}
        target="_blank"
        className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
      >
        <span className="truncate">{facility.facilityName} — 보호자에게 보이는 페이지 열기</span>
        <ExternalLink size={15} className="shrink-0 text-ink-300" />
      </Link>

      {/* 상담 통계 — 시설이 콘솔을 다시 열게 만드는 숫자 */}
      <section className={CARD}>
        <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
          <TrendingUp size={15} className="text-primary-500" /> 상담 신청 현황
        </h2>
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-ivory-100 p-3.5 text-center">
            <dt className="text-[11px] text-ink-300">최근 30일</dt>
            <dd className="mt-0.5 text-xl font-extrabold text-ink-900">
              {facility.consultRecent30d}건
            </dd>
          </div>
          <div className="rounded-xl bg-ivory-100 p-3.5 text-center">
            <dt className="text-[11px] text-ink-300">전체</dt>
            <dd className="mt-0.5 text-xl font-extrabold text-ink-900">
              {facility.consultTotal}건
            </dd>
          </div>
        </dl>
        <p className="mt-2 flex gap-1.5 text-[11px] leading-relaxed text-ink-300">
          <MessageCircle size={12} className="mt-0.5 shrink-0" />
          돌보다에서 이 시설로 접수된 상담 신청 수예요. 신청 내용은 시설 이메일로 전달됩니다.
        </p>
      </section>

      {/* 소개글 */}
      <section className={CARD}>
        <h2 className="mb-1 text-[15px] font-bold text-ink-900">시설 소개글</h2>
        <p className="mb-3 text-xs leading-relaxed text-ink-500">
          공공데이터에는 없는 우리 시설의 분위기·돌봄 철학을 보호자에게 직접 전해보세요.
        </p>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder={`예) 저희 ${facility.facilityName}은 20년째 한자리에서 어르신을 모시고 있습니다. 소규모라서 한 분 한 분의 식사 습관까지 기억하고…`}
          className="w-full resize-y rounded-xl border border-ink-100 px-3.5 py-3 text-sm leading-relaxed text-ink-900 outline-none placeholder:text-ink-300 focus:border-primary-400"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink-300">{intro.length}/2,000자</span>
          <button
            type="button"
            disabled={busy || intro === savedIntro}
            onClick={saveIntro}
            className="min-h-[44px] rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-600 disabled:bg-ink-100 disabled:text-ink-300 disabled:shadow-none"
          >
            {busy ? "저장 중…" : intro === savedIntro ? "저장됨" : "소개글 저장"}
          </button>
        </div>
      </section>

      {/* 사진 */}
      <section className={CARD}>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-bold text-ink-900">시설 사진</h2>
          <span className="text-xs text-ink-300">
            {photos.length}/{facility.photoLimit}장
          </span>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-ink-500">
          생활 공간·식사·프로그램 사진이 보호자의 결정에 가장 큰 영향을 줘요.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {photos.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="시설 사진" className="h-full w-full object-cover" />
              <button
                type="button"
                disabled={busy}
                onClick={() => removePhoto(url)}
                aria-label="사진 삭제"
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/60 text-white transition-colors hover:bg-ink-900"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {photos.length < facility.photoLimit && (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink-100 text-ink-300 transition-colors hover:border-primary-300 hover:text-primary-500"
            >
              <Camera size={20} />
              <span className="text-xs font-semibold">{busy ? "처리 중…" : "사진 추가"}</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadPhoto(file);
          }}
        />

        {facility.plan === "free" && photos.length >= facility.photoLimit && (
          <Link
            href="/business#plans"
            className="mt-3 block rounded-xl bg-ivory-100 p-3.5 text-center text-xs font-semibold text-ink-700 transition-colors hover:bg-ivory-200"
          >
            사진을 더 올리고 싶으신가요? 비즈니스 플러스에서 30장까지 열려요 →
          </Link>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-primary-50 p-3 text-sm text-primary-700">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="rounded-xl bg-mint-100 p-3 text-sm text-mint-700">{notice}</p>
      )}
    </div>
  );
}
