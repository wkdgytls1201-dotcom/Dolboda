"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Info, ChevronDown, ChevronRight } from "lucide-react";
import {
  CARE_SERVICES,
  SERVICE_STEPS,
  SAMPLE_LISTINGS,
  COMPARISON_ROWS,
  type CareService,
} from "@/lib/careServices";

function ServiceCard({ service, index }: { service: CareService; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const Icon = service.icon;

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-ink-100 bg-white transition-all duration-300 ${service.accent.ring} ${
        open ? "shadow-card-hover" : "shadow-card hover:-translate-y-0.5"
      }`}
    >
      {/* 카드 위쪽에 은은하게 깔리는 색 — 유형마다 다른 인상을 준다 */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${service.accent.glow} to-transparent blur-2xl`}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative flex w-full items-center gap-4 p-5 text-left sm:p-6"
      >
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${service.accent.icon} transition-transform duration-300 group-hover:scale-105`}
        >
          <Icon size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-ink-900">{service.label}</span>
            {service.action.kind === "guide" && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${service.accent.badge}`}>
                제도 안내
              </span>
            )}
          </span>
          <span className="block text-sm leading-relaxed text-ink-500">{service.tagline}</span>
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-ink-300 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 펼침 영역 — grid-template-rows 트랜지션으로 높이를 몰라도 부드럽게 열린다 */}
      <div
        className={`grid transition-all duration-300 ease-snappy ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="relative border-t border-ink-100 p-5 sm:p-6">
            <div className="mb-5 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-2.5 text-xs font-bold text-ink-300">이런 분께 맞아요</h3>
                <ul className="space-y-2">
                  {service.fitFor.map((t) => (
                    <li key={t} className="flex gap-2 text-sm leading-relaxed text-ink-700">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-300" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2.5 text-xs font-bold text-ink-300">
                  {service.action.kind === "guide" ? "어떻게 되나요" : "이런 걸 도와드려요"}
                </h3>
                <ul className="space-y-2">
                  {service.includes.map((t) => (
                    <li key={t} className="flex gap-2 text-sm leading-relaxed text-ink-700">
                      <Check size={14} className="mt-1 shrink-0 text-primary-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-5 flex gap-2.5 rounded-2xl bg-ink-100/40 p-4">
              <Info size={15} className="mt-0.5 shrink-0 text-ink-300" />
              <p className="text-xs leading-relaxed text-ink-500">{service.note}</p>
            </div>

            {service.action.kind === "request" ? (
              <Link
                href={`/care-request?type=${service.action.locationType}`}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99]"
              >
                {service.action.label}
                <ArrowRight size={16} />
              </Link>
            ) : (
              <a
                href="https://www.longtermcare.or.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-ink-100 text-sm font-bold text-ink-700 transition-colors duration-200 hover:bg-ink-100"
              >
                {service.action.label}
                <ArrowRight size={16} />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// 예시 공고 카드를 자동으로 옆으로 넘겨준다. HeroBanner와 같은 패턴 —
// 실제 마우스 hover에서만 멈추고(터치는 계속 넘어가야 하니), 마지막 카드 다음엔
// 처음으로 부드럽게 되돌아간다.
function SampleListingsRow() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const cards = Array.from(track.children) as HTMLElement[];
      if (cards.length === 0) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 4) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const next = cards.find((c) => c.offsetLeft > track.scrollLeft + 4);
      track.scrollTo({ left: next?.offsetLeft ?? 0, behavior: "smooth" });
    }, 2800);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div className="relative">
      {/* 오른쪽에 더 볼 카드가 있다는 걸 알려주는 흐림 처리 */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-[calc(100%-0.75rem)] w-10 bg-gradient-to-l from-ivory-50 to-transparent" />
      <div
        ref={trackRef}
        onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
        className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
      {SAMPLE_LISTINGS.map((s) => (
        <div
          key={s.place}
          className="w-[270px] shrink-0 snap-start rounded-2xl border border-dashed border-ink-100 bg-white/70 p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.badge}`}>
              {s.type}
            </span>
            <span className="text-[11px] font-bold text-ink-300">예시</span>
          </div>
          <p className="mb-2 truncate text-sm font-bold text-ink-900">{s.place}</p>
          <dl className="space-y-1 text-xs">
            <div className="flex gap-2">
              <dt className="w-11 shrink-0 text-ink-300">기간</dt>
              <dd className="font-medium text-ink-700">
                {s.period} ({s.days}일)
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-11 shrink-0 text-ink-300">시간</dt>
              <dd className="font-medium text-ink-700">{s.time}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-11 shrink-0 text-ink-300">대상</dt>
              <dd className="font-medium text-ink-700">{s.target}</dd>
            </div>
          </dl>
          <p className="mt-2 border-t border-ink-100 pt-2 text-xs leading-relaxed text-ink-500">
            {s.detail}
          </p>
        </div>
      ))}
      </div>
    </div>
  );
}

export function ServicesShowcase() {
  return (
    <>
      <div className="space-y-3">
        {CARE_SERVICES.map((s, i) => (
          <ServiceCard key={s.slug} service={s} index={i} />
        ))}
      </div>

      <section className="mt-14">
        <h2 className="mb-1 text-center text-xl font-bold text-ink-900">한눈에 비교하기</h2>
        <p className="mb-6 text-center text-sm leading-relaxed text-ink-500">
          가장 많이 헷갈리시는 부분만 모았어요.
        </p>
        <div className="relative">
          {/* 오른쪽에 더 볼 게 있다는 걸 알려주는 흐림 처리 — 스크롤바를 숨겼으니 이게 유일한 힌트 */}
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-ivory-50 to-transparent" />
          <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-[560px] border-collapse overflow-hidden rounded-2xl bg-white text-sm shadow-card">
            <thead>
              <tr>
                <th className="w-[128px] border-b border-ink-100 bg-ink-100/40 p-3 text-left text-xs font-bold text-ink-500">
                  구분
                </th>
                {CARE_SERVICES.map((s) => (
                  <th
                    key={s.slug}
                    className="border-b border-l border-ink-100 bg-ink-100/40 p-3 text-xs font-bold text-ink-900"
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="even:bg-ivory-100/60">
                  <th className="border-b border-ink-100 p-3 text-left text-xs font-semibold text-ink-500">
                    {row.label}
                  </th>
                  {row.values.map((v, i) => (
                    <td
                      key={CARE_SERVICES[i].slug}
                      className={`border-b border-l border-ink-100 p-3 text-center text-xs leading-relaxed ${
                        // 우리가 처리할 수 있는지 여부는 눈에 띄게 구분해준다
                        v === "요청 가능"
                          ? "font-bold text-primary-600"
                          : v === "안내만 제공"
                          ? "font-bold text-ink-300"
                          : "text-ink-700"
                      }`}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-ink-300">
          표가 잘리면 옆으로 밀어서 보실 수 있어요
          <ChevronRight size={12} className="animate-pulse" />
        </p>
      </section>

      <section className="mt-14">
        <div className="mb-1 flex items-center justify-center gap-2">
          <h2 className="text-center text-xl font-bold text-ink-900">이렇게 올라와요</h2>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-500">
            예시
          </span>
        </div>
        <p className="mb-1 text-center text-sm leading-relaxed text-ink-500">
          아래는 실제 등록된 요청이 아니라 화면을 보여드리기 위한 예시예요.
        </p>
        <p className="mb-6 flex items-center justify-center gap-1 text-center text-[11px] text-ink-300">
          옆으로 밀어서 더 보실 수 있어요
          <ChevronRight size={12} className="animate-pulse" />
        </p>
        <SampleListingsRow />
      </section>

      <section className="mt-14">
        <h2 className="mb-1 text-center text-xl font-bold text-ink-900">어떻게 진행되나요</h2>
        <p className="mb-6 text-center text-sm text-ink-500">
          요청을 올리시면 시터가 지원하고, 보호자가 직접 고르시는 방식이에요.
        </p>
        <ol className="relative space-y-4 before:absolute before:left-[19px] before:top-4 before:h-[calc(100%-2rem)] before:w-px before:bg-ink-100">
          {SERVICE_STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4">
              <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white shadow-soft">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 rounded-2xl border border-ink-100 bg-white p-4">
                <span className="block text-sm font-bold text-ink-900">{step.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-500">{step.desc}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
