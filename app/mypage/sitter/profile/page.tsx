"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Camera, Pencil, Plus, X, User } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { PageLoader } from "@/components/PageLoader";
import { REGIONS } from "@/lib/regions";
import { useSitterProfileContext, SitterProfileData } from "@/lib/sitterProfileContext";
import { sitterProgress } from "@/lib/sitterProgress";
import { maskAccount } from "@/lib/maskAccount";
import { toSquareImage } from "@/lib/squareImage";

type SitterProfile = SitterProfileData;

const MAX_REGIONS = 10;

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

  useEffect(() => {
    if (contextProfile === undefined) return; // 아직 로딩 중
    setProfile(contextProfile);
    if (contextProfile) {
      setNickname(contextProfile.nickname);
      setIntro(contextProfile.intro ?? "");
      setExperienceYears(contextProfile.experienceYears);
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

  async function uploadPhoto(file: File) {
    setSaveError(null);
    setPhotoBusy(true);
    try {
      // 원본 그대로 보내면 폰 사진 한 장이 몇 MB다 — 브라우저에서 정사각 512px로 줄인다.
      const { blob, previewUrl } = await toSquareImage(file);
      setPhotoPreview(previewUrl);
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
            className="inline-block rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
          >
            돌보다 매니저 등록하기
          </Link>
        </div>
      </MyPageShell>
    );
  }

  return (
    <MyPageShell>
      <h2 className="mb-2 text-xl font-bold text-ink-900">프로필 관리</h2>
      <p className="mb-6 text-sm text-ink-500">시설·업체에게 보여지는 내 프로필이에요.</p>

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
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50"
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
                    if (file) uploadPhoto(file);
                  }}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-ink-900">{profile.nickname}</p>
              <p className="text-xs text-ink-300">
                {profile.nationality} · 경력 {profile.experienceYears}년
              </p>
              <div className="mt-1 flex items-center gap-2 text-[12px]">
                {photoBusy ? (
                  <span className="font-semibold text-primary-600">사진 올리는 중…</span>
                ) : (
                  <>
                    <span className="text-ink-300">
                      {profile.photoUrl ? "얼굴이 잘 보이는 사진일수록 좋아요" : "얼굴 사진을 올려주세요"}
                    </span>
                    {profile.photoUrl && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="font-semibold text-ink-400 underline underline-offset-2 hover:text-ink-700"
                      >
                        삭제
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {!profile.photoUrl && (
            <p className="mb-4 rounded-xl bg-ink-100/40 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-500">
              보호자는 어르신을 맡길 사람을 고르는 중이에요. 밝은 곳에서 정면으로 찍은 얼굴
              사진 한 장이 자기소개보다 먼저 신뢰를 만듭니다. 사진은 512px로 줄여 저장돼요.
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
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditSection(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    await patch({ nickname, intro, experienceYears });
                    setEditSection(null);
                  }}
                  className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600 disabled:opacity-60"
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
                  className="flex items-center justify-between rounded-xl bg-primary-50 px-3.5 py-2 text-sm"
                >
                  <span className="font-medium text-primary-700">
                    {c.name}
                    {c.issuedBy && <span className="ml-1.5 text-primary-400">· {c.issuedBy}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCertification(c.id)}
                    aria-label="자격증 삭제"
                    className="rounded-full p-1 text-primary-400 hover:bg-primary-100"
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
              className="flex shrink-0 items-center justify-center rounded-xl bg-primary-500 px-3 text-white hover:bg-primary-600"
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
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50"
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
                      className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors duration-150 ${
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
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100"
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
                  className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600 disabled:opacity-60"
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
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50"
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
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100"
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
                  className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600 disabled:opacity-60"
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
      </div>
    </MyPageShell>
  );
}
