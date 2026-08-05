"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Camera,
  Check,
  ExternalLink,
  Eye,
  MessageCircle,
  Newspaper,
  PenLine,
  Phone,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toSquareImage } from "@/lib/squareImage";
import { toWideImage } from "@/lib/wideImage";
import { BUSINESS_PLANS, VAT_NOTE, formatPlanPrice } from "@/lib/businessPlans";
import { pctDelta } from "@/lib/deltaPct";
import { ViewTrendChart } from "@/components/ViewTrendChart";

// 기업회원 대시보드 화면.
//
// UX 원칙: 담당자는 40~60대, 하루에 한두 번 폰으로 연다.
//  - 시설이 여러 개면 탭으로 전환 (대부분은 1개라 탭이 아예 안 보인다)
//  - "지금 보호자에게 어떻게 보이는지"로 바로 갈 수 있는 링크를 항상 위에 둔다
//  - 저장은 명시적 버튼 — 자동저장은 "저장된 건가?" 불안만 만든다
//  - 섹션 순서 = 매일 보는 것(숫자·상담)부터, 가끔 만지는 것(소개글·사진·소식) 순
//  - 시설을 여럿 관리하는 기업회원은 탭을 오가며 합산해 암산하고 있었다 — 시설이
//    2곳 이상이면 탭 위에 전체 합산 요약을 먼저 보여준다(§ CompanyOverview)

interface ConsoleConsult {
  id: string;
  name: string;
  phone: string;
  status: string | null;
  hasProfile: boolean;
  emailed: boolean;
  createdAt: string;
}

interface ConsolePost {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface ConsoleFacility {
  facilityId: string;
  facilityName: string;
  plan: string;
  planName: string;
  photoLimit: number;
  canPostNews: boolean;
  canManageBanner: boolean;
  bannerImageUrl: string | null;
  hasReport: boolean;
  intro: string;
  photos: string[];
  consultTotal: number;
  consultRecent30d: number;
  /** 그 전 30일(31~60일 전) 상담 신청 — "지난달 대비" 증감 표시용 */
  consultPrev30d: number;
  views7d: number;
  views30d: number;
  /** 그 전 30일(31~60일 전) 조회수 — "지난달 대비" 증감 표시용 */
  viewsPrev30d: number;
  /** 최근 30일 일별 조회수(오래된 순, 기록 없는 날은 0) — 추이 그래프의 원본 */
  viewSeries: { date: string; count: number }[];
  consults: ConsoleConsult[];
  posts: ConsolePost[];
  sponsorRegions: string[];
}

const CARD = "rounded-2xl bg-white p-5 shadow-card";
const FIELD =
  "w-full rounded-xl border border-ink-100 px-3.5 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-400";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** "2026-08-04" → "8/4" — 추이 그래프 축 라벨용 */
function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/**
 * "지난 30일 대비" 증감 배지. 조회수·상담 신청 둘 다 늘어난 쪽이 좋은 지표라
 * up=민트(좋음)·down=잉크(중립)로만 구분한다 — 이 앱의 accent/danger 톤은 행정처분·경고
 * 같은 실제 위험 신호에 예약돼 있어서, 트래픽이 준 것 정도에 빨간색을 쓰면 과하게 읽힌다.
 *
 * 이전 구간이 0이면 %가 정의되지 않는다(막 승인된 시설이 흔히 이 경우다) — 그때는
 * 퍼센트 대신 "신규"만 보여준다. 두 구간 다 0이면 비교할 게 없으니 아예 그리지 않는다.
 */
function Delta({ current, previous }: { current: number; previous: number }) {
  const pct = pctDelta(current, previous);
  if (pct === null) {
    if (current === 0) return null;
    return (
      <span className="inline-flex items-center rounded-full bg-mint-100 px-1.5 py-0.5 text-[10px] font-bold text-mint-700">
        신규
      </span>
    );
  }
  if (pct === 0) return null;
  const up = pct > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      // "신규" 배지와 같은 칩 모양으로 통일한다 — 예전엔 이것만 배경 없는 맨글씨라
      // 셋(신규·증가·감소)이 한 화면에 섞일 때 무게감이 안 맞았다.
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        up ? "bg-mint-100 text-mint-700" : "bg-ink-100 text-ink-500"
      }`}
    >
      <Icon size={9} />
      {Math.abs(pct)}%
    </span>
  );
}

export function ConsoleClient({ facilities }: { facilities: ConsoleFacility[] }) {
  const [selected, setSelected] = useState(0);
  const f = facilities[selected];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink-900">기업회원 대시보드</h1>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-bold text-royal-700">
            {f.planName}
          </span>
          {f.sponsorRegions.length > 0 && (
            <span className="rounded-full bg-accent-100 px-2.5 py-1 text-[11px] font-bold text-ink-700">
              광고 노출 중 · {f.sponsorRegions.join(", ")}
            </span>
          )}
        </span>
      </div>
      <p className="mb-4 text-sm text-ink-500">
        여기서 고친 내용은 보호자가 보는 시설 페이지에 그대로 반영돼요.
      </p>

      {/* 시설을 2곳 이상 관리하는 기업회원 전용 — 탭을 오가며 암산하지 않도록 먼저 합산해 보여준다.
          시설이 1곳뿐이면 아래 패널과 내용이 그대로 겹쳐서 굳이 안 그린다. */}
      {facilities.length > 1 && <CompanyOverview facilities={facilities} />}

      {facilities.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {facilities.map((x, i) => (
            <button
              key={x.facilityId}
              type="button"
              onClick={() => setSelected(i)}
              className={`min-h-[44px] rounded-full px-3.5 text-xs font-bold transition-colors ${
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

/** 시설이 여럿인 기업회원용 — 전체 합산 개요. 탭으로 시설을 골라 들어가기 전에 먼저 보인다. */
function CompanyOverview({ facilities }: { facilities: ConsoleFacility[] }) {
  const totals = useMemo(
    () =>
      facilities.reduce(
        (acc, x) => ({
          views7d: acc.views7d + x.views7d,
          views30d: acc.views30d + x.views30d,
          viewsPrev30d: acc.viewsPrev30d + x.viewsPrev30d,
          consultRecent30d: acc.consultRecent30d + x.consultRecent30d,
          consultPrev30d: acc.consultPrev30d + x.consultPrev30d,
          consultTotal: acc.consultTotal + x.consultTotal,
        }),
        {
          views7d: 0,
          views30d: 0,
          viewsPrev30d: 0,
          consultRecent30d: 0,
          consultPrev30d: 0,
          consultTotal: 0,
        }
      ),
    [facilities]
  );

  return (
    <section className={`${CARD} mb-4`}>
      <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
        <Building2 size={15} className="text-royal-500" /> 전체 시설 합산 · {facilities.length}곳
      </h2>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-royal-50/60 p-3.5 text-center">
          <dt className="flex items-center justify-center gap-1 text-[11px] text-ink-300">
            <Eye size={11} /> 조회 합산 (7일)
          </dt>
          <dd className="mt-0.5 text-xl font-extrabold text-ink-900">
            {totals.views7d.toLocaleString()}
          </dd>
        </div>
        <div className="rounded-xl bg-royal-50/60 p-3.5 text-center">
          <dt className="flex items-center justify-center gap-1 text-[11px] text-ink-300">
            <Eye size={11} /> 조회 합산 (30일)
          </dt>
          <dd className="mt-0.5 flex flex-col items-center gap-0.5">
            <span className="text-xl font-extrabold text-ink-900">
              {totals.views30d.toLocaleString()}
            </span>
            <Delta current={totals.views30d} previous={totals.viewsPrev30d} />
          </dd>
        </div>
        <div className="rounded-xl bg-royal-50/60 p-3.5 text-center">
          <dt className="text-[11px] text-ink-300">상담 합산 (30일)</dt>
          <dd className="mt-0.5 flex flex-col items-center gap-0.5">
            <span className="text-xl font-extrabold text-ink-900">
              {totals.consultRecent30d}건
            </span>
            <Delta current={totals.consultRecent30d} previous={totals.consultPrev30d} />
          </dd>
        </div>
        <div className="rounded-xl bg-royal-50/60 p-3.5 text-center">
          <dt className="text-[11px] text-ink-300">상담 합산 (전체)</dt>
          <dd className="mt-0.5 text-xl font-extrabold text-ink-900">{totals.consultTotal}건</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
        증감은 그 이전 30일과 비교한 값이에요.
      </p>
    </section>
  );
}

function FacilityPanel({ facility }: { facility: ConsoleFacility }) {
  const [intro, setIntro] = useState(facility.intro);
  const [savedIntro, setSavedIntro] = useState(facility.intro);
  const [photos, setPhotos] = useState(facility.photos);
  const [bannerUrl, setBannerUrl] = useState(facility.bannerImageUrl);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState(facility.posts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function report(err: string | null, ok: string | null) {
    setError(err);
    setNotice(ok);
  }

  async function call(
    input: RequestInfo,
    init: RequestInit | undefined,
    okMessage: string | null
  ): Promise<Record<string, unknown> | null> {
    setBusy(true);
    report(null, null);
    try {
      const res = await fetch(input, init);
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
        error?: string;
      };
      if (!res.ok) {
        report(json.error ?? "처리하지 못했어요. 잠시 후 다시 시도해주세요.", null);
        return null;
      }
      if (okMessage) report(null, okMessage);
      return json;
    } catch {
      report("네트워크 상태를 확인해주세요.", null);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveIntro() {
    const json = await call(
      "/api/business/content",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId: facility.facilityId, intro }),
      },
      "소개글을 저장했어요."
    );
    if (json) setSavedIntro(intro);
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    report(null, null);
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
        report(json.error ?? "사진을 올리지 못했어요.", null);
        return;
      }
      if (json.content) setPhotos(json.content.photos);
      report(null, "사진을 올렸어요.");
    } catch (e) {
      report(e instanceof Error ? e.message : "사진을 처리하지 못했어요.", null);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto(url: string) {
    const json = await call(
      `/api/business/photos?facilityId=${encodeURIComponent(
        facility.facilityId
      )}&url=${encodeURIComponent(url)}`,
      { method: "DELETE" },
      null
    );
    if (json?.content && typeof json.content === "object") {
      setPhotos((json.content as { photos: string[] }).photos);
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

      {facility.hasReport ? (
        <Link
          href={`/business/console/report?facilityId=${encodeURIComponent(facility.facilityId)}`}
          className="flex items-center justify-between gap-3 rounded-2xl bg-royal-500 px-4 py-3.5 text-sm font-bold text-white shadow-royal transition-all hover:bg-royal-600"
        >
          이번 달 성과 보고서 보기
          <ExternalLink size={15} className="shrink-0 text-white/70" />
        </Link>
      ) : (
        <a
          href="#plans"
          className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-ink-100 bg-white px-4 py-3.5 text-sm font-semibold text-ink-500 transition-colors hover:bg-ink-100"
        >
          월간 성과 보고서는 지역 프리미엄부터
          <span className="shrink-0 text-xs text-primary-600">자세히 →</span>
        </a>
      )}

      {/* 숫자 — 콘솔을 다시 열게 만드는 부분이라 맨 위 */}
      <section className={CARD}>
        <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
          <TrendingUp size={15} className="text-primary-500" /> 우리 시설을 찾는 보호자
        </h2>
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-ivory-100 p-3.5 text-center">
            <dt className="flex items-center justify-center gap-1 text-[11px] text-ink-300">
              <Eye size={11} /> 페이지 조회 (7일)
            </dt>
            <dd className="mt-0.5 text-xl font-extrabold text-ink-900">
              {facility.views7d.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-xl bg-ivory-100 p-3.5 text-center">
            <dt className="flex items-center justify-center gap-1 text-[11px] text-ink-300">
              <Eye size={11} /> 페이지 조회 (30일)
            </dt>
            <dd className="mt-0.5 flex flex-col items-center gap-0.5">
              <span className="text-xl font-extrabold text-ink-900">
                {facility.views30d.toLocaleString()}
              </span>
              <Delta current={facility.views30d} previous={facility.viewsPrev30d} />
            </dd>
          </div>
          <div className="rounded-xl bg-ivory-100 p-3.5 text-center">
            <dt className="text-[11px] text-ink-300">상담 신청 (30일)</dt>
            <dd className="mt-0.5 flex flex-col items-center gap-0.5">
              <span className="text-xl font-extrabold text-ink-900">
                {facility.consultRecent30d}건
              </span>
              <Delta current={facility.consultRecent30d} previous={facility.consultPrev30d} />
            </dd>
          </div>
          <div className="rounded-xl bg-ivory-100 p-3.5 text-center">
            <dt className="text-[11px] text-ink-300">상담 신청 (전체)</dt>
            <dd className="mt-0.5 text-xl font-extrabold text-ink-900">
              {facility.consultTotal}건
            </dd>
          </div>
        </dl>

        <ViewTrendChart
          series={facility.viewSeries.map((d) => ({ date: formatDay(d.date), count: d.count }))}
        />

        <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
          조회수는 집계를 시작한 날부터 쌓여요. 증감은 그 이전 30일과 비교한 값이고,
          방문자 개인정보는 수집하지 않습니다.
        </p>
      </section>

      {/* 상담 신청 내역 — 숫자만으로는 연락을 못 한다. 목록이 실제 가치다 */}
      <section className={CARD}>
        <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
          <Phone size={15} className="text-mint-600" /> 최근 상담 신청
        </h2>
        {facility.consults.length === 0 ? (
          <p className="rounded-xl bg-ivory-100 p-4 text-center text-sm text-ink-300">
            아직 접수된 상담 신청이 없어요.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {facility.consults.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-ink-900">{c.name}</span>
                    {c.hasProfile && (
                      <span className="rounded-full bg-royal-50 px-1.5 py-0.5 text-[10px] font-bold text-royal-700">
                        어르신 정보 첨부
                      </span>
                    )}
                    {c.status === "입소결정" && (
                      <span className="rounded-full bg-mint-100 px-1.5 py-0.5 text-[10px] font-bold text-mint-700">
                        입소 결정
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {c.phone} · {formatDate(c.createdAt)}
                    {c.emailed ? "" : " · 메일 미발송(콘솔에서만 확인 가능)"}
                  </span>
                </span>
                <a
                  href={`tel:${c.phone}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-700 transition-colors hover:bg-mint-200"
                  aria-label={`${c.name}님께 전화`}
                >
                  <Phone size={15} />
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 flex gap-1.5 text-[11px] leading-relaxed text-ink-300">
          <MessageCircle size={12} className="mt-0.5 shrink-0" />
          보호자가 상담을 원해 직접 남긴 연락처예요. 상담 목적으로만 사용해주세요. 어르신 건강
          정보는 첨부 여부만 표시되며, 내용은 시설 이메일로 전달된 메일에서 확인하실 수 있어요.
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
          className={`${FIELD} resize-y leading-relaxed`}
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
          <a
            href="#plans"
            className="mt-3 block rounded-xl bg-ivory-100 p-3.5 text-center text-xs font-semibold text-ink-700 transition-colors hover:bg-ivory-200"
          >
            사진을 더 올리고 싶으신가요? 비즈니스 플러스에서 30장까지 열려요 →
          </a>
        )}
      </section>

      {/* 지역 배너 — 지역 프리미엄 이상 */}
      <BannerSection
        facility={facility}
        bannerUrl={bannerUrl}
        setBannerUrl={setBannerUrl}
        bannerFileRef={bannerFileRef}
        busy={busy}
        setBusy={setBusy}
        report={report}
      />

      {/* 시설 소식 — 비즈니스 플러스 이상 */}
      <NewsSection
        facility={facility}
        posts={posts}
        setPosts={setPosts}
        busy={busy}
        call={call}
      />

      {/* 정보 정정 요청 */}
      <CorrectionSection facility={facility} busy={busy} call={call} />

      {/* 확장 상품 안내 — 가격은 여기(인증된 담당자만 보는 화면)에서만 보여준다.
          앞단(/business)은 무료 혜택 중심이고, 요금표는 신뢰가 생긴 뒤의 이야기다. */}
      <section id="plans" className={`${CARD} scroll-mt-20`}>
        <h2 className="mb-1 text-[15px] font-bold text-ink-900">확장 상품 안내</h2>
        <p className="mb-3 text-xs leading-relaxed text-ink-500">
          지금 쓰시는 무료 기능은 그대로 유지되고, 노출을 키우고 싶을 때만 선택하시면 돼요.
          금액은 모두 {VAT_NOTE}, 최소 약정 없이 월 단위입니다.
        </p>

        <div className="space-y-2.5">
          {BUSINESS_PLANS.filter((p) => p.id !== "free").map((plan) => {
            const isCurrent = plan.id === facility.plan;
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-4 ${
                  isCurrent
                    ? "border-mint-300 bg-mint-50/50"
                    : plan.highlight
                    ? "border-primary-200"
                    : "border-ink-100"
                }`}
              >
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-ink-900">{plan.name}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-mint-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        이용 중
                      </span>
                    )}
                    {!isCurrent && plan.highlight && (
                      <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        가장 많이 선택
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-extrabold text-ink-900">
                    {formatPlanPrice(plan)}
                    {plan.priceNote && (
                      <span className="ml-1 text-[11px] font-normal text-ink-300">
                        {plan.priceNote}
                      </span>
                    )}
                  </span>
                </div>
                <p className="mb-2 text-xs leading-relaxed text-ink-500">{plan.tagline}</p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 3).map((feat) => (
                    <li key={feat} className="flex gap-1.5 text-xs leading-relaxed text-ink-500">
                      <Check size={13} className="mt-0.5 shrink-0 text-mint-600" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href="tel:010-2222-9943"
            className="flex min-h-[48px] items-center justify-center rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-600"
          >
            전화로 상담하기
          </a>
          <a
            href={`mailto:wkdgytls1201@gmail.com?subject=${encodeURIComponent(
              `[확장 상품 문의] ${facility.facilityName}`
            )}`}
            className="flex min-h-[48px] items-center justify-center rounded-xl border border-ink-100 bg-white text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
          >
            이메일로 문의하기
          </a>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-300">
          결제는 상담 후 세금계산서와 함께 진행돼요. 언제든 중단할 수 있습니다.
        </p>
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

type CallFn = (
  input: RequestInfo,
  init: RequestInit | undefined,
  okMessage: string | null
) => Promise<Record<string, unknown> | null>;

function BannerSection({
  facility,
  bannerUrl,
  setBannerUrl,
  bannerFileRef,
  busy,
  setBusy,
  report,
}: {
  facility: ConsoleFacility;
  bannerUrl: string | null;
  setBannerUrl: React.Dispatch<React.SetStateAction<string | null>>;
  bannerFileRef: React.RefObject<HTMLInputElement>;
  busy: boolean;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  report: (err: string | null, ok: string | null) => void;
}) {
  async function upload(file: File) {
    setBusy(true);
    report(null, null);
    try {
      // 가로 4:1로 미리 잘라서 올린다 — 배너 자리는 크기가 정해져 있어 원본을
      // 그대로 보내면 서버가 다시 잘라야 하고, 전송량도 커진다.
      const { blob } = await toWideImage(file);
      const res = await fetch(
        `/api/business/banner?facilityId=${encodeURIComponent(facility.facilityId)}`,
        { method: "POST", headers: { "Content-Type": blob.type }, body: blob }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        banner?: { imageUrl: string | null };
      };
      if (!res.ok) {
        report(json.error ?? "배너를 올리지 못했어요.", null);
        return;
      }
      setBannerUrl(json.banner?.imageUrl ?? null);
      report(null, "배너를 올렸어요. 지역 페이지에 바로 보입니다.");
    } catch (e) {
      report(e instanceof Error ? e.message : "이미지를 처리하지 못했어요.", null);
    } finally {
      setBusy(false);
      if (bannerFileRef.current) bannerFileRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    report(null, null);
    try {
      const res = await fetch(
        `/api/business/banner?facilityId=${encodeURIComponent(facility.facilityId)}`,
        { method: "DELETE" }
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        report(json.error ?? "배너를 지우지 못했어요.", null);
        return;
      }
      setBannerUrl(null);
    } catch {
      report("네트워크 상태를 확인해주세요.", null);
    } finally {
      setBusy(false);
    }
  }

  if (!facility.canManageBanner) return null; // 무료·플러스·스폰서 단계에서는 아예 보이지 않는다

  return (
    <section className={CARD}>
      <h2 className="mb-1 text-[15px] font-bold text-ink-900">지역 배너</h2>
      <p className="mb-3 text-xs leading-relaxed text-ink-500">
        시설이 속한 지역 페이지 상단에 가로로 넓게 노출돼요. 가로가 긴 사진(외관·로비 전경 등)이
        잘 어울립니다.
      </p>

      {bannerUrl ? (
        <div className="relative overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerUrl} alt="지역 배너 미리보기" className="aspect-[4/1] w-full object-cover" />
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/60 text-white transition-colors hover:bg-ink-900"
            aria-label="배너 삭제"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => bannerFileRef.current?.click()}
          className="flex aspect-[4/1] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink-100 text-ink-300 transition-colors hover:border-primary-300 hover:text-primary-500"
        >
          <Camera size={22} />
          <span className="text-xs font-semibold">
            {busy ? "처리 중…" : "배너 이미지 올리기"}
          </span>
        </button>
      )}
      <input
        ref={bannerFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      {bannerUrl && (
        <button
          type="button"
          disabled={busy}
          onClick={() => bannerFileRef.current?.click()}
          className="mt-2 min-h-[44px] w-full rounded-xl border border-ink-100 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-100"
        >
          다른 이미지로 바꾸기
        </button>
      )}
    </section>
  );
}

function NewsSection({
  facility,
  posts,
  setPosts,
  busy,
  call,
}: {
  facility: ConsoleFacility;
  posts: ConsolePost[];
  setPosts: React.Dispatch<React.SetStateAction<ConsolePost[]>>;
  busy: boolean;
  call: CallFn;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function publish() {
    const json = await call(
      "/api/business/posts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId: facility.facilityId, title, body }),
      },
      "소식을 올렸어요. 시설 페이지에 바로 보입니다."
    );
    const post = json?.post as ConsolePost | undefined;
    if (post) {
      setPosts((prev) => [post, ...prev]);
      setTitle("");
      setBody("");
    }
  }

  async function remove(id: string) {
    const json = await call(
      `/api/business/posts?facilityId=${encodeURIComponent(
        facility.facilityId
      )}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
      null
    );
    if (json) setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <section className={CARD}>
      <h2 className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
        <Newspaper size={15} className="text-royal-500" /> 시설 소식
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-ink-500">
        행사·공지·채용 소식을 올리면 시설 페이지에 최신순으로 보여요.
      </p>

      {facility.canPostNews ? (
        <div className="mb-4 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="제목 (예: 5월 어버이날 가족 초청 행사 안내)"
            className={FIELD}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="내용을 적어주세요."
            className={`${FIELD} resize-y leading-relaxed`}
          />
          <button
            type="button"
            disabled={busy || !title.trim() || !body.trim()}
            onClick={publish}
            className="min-h-[44px] w-full rounded-xl bg-royal-500 text-sm font-bold text-white shadow-royal transition-all hover:bg-royal-600 disabled:bg-ink-100 disabled:text-ink-300 disabled:shadow-none"
          >
            {busy ? "올리는 중…" : "소식 올리기"}
          </button>
        </div>
      ) : (
        <a
          href="#plans"
          className="mb-4 block rounded-xl bg-ivory-100 p-3.5 text-center text-xs font-semibold text-ink-700 transition-colors hover:bg-ivory-200"
        >
          소식 발행은 비즈니스 플러스부터 쓸 수 있어요. 확장 상품 보기 →
        </a>
      )}

      {posts.length > 0 && (
        <ul className="divide-y divide-ink-100">
          {posts.map((p) => (
            <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">{p.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink-500">
                  {p.body}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-300">
                  {formatDate(p.createdAt)}
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(p.id)}
                aria-label="소식 삭제"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-300 transition-colors hover:bg-ink-100 hover:text-ink-700"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CorrectionSection({
  facility,
  busy,
  call,
}: {
  facility: ConsoleFacility;
  busy: boolean;
  call: CallFn;
}) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    const json = await call(
      "/api/business/correction",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId: facility.facilityId, message }),
      },
      "정정 요청을 접수했어요. 확인 후 반영해 드릴게요."
    );
    if (json) {
      setMessage("");
      setSent(true);
    }
  }

  return (
    <section className={CARD}>
      <h2 className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
        <PenLine size={15} className="text-accent-500" /> 정보 정정 요청
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-ink-500">
        인력·정원·연락처 같은 공공데이터 항목이 실제와 다르면 알려주세요. 확인 후 반영해
        드립니다(무료). 정확한 지표 유지를 위해 이 항목들은 직접 수정 대신 확인을 거쳐요.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="예) 간호사가 2명으로 나오는데 실제로는 4명입니다. 대표번호도 055-000-0000으로 바뀌었어요."
        className={`${FIELD} resize-y leading-relaxed`}
      />
      <button
        type="button"
        disabled={busy || message.trim().length < 5}
        onClick={submit}
        className="mt-2 min-h-[44px] w-full rounded-xl border border-ink-100 bg-white text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100 disabled:text-ink-300"
      >
        {busy ? "접수 중…" : sent ? "추가로 요청하기" : "정정 요청 보내기"}
      </button>
    </section>
  );
}
