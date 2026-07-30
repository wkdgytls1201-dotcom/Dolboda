"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Pencil, Plus, X, User } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { REGIONS } from "@/lib/regions";

interface Certification {
  id: string;
  name: string;
  issuedBy: string | null;
}

interface SitterProfile {
  id: string;
  nickname: string;
  photoUrl: string | null;
  nationality: string;
  intro: string | null;
  experienceYears: number;
  regions: string[];
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  certifications: Certification[];
}

const MAX_REGIONS = 10;

export default function SitterProfilePage() {
  const { data: session, status } = useSession();
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

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/sitter-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setProfile(data);
        if (data) {
          setNickname(data.nickname);
          setIntro(data.intro ?? "");
          setExperienceYears(data.experienceYears);
          setRegions(data.regions);
          setBankName(data.bankName ?? "");
          setBankAccountNumber(data.bankAccountNumber ?? "");
          setBankAccountHolder(data.bankAccountHolder ?? "");
        }
      });
  }, [status]);

  async function patch(data: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch("/api/sitter-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setProfile(updated);
    setSaving(false);
    return updated;
  }

  async function addCertification() {
    if (!certName.trim() || !profile) return;
    const res = await fetch("/api/sitter-profile/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: certName.trim(), issuedBy: certIssuer.trim() || undefined }),
    });
    const cert = await res.json();
    setProfile({ ...profile, certifications: [...profile.certifications, cert] });
    setCertName("");
    setCertIssuer("");
  }

  async function removeCertification(id: string) {
    if (!profile) return;
    await fetch(`/api/sitter-profile/certifications/${id}`, { method: "DELETE" });
    setProfile({ ...profile, certifications: profile.certifications.filter((c) => c.id !== id) });
  }

  function toggleRegion(region: string) {
    setRegions((prev) => {
      if (prev.includes(region)) return prev.filter((r) => r !== region);
      if (prev.length >= MAX_REGIONS) return prev;
      return [...prev, region];
    });
  }

  if (status === "loading" || profile === undefined) return null;

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
          <p className="mb-3 text-sm text-ink-700">아직 모심시터로 등록하지 않으셨어요.</p>
          <Link
            href="/mypage/sitter/register"
            className="inline-block rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
          >
            모심시터 등록하기
          </Link>
        </div>
      </MyPageShell>
    );
  }

  return (
    <MyPageShell>
      <h2 className="mb-1 text-xl font-bold text-ink-900">프로필 관리</h2>
      <p className="mb-6 text-sm text-ink-500">시설·업체에게 보여지는 내 프로필이에요.</p>

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
            {profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoUrl}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                <User size={22} />
              </span>
            )}
            <div>
              <p className="font-bold text-ink-900">{profile.nickname}</p>
              <p className="text-xs text-ink-300">
                {profile.nationality} · 경력 {profile.experienceYears}년
              </p>
            </div>
          </div>

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
                onChange={(e) => setIntro(e.target.value)}
                rows={2}
                placeholder="한 줄 소개"
                className="w-full resize-none rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
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
              className="flex-1 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            />
            <input
              value={certIssuer}
              onChange={(e) => setCertIssuer(e.target.value)}
              placeholder="발급기관"
              className="w-24 rounded-xl border border-ink-100 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
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
            <h3 className="font-bold text-ink-900">정산 계좌</h3>
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
              {profile.bankName} {profile.bankAccountNumber} ({profile.bankAccountHolder})
            </p>
          ) : (
            <p className="text-sm text-ink-300">등록된 계좌가 없어요.</p>
          )}
        </section>
      </div>
    </MyPageShell>
  );
}
