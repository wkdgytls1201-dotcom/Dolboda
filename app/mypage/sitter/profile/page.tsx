"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Camera, Pencil, Plus, Share2, X, User } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";
import { REGIONS } from "@/lib/regions";
import { useSitterProfileContext, SitterProfileData } from "@/lib/sitterProfileContext";
import { sitterProgress } from "@/lib/sitterProgress";
import { maskAccount } from "@/lib/maskAccount";
import { PhotoCropModal } from "@/components/PhotoCropModal";
import { shareOrCopyLink } from "@/lib/shareLink";

type SitterProfile = SitterProfileData;

const MAX_REGIONS = 10;
// 역경매 지원자 카드용(선택) — 대략적인 밴드만 버튼으로 받는다(정확한 나이는 안 받는다)
const GENDERS = ["여성", "남성"] as const;
const AGE_BANDS = ["20대", "30대", "40대", "50대", "60대", "70대 이상"] as const;

export default function SitterProfilePage() {
  const { data: session, status } = useSession();
  // MyPageShell이 이미 한 번 불러온 데이터를 그대로 받아 쓴다 — 이 화면에서 또 fetch하지 않는다.
  const { profile: contextProfile, update: updateContextProfile } = useSitterProfileContext();
  const [profile, setProfile] = useState<SitterProfile | null | undefined>(undefined);
  const [editSection, setEditSection] = useState<null | "basic" | "regions" | "bank">(null);

  // 편집용 로컬 상태
  const [nickname, setNickname] = useState("");
  const [intro, setIntro] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [gender, setGender] = useState<string | null>(null);
  const [ageBand, setAgeBand] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // photoUrl이 깨진 링크일 때 브라우저 기본 "깨진 이미지" 아이콘 대신 기본 아바타로 대체
  const [photoFailed, setPhotoFailed] = useState(false);
  // 업로드가 끝나기 전에도 고른 사진을 바로 보여준다(저장 후 서버 URL로 교체된다)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  // 크롭 창에 넘길 파일 — null이면 창이 닫힌 상태
  const [cropFile, setCropFile] = useState<File | null>(null);
  // 공개 프로필 공유 안내(복사됨 등) — 잠깐 보였다 사라진다
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    if (contextProfile === undefined) return; // 아직 로딩 중
    setProfile(contextProfile);
    if (contextProfile) {
      setNickname(contextProfile.nickname);
      setIntro(contextProfile.intro ?? "");
      setExperienceYears(contextProfile.experienceYears);
      setGender(contextProfile.gender);
      setAgeBand(contextProfile.ageBand);
      setRegions(contextProfile.regions);
      setBankName(contextProfile.bankName ?? "");
      setBankAccountNumber(contextProfile.bankAccountNumber ?? "");
      setBankAccountHolder(contextProfile.bankAccountHolder ?? "");
      setPhotoFailed(false);
    }
  }, [contextProfile]);

  async function patch(data: Record<string, unknown>) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/sitter-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      // res.ok를 안 보고 바로 setProfile하면, 실패 응답({error:"..."})이 프로필 자리에
      // 들어가 certifications가 undefined가 되고 아래 .map()에서 화면이 통째로 죽는다.
      if (!res.ok) throw new Error();
      const updated: SitterProfileData = await res.json();
      setProfile(updated);
      // 사이드바·대시보드·정산관리가 보는 공유 상태도 같이 갱신한다
      updateContextProfile(updated);
      return updated;
    } catch {
      setSaveError("저장하지 못했어요. 잠시 후 다시 시도해주세요.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  // 파일을 고르면 바로 올리지 않고 크롭 창을 먼저 띄운다 — 얼굴이 가운데가 아닌 사진이
  // 대부분이라, 기계적으로 가운데를 자르면 이마가 잘리거나 배경만 남는다.
  function pickPhoto(file: File) {
    setSaveError(null);
    if (!file.type.startsWith("image/")) {
      setSaveError("사진 파일만 올릴 수 있어요.");
      return;
    }
    // 원본은 몇 MB든 받아서 브라우저에서 줄인다. 다만 너무 큰 파일은 폰에서 디코딩하다
    // 멈춘 것처럼 보여서, 여기서 먼저 끊고 이유를 알려준다.
    if (file.size > 30 * 1024 * 1024) {
      setSaveError("사진 용량이 너무 커요. 30MB 이하로 올려주세요.");
      return;
    }
    setCropFile(file);
  }

  async function uploadPhoto(blob: Blob, previewUrl: string) {
    setSaveError(null);
    setPhotoBusy(true);
    setPhotoPreview(previewUrl);
    try {
      const res = await fetch("/api/sitter-profile/photo", {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "사진을 저장하지 못했어요.");
      }
      const updated: SitterProfileData = await res.json();
      setProfile(updated);
      updateContextProfile(updated);
      setPhotoFailed(false);
      setPhotoPreview(null);
    } catch (e) {
      setPhotoPreview(null);
      setSaveError(e instanceof Error ? e.message : "사진을 저장하지 못했어요.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    if (!confirm("프로필 사진을 삭제할까요?")) return;
    setSaveError(null);
    setPhotoBusy(true);
    try {
      const res = await fetch("/api/sitter-profile/photo", { method: "DELETE" });
      if (!res.ok) throw new Error();
      const updated: SitterProfileData = await res.json();
      setProfile(updated);
      updateContextProfile(updated);
      setPhotoPreview(null);
    } catch {
      setSaveError("사진을 삭제하지 못했어요.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function addCertification() {
    if (!certName.trim() || !profile) return;
    setSaveError(null);
    const res = await fetch("/api/sitter-profile/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: certName.trim(), issuedBy: certIssuer.trim() || undefined }),
    });
    if (!res.ok) {
      setSaveError("자격증을 추가하지 못했어요.");
      return;
    }
    const cert = await res.json();
    const next = { ...profile, certifications: [...profile.certifications, cert] };
    setProfile(next);
    updateContextProfile(next);
    setCertName("");
    setCertIssuer("");
  }

  async function removeCertification(id: string) {
    if (!profile) return;
    const res = await fetch(`/api/sitter-profile/certifications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setSaveError("자격증을 삭제하지 못했어요.");
      return;
    }
    const next = {
      ...profile,
      certifications: profile.certifications.filter((c) => c.id !== id),
    };
    setProfile(next);
    updateContextProfile(next);
  }

  function toggleRegion(region: string) {
    setRegions((prev) => {
      if (prev.includes(region)) return prev.filter((r) => r !== region);
      if (prev.length >= MAX_REGIONS) return prev;
      return [...prev, region];
    });
  }

  if (status === "loading" || profile === undefined) {
    return (
      <MyPageShell>
        <PageLoader compact />
      </MyPageShell>
    );
  }

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
      </main>
    );
  }

  if (profile === null) {
    return (
      <MyPageShell>
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50 p-8 text-center">
          <p className="mb-3 text-sm text-ink-700">아직 돌보다 매니저로 등록하지 않으셨어요.</p>
          <Link
            href="/mypage/sitter/register"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-primary-500 px-5 text-sm font-bold text-white transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
          >
            돌보다 매니저 등록하기
          </Link>
        </div>
      </MyPageShell>
    );
  }

  return (
    <MyPageShell>
      <h2 className="mb-2 text-xl font-bold text-ink-900">매니저 프로필</h2>
      {/* 보호자를 앞에 둔다 — 지금 실제로 이 프로필을 보고 고르는 쪽은 돌봄 요청에
          지원했을 때의 보호자다(가입 화면 닉네임 문구도 같은 이유로 보호자 기준). */}
      <p className="mb-6 text-sm text-ink-500">보호자와 시설·업체에게 보여지는 내 프로필이에요.</p>

      {/* 저장이 실패하면 조용히 넘어가지 않고 알린다 — 예전엔 실패해도 화면상으론
          저장된 것처럼 보였고, 실패 응답이 프로필 자리에 들어가 화면이 죽기도 했다 */}
      {saveError && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-primary-50 px-4 py-3 text-[13px] font-semibold text-primary-700"
        >
          {saveError}
        </p>
      )}

      {/* 완성도 게이지 — 무엇을 채우면 좋을지 한눈에. 100%면 응원 문구만 */}
      {(() => {
        const progress = sitterProgress(profile);
        return (
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary-50 to-peach-100/50 p-4">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-bold text-ink-900">프로필 완성도</p>
              <p className="text-sm font-extrabold text-primary-600">{progress.percent}%</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-primary-400 to-peach-400 transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              {progress.nextItem
                ? `다음 할 일: ${progress.nextItem.hint}`
                : "완벽해요! 완성된 프로필은 매칭 확률이 훨씬 높아요 🎉"}
            </p>
          </div>
        );
      })()}

      <div className="space-y-4">
        {/* 기본 정보 */}
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-ink-900">기본 정보</h3>
            {editSection !== "basic" && (
              <button
                type="button"
                onClick={() => setEditSection("basic")}
                className="-my-1 flex min-h-[44px] items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary-600 transition-all duration-150 ease-snappy hover:bg-primary-50 active:scale-95"
              >
                <Pencil size={12} />
                수정
              </button>
            )}
          </div>

          <div className="mb-4 flex items-center gap-3">
            {/* 사진은 보호자가 매니저를 고를 때 가장 먼저 보는 정보라, 아바타 자체를
                누르면 바로 바꿀 수 있게 한다(별도 "수정" 진입 없이). */}
            <div className="relative shrink-0">
              {photoPreview ?? (profile.photoUrl && !photoFailed ? profile.photoUrl : null) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview ?? profile.photoUrl!}
                  alt=""
                  onError={() => setPhotoFailed(true)}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                  <User size={24} />
                </span>
              )}
              <label
                className={`absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-primary-500 text-white shadow-soft transition-transform active:scale-90 ${
                  photoBusy ? "opacity-60" : "hover:bg-primary-600"
                }`}
              >
                <Camera size={14} aria-hidden />
                <span className="sr-only">프로필 사진 {profile.photoUrl ? "바꾸기" : "올리기"}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={photoBusy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = ""; // 같은 파일을 다시 골라도 onChange가 오게
                    if (file) pickPhoto(file);
                  }}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-ink-900">{profile.nickname}</p>
              <p className="text-xs text-ink-300">
                {[
                  profile.nationality,
                  `경력 ${profile.experienceYears}년`,
                  profile.gender,
                  profile.ageBand,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>

          {/* 사진 안내·삭제는 아바타 옆이 아니라 카드 폭 전체를 쓰는 줄로 뺐다.
              아바타(64px)+간격을 빼면 옆 칸이 ~170px뿐이라 안내 문구가 두 줄로 감기고
              그 옆에 붙은 "삭제"가 혼자 떠 있는 모양이 됐다(375px 실측). */}
          <div className="mb-4 flex min-h-[44px] items-center justify-between gap-2 text-[12px]">
            {photoBusy ? (
              <span className="font-semibold text-primary-600">사진 올리는 중…</span>
            ) : (
              <>
                <span className="min-w-0 text-ink-300">
                  {profile.photoUrl ? "얼굴이 잘 보이는 사진일수록 좋아요" : "얼굴 사진을 올려주세요"}
                </span>
                {profile.photoUrl && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="-my-2 inline-flex min-h-[44px] shrink-0 items-center px-2 font-semibold text-ink-400 underline underline-offset-2 transition-colors duration-150 hover:text-ink-700 active:scale-95"
                  >
                    삭제
                  </button>
                )}
              </>
            )}
          </div>

          {!profile.photoUrl && (
            <p className="mb-4 rounded-xl bg-ink-100/40 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-500">
              보호자는 어르신을 맡길 사람을 고르는 중이에요. 밝은 곳에서 정면으로 찍은 얼굴
              사진 한 장이 자기소개보다 먼저 신뢰를 만듭니다.
            </p>
          )}

          {editSection === "basic" ? (
            <div className="space-y-2.5">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임"
                className="w-full rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value.slice(0, 200))}
                rows={7}
                placeholder="자기소개 — 경력, 어르신을 대하는 마음가짐 등 나를 어필해보세요"
                className="w-full resize-none rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <p className="text-right text-[12px] text-ink-300">{intro.length}/200</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Math.max(0, Number(e.target.value)))}
                  className="w-20 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
                />
                <span className="text-sm text-ink-500">년 경력</span>
              </div>

              {/* 성별·연령대(선택) — 정확한 나이가 아니라 대략적인 밴드만 버튼으로.
                  보호자가 선호 성별·연령대를 보고 매니저를 고르기 때문에, 채워두면
                  선택될 확률이 올라간다. 같은 버튼을 다시 누르면 지워진다. */}
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-ink-500">
                  성별 <span className="font-normal text-ink-300">(선택)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={gender === g}
                      onClick={() => setGender((prev) => (prev === g ? null : g))}
                      className={`min-h-[40px] rounded-full px-4 text-[13px] font-bold transition-colors ${
                        gender === g ? "bg-primary-500 text-white" : "bg-ink-100/60 text-ink-500"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-ink-500">
                  연령대 <span className="font-normal text-ink-300">(선택)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AGE_BANDS.map((band) => (
                    <button
                      key={band}
                      type="button"
                      aria-pressed={ageBand === band}
                      onClick={() => setAgeBand((prev) => (prev === band ? null : band))}
                      className={`min-h-[40px] rounded-full px-3.5 text-[13px] font-bold transition-colors ${
                        ageBand === band ? "bg-primary-500 text-white" : "bg-ink-100/60 text-ink-500"
                      }`}
                    >
                      {band}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-300">
                  보호자가 매니저를 고를 때 참고하는 정보예요. 입력하시면 지원자 카드에 함께
                  보여요.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditSection(null)}
                  className="flex min-h-[44px] items-center rounded-lg px-4 text-xs font-semibold text-ink-500 transition-all duration-150 ease-snappy hover:bg-ink-100 active:scale-95"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    await patch({ nickname, intro, experienceYears, gender, ageBand });
                    setEditSection(null);
                  }}
                  className="flex min-h-[44px] items-center rounded-lg bg-primary-500 px-4 text-xs font-bold text-white transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-95 disabled:opacity-60"
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            profile.intro && <p className="text-sm text-ink-700">{profile.intro}</p>
          )}
        </section>

        {/* 자격증 */}
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h3 className="mb-3 font-bold text-ink-900">보유 자격증</h3>
          {profile.certifications.length === 0 ? (
            <p className="mb-3 text-sm text-ink-300">등록된 자격증이 없어요.</p>
          ) : (
            <div className="mb-3 space-y-2">
              {profile.certifications.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-primary-50 py-1 pl-3.5 pr-1 text-sm"
                >
                  <span className="min-w-0 font-medium text-primary-700">
                    {c.name}
                    {c.issuedBy && <span className="ml-1.5 text-primary-400">· {c.issuedBy}</span>}
                  </span>
                  {/* 44px 터치 타깃(CLAUDE.md) — 예전엔 p-1이라 19×40이었다. 아이콘은 그대로 두고
                      누를 수 있는 면적만 넓힌다(음수 마진으로 칩 높이는 그대로). */}
                  <button
                    type="button"
                    onClick={() => removeCertification(c.id)}
                    aria-label="자격증 삭제"
                    className="-my-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-400 transition-all duration-150 ease-snappy hover:bg-primary-100 active:scale-90"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={certName}
              onChange={(e) => setCertName(e.target.value)}
              placeholder="예: 요양보호사 1급"
              className="min-w-0 flex-1 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
            <input
              value={certIssuer}
              onChange={(e) => setCertIssuer(e.target.value)}
              placeholder="발급기관"
              className="w-24 shrink-0 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
            <button
              type="button"
              onClick={addCertification}
              aria-label="자격증 추가"
              className="flex min-h-[44px] w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-90"
            >
              <Plus size={18} />
            </button>
          </div>
        </section>

        {/* 활동 가능 지역 */}
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-ink-900">활동 가능 지역</h3>
            {editSection !== "regions" && (
              <button
                type="button"
                onClick={() => setEditSection("regions")}
                className="-my-1 flex min-h-[44px] items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary-600 transition-all duration-150 ease-snappy hover:bg-primary-50 active:scale-95"
              >
                <Pencil size={12} />
                수정
              </button>
            )}
          </div>

          {editSection === "regions" ? (
            <div>
              <p className="mb-2 text-xs text-ink-300">
                최대 {MAX_REGIONS}개 ({regions.length}/{MAX_REGIONS})
              </p>
              <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {REGIONS.map((region) => {
                  const active = regions.includes(region);
                  const disabled = !active && regions.length >= MAX_REGIONS;
                  return (
                    <button
                      key={region}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleRegion(region)}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all duration-150 ease-snappy active:scale-95 ${
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
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditSection(null)}
                  className="flex min-h-[44px] items-center rounded-lg px-4 text-xs font-semibold text-ink-500 transition-all duration-150 ease-snappy hover:bg-ink-100 active:scale-95"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={saving || regions.length === 0}
                  onClick={async () => {
                    await patch({ regions });
                    setEditSection(null);
                  }}
                  className="flex min-h-[44px] items-center rounded-lg bg-primary-500 px-4 text-xs font-bold text-white transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-95 disabled:opacity-60"
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {profile.regions.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-ink-100/60 px-3 py-1 text-xs font-semibold text-ink-700"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* 정산 계좌 */}
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-ink-900">
              정산 계좌 <span className="font-normal text-ink-300">(선택)</span>
            </h3>
            {editSection !== "bank" && (
              <button
                type="button"
                onClick={() => setEditSection("bank")}
                className="-my-1 flex min-h-[44px] items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary-600 transition-all duration-150 ease-snappy hover:bg-primary-50 active:scale-95"
              >
                <Pencil size={12} />
                수정
              </button>
            )}
          </div>

          {editSection === "bank" ? (
            <div className="space-y-2.5">
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="은행명"
                className="w-full rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <input
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.replace(/[^0-9-]/g, ""))}
                placeholder="계좌번호"
                className="w-full rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <input
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="예금주"
                className="w-full rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditSection(null)}
                  className="flex min-h-[44px] items-center rounded-lg px-4 text-xs font-semibold text-ink-500 transition-all duration-150 ease-snappy hover:bg-ink-100 active:scale-95"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    await patch({ bankName, bankAccountNumber, bankAccountHolder });
                    setEditSection(null);
                  }}
                  className="flex min-h-[44px] items-center rounded-lg bg-primary-500 px-4 text-xs font-bold text-white transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-95 disabled:opacity-60"
                >
                  저장
                </button>
              </div>
            </div>
          ) : profile.bankName ? (
            <p className="text-sm text-ink-700">
              {/* 계좌번호는 뒤 4자리만 — 바꾸려면 "수정"으로 새로 입력한다 */}
              {profile.bankName} {maskAccount(profile.bankAccountNumber)} (
              {profile.bankAccountHolder})
            </p>
          ) : (
            <p className="text-sm text-ink-300">등록된 계좌가 없어요.</p>
          )}
        </section>

        {/* 공개 프로필 — 돌보다 실적 명함(리텐션 제안 4번).
            완료 건수·보호자 평점은 플랫폼이 매칭 기록으로 보증하는 숫자라, 매니저가
            바깥에 내밀 수 있는 커리어 자산이 된다. 반드시 본인이 직접 켜야 공개된다. */}
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="font-bold text-ink-900">공개 프로필</h3>
            {profile.publicProfileAt && (
              <span className="rounded-full bg-mint-100 px-2.5 py-0.5 text-[11px] font-bold text-mint-700">
                공개 중
              </span>
            )}
          </div>
          <p className="mb-3 text-xs leading-relaxed text-ink-500">
            돌보다가 매칭 기록으로 확인한 완료 실적·보호자 평점을 명함처럼 공유하는 페이지예요.
            <strong className="font-bold text-ink-700">
              {" "}
              공개해두면 프로필을 본 보호자가 돌봄 요청을 올려 매니저님께 돌봄을 제안할 수
              있어요
            </strong>
            {" "}
            — 프로필이 새 매칭의 입구가 됩니다. 활동명·경력·자격증·활동 지역·실적만 보이고,
            실명·연락처·계좌·후기 본문은 공개되지 않아요.
          </p>
          {profile.publicProfileAt ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const outcome = await shareOrCopyLink({
                      url: `${window.location.origin}/manager/${profile.id}`,
                      title: "돌보다 매니저 프로필",
                      text: `${profile.nickname} 매니저 — 돌보다 실적 프로필이에요`,
                    });
                    if (outcome === "copied") setShareNote("링크를 복사했어요");
                    else if (outcome === "fallback")
                      setShareNote("주소창의 링크를 길게 눌러 복사해주세요");
                    if (outcome === "copied" || outcome === "fallback") {
                      setTimeout(() => setShareNote(null), 3000);
                    }
                  }}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 text-sm font-bold text-white transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98]"
                >
                  <Share2 size={15} aria-hidden />
                  프로필 공유
                </button>
                <Link
                  href={`/manager/${profile.id}`}
                  target="_blank"
                  className="flex min-h-[44px] items-center justify-center rounded-xl border border-ink-100 px-4 text-sm font-semibold text-ink-700 transition-colors duration-150 hover:bg-ink-100/60"
                >
                  미리보기
                </Link>
              </div>
              {shareNote && (
                <p role="status" className="text-xs font-semibold text-mint-700">
                  {shareNote}
                </p>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => patch({ publicProfile: false })}
                className="self-start text-xs text-ink-300 underline underline-offset-2 transition-colors duration-150 hover:text-ink-500 disabled:opacity-60"
              >
                공개 끄기
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => patch({ publicProfile: true })}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-primary-500 text-sm font-bold text-white transition-all duration-150 ease-snappy hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
            >
              공개 프로필 켜기
            </button>
          )}
        </section>
      </div>

      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onDone={(blob, previewUrl) => {
            setCropFile(null);
            uploadPhoto(blob, previewUrl);
          }}
        />
      )}
    </MyPageShell>
  );
}
