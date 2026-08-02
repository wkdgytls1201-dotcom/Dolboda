"use client";

import { useState } from "react";

// 입점 신청 폼. 이 페이지에서 유일한 클라이언트 컴포넌트다 —
// 나머지 본문은 전부 서버에서 그려서 검색엔진·AI 크롤러가 그대로 읽는다.
//
// 받는 항목을 일부러 적게 뒀다. 서류·계좌·상세 시설정보는 확인 전화를 마친 뒤에 받는다.
// 처음부터 다 요구하면 신청이 뚝 떨어지고, 아직 검증도 안 된 개인정보를 우리가 떠안는다.
//
// 상품 선택은 없다 — 신청은 항상 무료 인증(free)이고, 유료 확장은 인증 뒤
// 시설 콘솔에서 안내한다(앞단에 가격표를 내밀지 않는 방침, app/business/page.tsx 주석).

const FIELD =
  "w-full rounded-xl border border-ink-100 bg-white px-3.5 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-400";
const LABEL = "mb-1.5 block text-sm font-semibold text-ink-700";

export function BusinessInquiryForm() {
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/business-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityName: data.get("facilityName"),
          registryNo: data.get("registryNo"),
          managerName: data.get("managerName"),
          managerRole: data.get("managerRole"),
          phone: data.get("phone"),
          email: data.get("email"),
          message: data.get("message"),
          plan: "free",
          agreed,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "신청을 접수하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      setDone(true);
    } catch {
      setError("네트워크 상태를 확인한 뒤 다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-card">
        <p className="mb-2 text-lg font-bold text-ink-900">신청이 접수됐어요</p>
        <p className="text-sm leading-relaxed text-ink-500">
          1영업일 안에 <strong className="font-semibold text-ink-700">시설 대표번호</strong>로
          확인 전화를 드립니다. 국민건강보험공단에 공개된 번호로만 연락드리니, 다른 번호로 오는
          연락은 돌보다가 아니에요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
      <div className="space-y-4">
        <div>
          <label className={LABEL} htmlFor="facilityName">
            시설명 <span className="text-primary-500">*</span>
          </label>
          <input
            id="facilityName"
            name="facilityName"
            required
            maxLength={60}
            className={FIELD}
            placeholder="예) 햇살요양원"
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="registryNo">
            기관기호 또는 사업자등록번호 <span className="text-primary-500">*</span>
          </label>
          <input
            id="registryNo"
            name="registryNo"
            required
            inputMode="numeric"
            maxLength={40}
            className={FIELD}
            placeholder="기관기호 11자리 또는 사업자등록번호 10자리"
          />
          {/* 둘 중 아는 쪽을 받는다 — 담당자가 기관기호를 모르는 경우가 흔하다 */}
          <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
            둘 중 아는 번호 하나만 적어주세요. 기관기호는 장기요양기관 지정서에 있는 11자리
            번호예요. 이 번호로 우리 시설 페이지를 찾아 연결해 드립니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="managerName">
              담당자 이름 <span className="text-primary-500">*</span>
            </label>
            <input
              id="managerName"
              name="managerName"
              required
              maxLength={20}
              className={FIELD}
              placeholder="예) 김돌봄"
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="managerRole">
              직책
            </label>
            <input
              id="managerRole"
              name="managerRole"
              maxLength={30}
              className={FIELD}
              placeholder="예) 사무국장"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="phone">
              연락처 <span className="text-primary-500">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              required
              type="tel"
              inputMode="tel"
              maxLength={20}
              className={FIELD}
              placeholder="010-0000-0000"
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="email">
              이메일 <span className="text-primary-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              required
              type="email"
              maxLength={100}
              className={FIELD}
              placeholder="manager@example.com"
            />
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="message">
            남기고 싶은 말
          </label>
          <textarea
            id="message"
            name="message"
            rows={3}
            maxLength={1000}
            className={`${FIELD} resize-y`}
            placeholder="궁금한 점이나 시설 상황을 알려주시면 통화 때 참고할게요."
          />
        </div>

        {/* 동의는 미리 체크하지 않는다 — 사전 체크된 동의는 명시적 동의로 인정받기 어렵다.
            (건강 정보 동의에서 세운 기준을 여기에도 그대로 적용한다) */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-ivory-100 p-3.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary-500"
          />
          <span className="text-xs leading-relaxed text-ink-500">
            <strong className="font-semibold text-ink-700">(필수)</strong> 입점 상담을 위해
            담당자 이름·직책·연락처·이메일을 수집하는 데 동의합니다. 상담 목적으로만 쓰고,
            신청이 마무리되지 않으면 6개월 뒤 파기합니다.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-primary-50 p-3 text-sm text-primary-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!agreed || sending}
          className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-300 disabled:shadow-none"
        >
          {sending ? "접수하는 중…" : "입점 신청하기"}
        </button>
      </div>
    </form>
  );
}
