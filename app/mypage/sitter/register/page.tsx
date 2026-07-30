"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { X, Plus, ChevronLeft, HeartHandshake } from "lucide-react";
import { REGIONS } from "@/lib/regions";

const STEP_TITLES = ["약관 동의", "기본 정보", "경력 · 자격", "활동 지역", "정산 계좌"];
const MAX_REGIONS = 10;
const NATIONALITIES = ["내국인", "외국인"];

interface Certification {
  name: string;
  issuedBy: string;
}

export default function SitterRegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. 약관 동의
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedThirdParty, setAgreedThirdParty] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // 2. 기본 정보
  const [nickname, setNickname] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [nationality, setNationality] = useState("내국인");
  const [intro, setIntro] = useState("");

  // 3. 경력 · 자격
  const [experienceYears, setExperienceYears] = useState(0);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");

  // 4. 활동 지역
  const [regions, setRegions] = useState<string[]>([]);

  // 5. 정산 계좌
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm text-ink-500">모심시터 등록은 로그인 후 진행할 수 있어요.</p>
      </main>
    );
  }

  const requiredAgreed = agreedTerms && agreedPrivacy && agreedThirdParty && agreedAge;

  function canProceed() {
    if (step === 0) return requiredAgreed;
    if (step === 1) return nickname.trim().length >= 2;
    if (step === 3) return regions.length > 0;
    return true;
  }

  function toggleRegion(region: string) {
    setRegions((prev) => {
      if (prev.includes(region)) return prev.filter((r) => r !== region);
      if (prev.length >= MAX_REGIONS) return prev;
      return [...prev, region];
    });
  }

  function addCertification() {
    if (!certName.trim()) return;
    setCertifications((prev) => [...prev, { name: certName.trim(), issuedBy: certIssuer.trim() }]);
    setCertName("");
    setCertIssuer("");
  }

  function removeCertification(i: number) {
    setCertifications((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sitter-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          photoUrl: photoUrl.trim() || undefined,
          nationality,
          intro: intro.trim() || undefined,
          experienceYears,
          regions,
          bankName: bankName.trim() || undefined,
          bankAccountNumber: bankAccountNumber.trim() || undefined,
          bankAccountHolder: bankAccountHolder.trim() || undefined,
          marketingOptIn,
          certifications,
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/mypage/sitter/profile");
    } catch {
      setError("등록에 실패했어요. 잠시 후 다시 시도해주세요.");
      setSubmitting(false);
    }
  }

  const isLastStep = step === STEP_TITLES.length - 1;

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="mb-5 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            aria-label="이전 단계"
            className="rounded-full p-1.5 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary-600">
            {step + 1} / {STEP_TITLES.length}
          </p>
          <h1 className="text-lg font-bold text-ink-900">{STEP_TITLES[step]}</h1>
        </div>
      </div>

      <div className="mb-6 flex gap-1.5">
        {STEP_TITLES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i <= step ? "bg-primary-500" : "bg-ink-100"
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-primary-50 p-4">
            <HeartHandshake size={22} className="mt-0.5 shrink-0 text-primary-600" />
            <p className="text-sm leading-relaxed text-ink-700">
              모심시터로 등록하면 프로필이 만들어지고, 앞으로 요양시설·업체가 올리는 돌봄
              일자리와 연결될 수 있어요.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-100 p-3.5 text-sm">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-primary-500"
            />
            <span className="flex-1 text-ink-700">
              (필수)&nbsp;
              <a href="/terms/sitter" target="_blank" className="font-semibold underline">
                모심시터 이용약관
              </a>
              에 동의해요
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-100 p-3.5 text-sm">
            <input
              type="checkbox"
              checked={agreedPrivacy}
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-primary-500"
            />
            <span className="flex-1 text-ink-700">
              (필수)&nbsp;
              <a href="/privacy/sitter" target="_blank" className="font-semibold underline">
                개인정보 수집·이용
              </a>
              에 동의해요
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-100 p-3.5 text-sm">
            <input
              type="checkbox"
              checked={agreedThirdParty}
              onChange={(e) => setAgreedThirdParty(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-primary-500"
            />
            <span className="flex-1 text-ink-700">
              (필수) 매칭을 위해 프로필이 시설·업체에게 제공되는 것에 동의해요
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-100 p-3.5 text-sm">
            <input
              type="checkbox"
              checked={agreedAge}
              onChange={(e) => setAgreedAge(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-primary-500"
            />
            <span className="flex-1 text-ink-700">(필수) 만 14세 이상이에요</span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-100 p-3.5 text-sm">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-primary-500"
            />
            <span className="flex-1 text-ink-500">(선택) 새 일자리·이벤트 소식을 받아볼게요</span>
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">닉네임</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="시설에게 보여질 이름 (2자 이상)"
              className="w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm transition-colors duration-150 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              프로필 사진 URL <span className="font-normal text-ink-300">(선택)</span>
            </label>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="사진 업로드 기능은 준비 중이에요 · 나중에 추가해도 돼요"
              className="w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm transition-colors duration-150 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">국적</label>
            <div className="flex gap-2">
              {NATIONALITIES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNationality(n)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                    nationality === n
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-ink-100 text-ink-500 hover:bg-ink-100/60"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              한 줄 소개 <span className="font-normal text-ink-300">(선택)</span>
            </label>
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={3}
              placeholder="어르신을 대하는 나만의 마음가짐을 짧게 소개해보세요"
              className="w-full resize-none rounded-xl border border-ink-100 px-3 py-2.5 text-sm transition-colors duration-150 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">돌봄 경력</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(Math.max(0, Number(e.target.value)))}
                className="w-24 rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <span className="text-sm text-ink-500">년</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">
              보유 자격증 <span className="font-normal text-ink-300">(선택)</span>
            </label>
            <div className="space-y-2">
              {certifications.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-primary-50 px-3.5 py-2 text-sm"
                >
                  <span className="font-medium text-primary-700">
                    {c.name}
                    {c.issuedBy && <span className="ml-1.5 text-primary-400">· {c.issuedBy}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCertification(i)}
                    aria-label="자격증 삭제"
                    className="rounded-full p-1 text-primary-400 hover:bg-primary-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
                placeholder="예: 요양보호사 1급"
                className="flex-1 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <input
                value={certIssuer}
                onChange={(e) => setCertIssuer(e.target.value)}
                placeholder="발급기관(선택)"
                className="w-28 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <button
                type="button"
                onClick={addCertification}
                aria-label="자격증 추가"
                className="flex shrink-0 items-center justify-center rounded-xl bg-primary-500 px-3 text-white transition-colors duration-150 hover:bg-primary-600"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="mb-3 text-sm text-ink-500">
            활동 가능한 지역을 골라주세요. 최대 {MAX_REGIONS}개까지 선택할 수 있어요. (
            {regions.length}/{MAX_REGIONS})
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {REGIONS.map((region) => {
              const active = regions.includes(region);
              const disabled = !active && regions.length >= MAX_REGIONS;
              return (
                <button
                  key={region}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleRegion(region)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                    active
                      ? "border-primary-500 bg-primary-500 text-white"
                      : disabled
                      ? "cursor-not-allowed border-ink-100 text-ink-300"
                      : "border-ink-100 text-ink-700 hover:bg-ink-100/60"
                  }`}
                >
                  {region}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="rounded-xl bg-ink-100/40 p-3.5 text-xs leading-relaxed text-ink-500">
            정산·지급 기능은 준비 중이에요. 지금 등록해두시면 기능이 열렸을 때 바로 이용할 수
            있어요. 예금주 실시간 확인은 아직 지원하지 않으니 정확히 입력해주세요.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">은행</label>
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="예: 국민은행"
              className="w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">계좌번호</label>
            <input
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value.replace(/[^0-9-]/g, ""))}
              placeholder="'-' 없이 숫자만 입력해도 돼요"
              className="w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">예금주</label>
            <input
              value={bankAccountHolder}
              onChange={(e) => setBankAccountHolder(e.target.value)}
              placeholder="신분증 이름과 동일하게 입력해주세요"
              className="w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
          </div>
          <p className="text-center text-[11px] text-ink-300">
            계좌 정보는 나중에 정산 관리에서 다시 수정할 수 있어요. 지금 비워둬도 괜찮아요.
          </p>
        </div>
      )}

      {error && <p className="mt-4 text-center text-xs font-semibold text-primary-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {isLastStep ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "등록 중..." : "등록 완료하기"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
              className="w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-300"
            >
              다음
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
