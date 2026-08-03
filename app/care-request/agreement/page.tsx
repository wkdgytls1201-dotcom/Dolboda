"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FileSignature, Printer, ShieldCheck, Check, AlertTriangle, ChevronDown } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { SignaturePad } from "@/components/SignaturePad";
import { agreementDocNo, type AgreementContent } from "@/lib/careAgreement";

interface AgreementRow {
  id: string;
  content: AgreementContent;
  contentHash: string;
  guardianName: string | null;
  guardianSignature: string | null;
  guardianSignedAt: string | null;
  guardianEmail: string | null;
  sitterName: string | null;
  sitterSignature: string | null;
  sitterSignedAt: string | null;
  sitterEmail: string | null;
  copySentAt: string | null;
  createdAt: string;
}

interface ApiResponse {
  agreement: AgreementRow | null;
  draft?: AgreementContent;
  viewer: "guardian" | "sitter";
  hashValid?: boolean;
  error?: string;
}

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CareAgreementPage() {
  const { status } = useSession();
  const [data, setData] = useState<ApiResponse | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/care-agreement")
      .then((r) => r.json())
      .then((d) => setData(d.error ? null : d))
      .catch(() => setData(null));
  }, [status]);

  async function sign() {
    if (!name.trim()) {
      setError("서명할 이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/care-agreement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), signature }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "");
      setData((prev) => (prev ? { ...prev, agreement: d.agreement, draft: undefined } : prev));
    } catch (e) {
      setError((e instanceof Error && e.message) || "서명하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || data === undefined) return <PageLoader />;

  if (status !== "authenticated") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm text-ink-500">합의서는 로그인 후 확인할 수 있어요.</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">아직 합의서를 만들 수 없어요</h1>
        <p className="mb-6 text-sm leading-relaxed text-ink-500">
          매칭이 확정된 뒤에 합의서를 작성할 수 있어요.
        </p>
        <Link
          href="/care-request"
          className="inline-flex min-h-[48px] items-center rounded-xl bg-primary-500 px-5 text-sm font-bold text-white"
        >
          내 돌봄 요청 보기
        </Link>
      </main>
    );
  }

  const content = data.agreement?.content ?? data.draft!;
  const isGuardian = data.viewer === "guardian";
  const mySigned = data.agreement
    ? isGuardian
      ? data.agreement.guardianSignedAt
      : data.agreement.sitterSignedAt
    : null;
  const bothSigned = Boolean(
    data.agreement?.guardianSignedAt && data.agreement?.sitterSignedAt
  );
  const docNo = data.agreement
    ? agreementDocNo(data.agreement.id, data.agreement.createdAt)
    : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-24">
      {/* 인쇄 시에는 서명 입력 영역과 버튼을 감춘다 — 종이에는 문서만 남아야 한다 */}
      <style>{`@media print { .no-print { display: none !important; } main { padding: 0 !important; } }`}</style>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900">
            <FileSignature size={24} className="text-royal-500" />
            돌봄 합의서
          </h1>
          <p className="mt-1 text-xs text-ink-300">
            {docNo ? `문서번호 ${docNo} · ` : ""}양식 v{content.version}
          </p>
        </div>
        {bothSigned && (
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-ink-100 px-3.5 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
          >
            <Printer size={15} />
            인쇄
          </button>
        )}
      </div>

      {/* 돌보다의 위치를 문서 맨 앞에 분명히 밝힌다.
          긴 문단이 서명 화면 위를 덮고 있어 접어두되, **핵심 한 줄은 접힌 상태에서도
          보이게** 남긴다 — 이건 "돌보다는 당사자가 아니다"라는 법적 포지션 고지라
          통째로 감추면 고지 자체가 약해진다(docs/care-agreement-spec.md §1).
          상태 관리 없이 <details>로 만들어 JS 없이도 열린다. */}
      <details className="group mb-6 rounded-2xl bg-ink-100/40">
        <summary className="flex cursor-pointer list-none items-start gap-2.5 p-4 [&::-webkit-details-marker]:hidden">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-ink-300" />
          <span className="flex-1 text-xs leading-relaxed text-ink-500">
            이 합의는{" "}
            <strong className="text-ink-700">보호자와 돌보다 매니저 두 분 사이의 합의</strong>
            예요. 돌보다는 합의의 당사자가 아니에요.
            <span className="mt-0.5 block font-semibold text-ink-400 group-open:hidden">
              자세히 보기
            </span>
          </span>
          <ChevronDown
            size={15}
            className="mt-0.5 shrink-0 text-ink-300 transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <p className="px-4 pb-4 pl-[42px] text-xs leading-relaxed text-ink-500">
          돌보다는 표준 양식을 제공하고 서명 사실을 기록·보관할 뿐 사례비 결정이나 지급,
          돌봄 이행에 관여하지 않아요. 상대방의 신원·자격도 보증하지 않으니, 서명 전에 두
          분이 직접 확인해주세요. 자세한 내용은 제1조·제2조에 있어요.
        </p>
      </details>

      {data.hashValid === false && (
        <div className="mb-6 flex gap-2.5 rounded-2xl border border-accent-300 bg-accent-50 p-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent-600" />
          <p className="text-xs leading-relaxed text-ink-700">
            저장된 내용과 서명 당시의 지문이 일치하지 않아요. 고객센터로 알려주세요.
          </p>
        </div>
      )}

      {/* 당사자 */}
      <section className="mb-5 rounded-2xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-900">당사자</h2>
        <dl className="divide-y divide-ink-100 text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-ink-500">보호자</dt>
            <dd className="font-medium text-ink-900">{content.parties.guardian.name}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-ink-500">돌보다 매니저</dt>
            <dd className="font-medium text-ink-900">
              {content.parties.sitter.name}
              {content.parties.sitter.note && (
                <span className="ml-1.5 text-xs text-ink-400">{content.parties.sitter.note}</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* 합의 내용 요약 */}
      <section className="mb-5 rounded-2xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-900">합의 내용</h2>
        <dl className="divide-y divide-ink-100 text-sm">
          {[
            ["돌봄 유형", content.terms.locationType],
            ["기간", `${content.terms.startDate} ~ ${content.terms.endDate}`],
            ["시간", content.terms.timeRange],
            [
              "장소",
              `${content.terms.region}${content.terms.locationNote ? ` · ${content.terms.locationNote}` : ""}`,
            ],
            ["돌봄 받으실 분", content.terms.recipient],
            [
              "사례비",
              content.terms.payAmount != null
                ? `${content.terms.payUnit === "시간" ? "시간당" : "1일"} ${content.terms.payAmount.toLocaleString()}원`
                : "두 분이 별도로 정함",
            ],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="shrink-0 text-ink-500">{k}</dt>
              <dd className="text-right font-medium text-ink-900">{v}</dd>
            </div>
          ))}
        </dl>
        {content.terms.duties.length > 0 && (
          <div className="mt-3 border-t border-ink-100 pt-3">
            <p className="mb-1.5 text-xs font-bold text-ink-500">업무 범위</p>
            <div className="flex flex-wrap gap-1.5">
              {content.terms.duties.map((d) => (
                <span key={d} className="rounded-full bg-mint-100 px-2.5 py-1 text-xs font-medium text-mint-700">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 조항 */}
      <section className="mb-5 rounded-2xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-900">합의 조항</h2>
        <ol className="space-y-3.5">
          {content.clauses.map((c) => (
            <li key={c.title}>
              <p className="text-[13px] font-bold text-ink-900">{c.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{c.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 서명란 */}
      <section className="mb-5 rounded-2xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-900">서명</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["guardian", "sitter"] as const).map((side) => {
            const label = side === "guardian" ? "보호자" : "돌보다 매니저";
            const signedName = side === "guardian" ? data.agreement?.guardianName : data.agreement?.sitterName;
            const signedAt = side === "guardian" ? data.agreement?.guardianSignedAt : data.agreement?.sitterSignedAt;
            const img = side === "guardian" ? data.agreement?.guardianSignature : data.agreement?.sitterSignature;
            return (
              <div key={side} className="rounded-xl border border-ink-100 p-3.5">
                <p className="mb-2 text-xs font-bold text-ink-500">{label}</p>
                {signedAt ? (
                  <>
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={`${label} 서명`} className="h-16 w-full object-contain" />
                    ) : (
                      <p className="flex h-16 items-center text-lg font-bold text-ink-900">{signedName}</p>
                    )}
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-mint-700">
                      <Check size={11} />
                      {signedName} · {formatDateTime(signedAt)}
                    </p>
                  </>
                ) : (
                  <p className="flex h-16 items-center text-sm text-ink-300">서명 대기 중</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 내 서명 입력 */}
      {!mySigned && (
        <section className="no-print mb-5 rounded-2xl border-2 border-royal-200 bg-royal-50/40 p-5">
          <h2 className="mb-1 text-sm font-bold text-ink-900">
            {isGuardian ? "보호자" : "돌보다 매니저"}로 서명하기
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-ink-500">
            위 내용을 확인하고 동의하시면 이름을 적고 서명해주세요. 서명하면 이 시점의 내용이
            그대로 봉인되어 나중에 바뀌지 않아요.
          </p>
          <label className="mb-1.5 block text-xs font-bold text-ink-700">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="본인 이름"
            className="mb-4 h-12 w-full rounded-xl border border-ink-100 px-3.5 text-base focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 sm:text-sm"
          />
          <label className="mb-1.5 block text-xs font-bold text-ink-700">
            서명 <span className="font-normal text-ink-300">(선택 — 안 그려도 이름으로 서명됩니다)</span>
          </label>
          <SignaturePad onChange={setSignature} disabled={submitting} />

          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-primary-50 px-4 py-3 text-[13px] font-semibold text-primary-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={sign}
            disabled={submitting}
            className="mt-4 min-h-[52px] w-full rounded-xl bg-primary-500 text-base font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? "서명 중..." : "동의하고 서명하기"}
          </button>
        </section>
      )}

      {mySigned && !bothSigned && (
        <p className="no-print mb-5 rounded-2xl bg-ivory-100 p-4 text-center text-sm text-ink-500">
          서명을 마쳤어요. 상대방이 서명하면 합의서가 완성돼요.
        </p>
      )}

      {bothSigned && data.agreement && (
        <div className="rounded-2xl border border-mint-200 bg-mint-50 p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-mint-700">
            <Check size={15} />
            두 분 모두 서명을 마쳤어요
          </p>
          <p className="mb-2.5 text-xs leading-relaxed text-ink-600">
            {data.agreement.copySentAt
              ? "가입하신 이메일로 사본을 보내드렸어요. 메일에서 원본을 열어 인쇄하면 PDF로 저장할 수 있어요."
              : "위 인쇄 버튼으로 원본을 열어 'PDF로 저장'을 고르면 파일로 보관하실 수 있어요."}
          </p>
          {/* 문서 지문 — 나중에 이 값으로 위변조를 확인할 수 있다 */}
          <p className="break-all text-[11px] leading-relaxed text-ink-400">
            문서 지문(SHA-256): {data.agreement.contentHash}
          </p>
        </div>
      )}
    </main>
  );
}
