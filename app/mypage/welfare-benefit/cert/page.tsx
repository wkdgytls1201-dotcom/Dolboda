"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, ChevronRight, ClipboardCheck, Info, Sparkles } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { LtcCertSample } from "@/components/LtcCertVisuals";
import { useCareProfiles, type CareProfileSummary } from "@/lib/careProfileContext";
import { RECIPIENT_GENDERS } from "@/lib/careOptions";

// 마이페이지 → 복지용구 혜택 → 요양인정번호 등록.
//
// 원래는 혜택 대시보드 안의 인라인 폼이었는데, 등록에 필요한 안내(어디에 적혀 있는지,
// 번호가 없으면 무엇을 하면 되는지)를 함께 보여주려면 자리가 부족했다. 대시보드에는
// 진입 카드만 남기고 등록 자체는 이 화면이 통째로 맡는다.
//
// ⚠️ 이름·생년월일은 받지 않는다 — prisma/schema.prisma의 CareProfile 주석에 적힌
// "민감정보 최소 수집" 원칙(이름·생년월일·주민번호는 아예 받지 않는다)을 그대로 따른다.
// 우리는 이 번호로 공단에 조회하지 않으므로 본인 확인용 정보가 필요하지 않다.

/** 실제로 판정받은 등급만 고르게 한다. 전부 LTC_GRADE_OPTIONS에 있는 값이어야 API가 받는다. */
const DECIDED_GRADES = [
  "1등급",
  "2등급",
  "3등급",
  "4등급",
  "5등급",
  "인지지원등급",
  "등급 외 판정",
] as const;

const CERT_DIGITS = 10;

export default function LtcCertRegisterPage() {
  const { status } = useSession();
  const { profiles, loaded } = useCareProfiles();

  if (status === "loading" || (status === "authenticated" && !loaded)) return <PageLoader />;

  if (status !== "authenticated") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm leading-relaxed text-ink-500">
          요양인정번호는 로그인 후 등록할 수 있어요.
        </p>
      </main>
    );
  }

  if (profiles.length === 0) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">먼저 보호자 프로필이 필요해요</h1>
        <p className="mb-6 text-sm leading-relaxed text-ink-500">
          어떤 어르신의 인정번호인지 연결해두어야 다음에 다시 찾지 않아요.
        </p>
        <Link
          href="/mypage/care-profile"
          className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-soft transition-colors hover:bg-primary-600"
        >
          보호자 프로필 만들기
          <ArrowRight size={15} />
        </Link>
      </main>
    );
  }

  return <CertForm profiles={profiles} />;
}

function CertForm({ profiles }: { profiles: CareProfileSummary[] }) {
  const router = useRouter();
  const { replace } = useCareProfiles();

  const [selectedId, setSelectedId] = useState(profiles[0].id);
  const selected = profiles.find((p) => p.id === selectedId) ?? profiles[0];

  const [gender, setGender] = useState<string>(selected.gender ?? "");
  const [grade, setGrade] = useState<string>("");
  const [cert, setCert] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 어르신을 바꾸면 그분의 저장값으로 폼을 다시 맞춘다 — 앞사람 값이 남아 있으면
  // 저장 버튼 한 번에 엉뚱한 프로필이 덮인다.
  useEffect(() => {
    setGender(selected.gender ?? "");
    // 이미 판정 등급이 저장돼 있으면 그대로 보여주고, 아직이면 비워 고르게 한다
    setGrade(DECIDED_GRADES.includes(selected.ltcGrade as never) ? (selected.ltcGrade as string) : "");
    setCert("");
    setError(null);
  }, [selected]);

  const certDigits = cert.replace(/\D/g, "");
  const canSubmit = certDigits.length === CERT_DIGITS && grade !== "" && !saving;

  async function submit() {
    setError(null);
    if (certDigits.length !== CERT_DIGITS) {
      setError(`인정번호는 L을 뺀 숫자 ${CERT_DIGITS}자리예요.`);
      return;
    }
    if (!grade) {
      setError("인정등급을 골라주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/care-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // 보내는 키만 바뀐다(API의 부분 업데이트) — 나머지 프로필 값은 그대로 남는다
        body: JSON.stringify({
          id: selected.id,
          ltcCertNumber: certDigits,
          ltcGrade: grade,
          ...(gender ? { gender } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "");
      replace(data);
      router.push("/mypage/welfare-benefit");
    } catch (e) {
      setError((e instanceof Error && e.message) || "저장하지 못했어요. 잠시 후 다시 시도해주세요.");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
      <Link
        href="/mypage/welfare-benefit"
        className="mb-5 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-700"
      >
        <ArrowLeft size={14} />
        복지용구 혜택으로
      </Link>

      <h1 className="text-[22px] font-extrabold leading-snug text-ink-900">
        {selected.relation}의
        <br />
        요양인정번호를 알려주세요
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        국민건강보험공단이 <strong className="font-bold text-ink-700">장기요양인정서</strong>에
        적어 보내주는 번호예요.
      </p>

      {/* 어르신 선택 — 프로필이 둘 이상일 때만. 하나면 고를 것이 없어 자리만 차지한다 */}
      {profiles.length > 1 && (
        <div className="mt-7">
          <p className="mb-2 text-[13px] font-bold text-ink-700">어느 어르신인가요</p>
          <div className="flex flex-wrap gap-1.5">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`min-h-[42px] rounded-xl px-4 text-[13px] font-bold transition-colors ${
                  p.id === selected.id
                    ? "bg-ink-900 text-white"
                    : "border border-ink-100 bg-white text-ink-500 hover:bg-ink-100/60"
                }`}
              >
                {p.relation}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 space-y-5">
        {/* 성별 */}
        <div>
          <label className="mb-2 block text-[13px] font-bold text-ink-700">어르신 성별</label>
          <div className="grid grid-cols-2 gap-2">
            {RECIPIENT_GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`min-h-[52px] rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98] ${
                  gender === g
                    ? "border-2 border-primary-400 bg-primary-50 text-primary-700"
                    : "border border-ink-100 bg-white text-ink-500 hover:bg-ink-100/50"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 인정등급 */}
        <div>
          <label htmlFor="ltc-grade" className="mb-2 block text-[13px] font-bold text-ink-700">
            인정등급
          </label>
          <select
            id="ltc-grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="min-h-[52px] w-full rounded-xl border border-ink-100 bg-white px-3.5 text-sm text-ink-900 outline-none focus:border-primary-400"
          >
            <option value="">등급 선택</option>
            {DECIDED_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* 인정번호 */}
        <div>
          <label htmlFor="ltc-cert" className="mb-2 block text-[13px] font-bold text-ink-700">
            요양인정번호
          </label>
          <input
            id="ltc-cert"
            value={cert}
            onChange={(e) => setCert(e.target.value)}
            inputMode="numeric"
            maxLength={14}
            placeholder={`L 없이 숫자 ${CERT_DIGITS}자리`}
            className="min-h-[52px] w-full rounded-xl border border-ink-100 bg-white px-3.5 text-sm tracking-wide text-ink-900 outline-none focus:border-primary-400"
          />
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-300">
            <span className={certDigits.length === CERT_DIGITS ? "font-bold text-mint-600" : ""}>
              {certDigits.length}
            </span>
            / {CERT_DIGITS}자리
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[13px] font-semibold text-primary-600">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className="mt-6 flex min-h-[54px] w-full items-center justify-center gap-1.5 rounded-2xl bg-primary-500 text-[15px] font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.99] disabled:bg-ink-100 disabled:text-ink-300 disabled:shadow-none"
      >
        {saving ? "등록 중…" : "등록하기"}
      </button>

      {/* 왜 받는지·무엇을 하지 않는지 — 화면에서 계속 밝혀야 하는 부분(프로젝트 원칙) */}
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-400">
        <Info size={13} className="mt-0.5 shrink-0" />
        등록해두면 다음에 서류를 다시 찾지 않아도 돼요. 공단에 실시간으로 조회하지는 않아서
        남은 급여 한도는 사업소 상담으로 확인하셔야 해요.
      </p>

      {/* 번호가 없는 사람의 다음 행동 — 여기서 막히면 화면을 그냥 닫는다 */}
      <section className="mt-10">
        <h2 className="mb-3 text-[15px] font-bold text-ink-900">요양인정번호가 없다면?</h2>
        <div className="space-y-2">
          <Link
            href="/guide/grade-application"
            className="group flex items-center gap-3.5 rounded-2xl bg-mint-50 p-4 transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:shadow-card active:translate-y-0"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-mint-700 shadow-soft">
              <ClipboardCheck size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-ink-900">인정등급 신청 알아보기</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ink-500">
                어떻게 신청하고 얼마나 걸리는지 정리했어요.
              </span>
            </span>
            <ChevronRight
              size={18}
              className="shrink-0 text-mint-600 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>

          <Link
            href="/grade-test"
            className="group flex items-center gap-3.5 rounded-2xl bg-primary-50 p-4 transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:shadow-card active:translate-y-0"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-soft">
              <Sparkles size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-ink-900">1분 등급 예상 테스트</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ink-500">
                대상이 되실지 미리 가늠해볼 수 있어요.
              </span>
            </span>
            <ChevronRight
              size={18}
              className="shrink-0 text-primary-400 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>

      {/* 어디를 보면 되는지 */}
      <section className="mt-10">
        <h2 className="mb-3 text-[15px] font-bold text-ink-900">인정번호는 어디에 있나요</h2>
        <LtcCertSample />
        <ol className="mt-4 space-y-2.5">
          {[
            "공단에서 받은 장기요양인정서를 꺼내주세요.",
            `인정번호 맨 앞의 L과 뒤쪽 코드를 빼고, 가운데 숫자 ${CERT_DIGITS}자리만 입력하시면 돼요.`,
          ].map((step, i) => (
            <li key={step} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-600">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-300">
          인정서를 잃어버리셨다면 공단(1577-1000)이나 가까운 지사에서 재발급받을 수 있어요.
        </p>
      </section>
    </main>
  );
}
