"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Clock, Users, FileSignature, NotebookPen } from "lucide-react";
import { AuthModal } from "./AuthModal";
import { typeMeta, type LocationTypeValue } from "@/lib/careLocationTypes";
import { SERVICE_STEPS } from "@/lib/careServices";

// 로그인 전에도 "여기서 무엇을 할 수 있는지"는 보여준다.
// 빈 화면이나 한 줄짜리 안내만 두면 왜 로그인해야 하는지 알 수 없다.
//
// ⚠️ 합의서 문구는 "계약서"라고 쓰지 않는다 — 회사는 표준 양식 제공·서명 기록 보관까지만
// 하고 계약 당사자·중개자가 아니다(docs/care-agreement-spec.md §1). 여기 안내 문구도
// 그 선("표준 양식·기록 보관") 안에서만 말한다.
const REASONS = [
  {
    icon: Users,
    title: "지원한 매니저를 직접 골라요",
    desc: "경력과 자격증을 확인하고 마음에 드는 분을 고르시면 매칭이 확정돼요.",
  },
  {
    icon: FileSignature,
    title: "표준 돌봄 합의서에 서명해요",
    desc: "두 분이 정한 조건을 표준 양식에 담아 서명하고, 서명 기록과 사본은 돌보다가 보관·발송해요.",
  },
  {
    icon: NotebookPen,
    title: "돌봄일지를 바로 확인해요",
    desc: "매니저가 남기는 식사·복약·하루 상태 기록을 돌봄 기간 내내 확인할 수 있어요.",
  },
  {
    icon: Clock,
    title: "진행 상황이 저장돼요",
    desc: "요청 내용과 지원자 목록을 언제든 다시 확인하고 수정하실 수 있어요.",
  },
  {
    icon: ShieldCheck,
    title: "연락처는 확정 후에만 공개돼요",
    desc: "요청서에 적으신 내용은 매칭이 확정되기 전까지 매니저에게 최소한만 전달돼요.",
  },
];

export function CareRequestSignedOut({ presetType }: { presetType: LocationTypeValue | null }) {
  const [showAuth, setShowAuth] = useState(false);
  const meta = presetType ? typeMeta(presetType) : null;

  return (
    <main className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <div className="mb-7 text-center">
        {meta && (
          <span
            className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${meta.badgeClass}`}
          >
            <meta.icon size={13} />
            {meta.label}
          </span>
        )}
        <h1 className="mb-3 text-[26px] font-bold leading-tight text-ink-900">
          {meta ? `${meta.label}, ` : ""}어떤 도움이 필요하신지
          <br />
          알려주시면 매니저가 찾아와요
        </h1>
        <p className="text-sm leading-relaxed text-ink-500">
          몇 가지만 고르면 요청이 등록되고, 활동 지역이 맞는 돌보다 매니저가 지원합니다.
        </p>
      </div>

      <ol className="mb-7 space-y-3">
        {SERVICE_STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 rounded-2xl border border-ink-100 bg-white p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink-900">{step.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{step.desc}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mb-7 rounded-2xl bg-ink-100/40 p-5">
        <p className="mb-3 text-sm font-bold text-ink-900">로그인이 필요한 이유예요</p>
        <ul className="space-y-3">
          {REASONS.map((r) => (
            <li key={r.title} className="flex gap-3">
              <r.icon size={16} className="mt-0.5 shrink-0 text-primary-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink-900">{r.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{r.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => setShowAuth(true)}
        className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 text-base font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99]"
      >
        {/* 모달에 카카오·구글이 함께 있어 특정 수단을 못 박지 않는다 */}
        3초 만에 시작하기
        <ArrowRight size={18} />
      </button>
      <p className="mt-3 text-center text-xs text-ink-300">
        요청 등록은 무료이고, 사례비는 매니저와 직접 정하세요.
      </p>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-5">
        <p className="mb-2 text-sm font-bold text-ink-900">아직 고민 중이신가요?</p>
        <p className="mb-3 text-xs leading-relaxed text-ink-500">
          어떤 돌봄이 맞을지 모르겠다면 서비스 종류를 먼저 비교해보세요.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/services"
            className="flex min-h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-100 text-sm font-bold text-ink-700 transition-colors duration-150 hover:bg-ink-100"
          >
            <Check size={15} />
            서비스 비교하기
          </Link>
          <Link
            href="/grade-test"
            className="flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-royal-200 bg-royal-50 text-sm font-bold text-royal-700 transition-colors duration-150 hover:bg-royal-100"
          >
            등급 테스트 하기
          </Link>
        </div>
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          reason="로그인하면 돌봄 요청을 등록하고 지원자를 확인할 수 있어요."
        />
      )}
    </main>
  );
}
