"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { X, Plus, ChevronLeft, HeartHandshake, Camera, User } from "lucide-react";
import { REGIONS } from "@/lib/regions";
import { PageLoader } from "@/components/PageLoader";
import { PhotoCropModal } from "@/components/PhotoCropModal";
import { useSitterProfileContext } from "@/lib/sitterProfileContext";

const STEP_TITLES = ["약관 동의", "기본 정보", "경력 · 자격", "활동 지역", "정산 계좌 (선택)"];
const MAX_REGIONS = 10;
const NATIONALITIES = ["내국인", "외국인"];
// 프로필 관리 화면·서버(/api/sitter-profile)와 같은 값 — 밴드형만 받는다(정확한 나이 안 받음)
const GENDERS = ["여성", "남성"] as const;
const AGE_BANDS = ["20대", "30대", "40대", "50대", "60대", "70대 이상"] as const;

interface Certification {
  name: string;
  issuedBy: string;
}

export default function SitterRegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { update: updateContextProfile } = useSitterProfileContext();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAgreeModal, setShowAgreeModal] = useState(false);

  // 1. 약관 동의
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedThirdParty, setAgreedThirdParty] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // 2. 기본 정보
  const [nickname, setNickname] = useState("");
  // 사진은 프로필이 만들어진 뒤에야 올릴 수 있다(업로드 API가 SitterProfile 행을 찾는다).
  // 그래서 가입 중에는 크롭 결과를 손에 들고만 있다가 등록 직후에 올린다.
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [nationality, setNationality] = useState("내국인");
  const [gender, setGender] = useState<string | null>(null);
  const [ageBand, setAgeBand] = useState<string | null>(null);
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

  if (status === "loading") return <PageLoader />;

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm text-ink-500">돌보다 매니저 등록은 로그인 후 진행할 수 있어요.</p>
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

  // 파일을 고르면 바로 들고 있지 않고 크롭 창을 먼저 띄운다 — 얼굴이 가운데가 아닌
  // 사진이 대부분이라 기계적으로 가운데를 자르면 이마가 잘린다(프로필 관리와 같은 흐름).
  function pickPhoto(file: File) {
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("사진 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setPhotoError("사진 용량이 너무 커요. 30MB 이하로 올려주세요.");
      return;
    }
    setCropFile(file);
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
          nationality,
          gender,
          ageBand,
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
      let profile = await res.json();

      // 사진은 프로필이 생긴 뒤에만 올릴 수 있다. 여기서 실패해도 가입 자체는 이미
      // 끝났으므로 되돌리지 않는다 — 프로필 관리 화면에서 다시 올리면 된다.
      if (photoBlob) {
        try {
          const photoRes = await fetch("/api/sitter-profile/photo", {
            method: "POST",
            headers: { "Content-Type": photoBlob.type },
            body: photoBlob,
          });
          if (photoRes.ok) profile = await photoRes.json();
        } catch {
          /* 사진만 빠진 채로 진행 */
        }
      }

      // /mypage 레이아웃은 화면을 옮겨도 다시 마운트되지 않는다. 방금 만든 프로필을
      // 공유 상태에 넣어주지 않으면, 등록을 마치고 넘어간 프로필 관리 화면이
      // "아직 돌보다 매니저로 등록하지 않으셨어요"를 띄운다(사이드바도 마찬가지).
      updateContextProfile(profile);
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
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ink-500 transition-all duration-150 hover:bg-ink-100 active:scale-90 active:bg-ink-100"
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
              돌보다 매니저로 등록하면 프로필이 만들어지고, 앞으로 요양시설·업체가 올리는 돌봄
              일자리와 연결될 수 있어요.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-primary-200 bg-primary-50 p-3.5 text-sm font-bold text-primary-700">
            <input
              type="checkbox"
              checked={agreedTerms && agreedPrivacy && agreedThirdParty && agreedAge && marketingOptIn}
              onChange={(e) => {
                const checked = e.target.checked;
                setAgreedTerms(checked);
                setAgreedPrivacy(checked);
                setAgreedThirdParty(checked);
                setAgreedAge(checked);
                setMarketingOptIn(checked);
              }}
              className="h-4 w-4 rounded accent-primary-500"
            />
            전체 동의하기
          </label>

          <div className="my-1 border-t border-ink-100" />

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
                돌보다 매니저 이용약관
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
              placeholder="보호자에게 보여질 이름 (2자 이상)"
              className="w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm transition-colors duration-150 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">
              프로필 사진 <span className="font-normal text-ink-300">(선택)</span>
            </label>
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                    <User size={24} />
                  </span>
                )}
                <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-primary-500 text-white shadow-soft transition-transform hover:bg-primary-600 active:scale-90">
                  <Camera size={14} aria-hidden />
                  <span className="sr-only">프로필 사진 {photoPreview ? "바꾸기" : "올리기"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = ""; // 같은 파일을 다시 골라도 onChange가 오게
                      if (file) pickPhoto(file);
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-relaxed text-ink-500">
                  보호자는 어르신을 맡길 사람을 고르는 중이에요.
                  <br />
                  얼굴 사진 한 장이 자기소개보다 먼저 신뢰를 만듭니다.
                </p>
                {photoPreview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoBlob(null);
                      setPhotoPreview(null);
                    }}
                    className="mt-1 text-[12px] font-semibold text-ink-400 underline underline-offset-2 hover:text-ink-700"
                  >
                    고른 사진 지우기
                  </button>
                ) : (
                  <p className="mt-1 text-[12px] text-ink-300">지금 건너뛰고 나중에 올려도 돼요.</p>
                )}
              </div>
            </div>
            {photoError && (
              <p className="mt-2 text-[12px] font-semibold text-primary-600">{photoError}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">국적</label>
            <div className="flex gap-2">
              {NATIONALITIES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNationality(n)}
                  className={`min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-95 ${
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
          {/* 성별·연령대(선택) — 정확한 나이가 아니라 밴드만. 보호자가 선호 성별·연령대를
              보고 매니저를 고르기 때문에, 등록 때 채워두면 선택될 확률이 올라간다
              (프로필 관리 화면과 같은 UI·같은 서버 화이트리스트). */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              성별 <span className="font-normal text-ink-300">(선택)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={gender === g}
                  onClick={() => setGender((prev) => (prev === g ? null : g))}
                  className={`min-h-[44px] rounded-full px-4 text-[13px] font-bold transition-all duration-150 active:scale-95 ${
                    gender === g ? "bg-primary-500 text-white" : "bg-ink-100/60 text-ink-500"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              연령대 <span className="font-normal text-ink-300">(선택)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AGE_BANDS.map((band) => (
                <button
                  key={band}
                  type="button"
                  aria-pressed={ageBand === band}
                  onClick={() => setAgeBand((prev) => (prev === band ? null : band))}
                  className={`min-h-[44px] rounded-full px-3.5 text-[13px] font-bold transition-all duration-150 active:scale-95 ${
                    ageBand === band ? "bg-primary-500 text-white" : "bg-ink-100/60 text-ink-500"
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-300">
              보호자가 매니저를 고를 때 참고하는 정보예요. 입력하시면 지원자 카드에 함께 보여요.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              자기소개 <span className="font-normal text-ink-300">(선택)</span>
            </label>
            <p className="mb-2 text-[11px] leading-relaxed text-ink-300">
              보호자가 지원자를 고를 때 가장 오래 보는 곳이에요. 경험보다{" "}
              <strong className="text-ink-500">어르신을 어떻게 대하는지</strong>가 잘 드러나면
              좋아요. 편하게 나를 어필해보세요.
            </p>
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value.slice(0, 200))}
              rows={7}
              placeholder="예: 어머니를 5년 모신 마음으로, 서두르지 않고 어르신 속도에 맞춰 돌봐드려요. 그동안 어떤 상황에서 어떻게 대응했는지 구체적으로 적어주시면 더 좋아요."
              className="w-full resize-none rounded-xl border border-ink-100 px-3.5 py-3 text-base leading-relaxed transition-colors duration-150 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 sm:text-sm"
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[11px] text-ink-300">
                {intro.length > 0 && intro.length < 20
                  ? "조금만 더 적으면 훨씬 좋아요"
                  : "이렇게 시작해보세요: 「10년째 ○○을 하며…」 「제 부모님을 모시듯…」"}
              </p>
              <span className="shrink-0 text-[11px] text-ink-300">{intro.length}/200</span>
            </div>
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
                    className="-m-1.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-1 text-primary-400 transition-all duration-150 hover:bg-primary-100 active:scale-90 active:bg-primary-100"
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
                className="min-w-0 flex-1 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <input
                value={certIssuer}
                onChange={(e) => setCertIssuer(e.target.value)}
                placeholder="발급기관(선택)"
                className="w-28 shrink-0 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <button
                type="button"
                onClick={addCertification}
                aria-label="자격증 추가"
                className="flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-primary-500 px-3 text-white transition-all duration-150 hover:bg-primary-600 active:scale-95"
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
                  className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    active
                      ? "border-primary-500 bg-primary-500 text-white active:scale-95"
                      : disabled
                      ? "cursor-not-allowed border-ink-100 text-ink-300"
                      : "border-ink-100 text-ink-700 hover:bg-ink-100/60 active:scale-95"
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

      {/* z-30: 하단 탭바(z-40)와 같은 자리를 쓰므로 명시적 z-index가 없으면 가려진다
          (탭바는 이 화면에서 숨기지만, 안전하게 이쪽도 층을 올려둔다) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 px-4 pt-3 backdrop-blur [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
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
              // 1단계(약관 동의)는 버튼을 눌러도 아무 반응이 없으면 "버튼이 없다"고
              // 느끼기 쉬워서, 항상 눌리는 상태로 두고 대신 동의가 안 됐으면 팝업으로
              // 안내한다. 그 외 단계는 기존처럼 조건 충족 전엔 비활성화한다.
              disabled={step !== 0 && !canProceed()}
              onClick={() => {
                if (step === 0 && !requiredAgreed) {
                  setShowAgreeModal(true);
                  return;
                }
                setStep((s) => s + 1);
              }}
              className="w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-300"
            >
              다음
            </button>
          )}
        </div>
      </div>

      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onDone={(blob, previewUrl) => {
            setPhotoBlob(blob);
            setPhotoPreview(previewUrl);
            setCropFile(null);
          }}
        />
      )}

      {showAgreeModal && (
        <div
          className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4"
          onClick={() => setShowAgreeModal(false)}
        >
          <div
            className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1.5 text-base font-bold text-ink-900">약관에 동의하시겠어요?</h2>
            <p className="mb-5 text-sm leading-relaxed text-ink-500">
              돌보다 매니저 등록을 진행하려면 이용약관, 개인정보처리방침, 제3자 정보제공, 만 18세 이상
              확인에 모두 동의해주셔야 해요.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAgreeModal(false)}
                className="flex-1 rounded-xl border border-ink-100 py-2.5 text-sm font-semibold text-ink-500 transition-all duration-150 hover:bg-ink-100/60 active:scale-95"
              >
                다시 볼게요
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreedTerms(true);
                  setAgreedPrivacy(true);
                  setAgreedThirdParty(true);
                  setAgreedAge(true);
                  setShowAgreeModal(false);
                  setStep((s) => s + 1);
                }}
                className="flex-1 rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-white shadow-soft ring-2 ring-primary-300 transition-all duration-150 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 active:translate-y-0 active:scale-95"
              >
                동의하고 계속하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
