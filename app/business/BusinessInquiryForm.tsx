"use client";

import { useState } from "react";

// 입점 신청 폼 (/business/apply 전용).
//
// 받는 항목을 일부러 적게 뒀다. 서류·계좌·상세 시설정보는 접수 뒤 이메일 안내 단계에서
// 받는다. 처음부터 다 요구하면 신청이 뚝 떨어지고, 아직 검증도 안 된 개인정보를 떠안는다.
//
// 절차에 전화는 없다(운영 방침) — 모든 후속 안내는 이메일로 나간다.
//
// 상품 선택도 없다 — 신청은 항상 무료 인증(free)이고, 유료 확장은 인증 뒤
// 기업회원 콘솔에서 안내한다(앞단에 가격표를 내밀지 않는 방침, app/business/page.tsx 주석).

const FIELD =
  "w-full rounded-xl border border-ink-100 bg-white px-3.5 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-400";
const LABEL = "mb-1.5 block text-sm font-semibold text-ink-700";

// 서버(app/api/business-inquiry/route.ts)와 같은 규칙을 클라이언트에도 둔다.
//
// 왜 필요한가: 그 API는 IP당 **시간당 5회** 상한이 있고, **검증에 실패한 요청도 함께 센다.**
// 클라이언트 검증이 없던 동안에는 오타 한 번이 그 5회를 하나씩 깎아서, 다섯 번 틀리면
// 한 시간 잠겼다. 기관기호(11자리)는 사업자등록번호(10자리)와 헷갈리기 쉬운 값이라
// 시설 담당자가 몇 번 틀리는 게 정상이다 — 첫 유료 고객이 신청 도중 잠기면 손해가 크다.
//
// ⚠️ 서버 검증을 대체하는 게 아니다. 서버는 그대로 두고(우회 가능한 건 클라이언트뿐),
//    여기서는 왕복 없이 즉시 알려주는 역할만 한다.
const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 통과하면 null, 아니면 사용자에게 보여줄 메시지. 서버 메시지와 문구를 맞춘다. */
function validate(v: {
  facilityName: string;
  registryNo: string;
  managerName: string;
  phone: string;
  email: string;
  agreed: boolean;
}): string | null {
  if (!v.facilityName || !v.registryNo || !v.managerName || !v.phone || !v.email) {
    return "필수 항목을 모두 입력해주세요.";
  }
  // 서버의 normalizeRegistryNo와 같은 판단 — 숫자만 남겨 10자리(사업자등록번호)
  // 또는 11자리(기관기호)여야 한다. 하이픈·공백은 여기서도 무시한다.
  const digits = v.registryNo.replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 11) {
    return "기관기호(11자리) 또는 사업자등록번호(10자리)를 확인해주세요.";
  }
  if (!PHONE_RE.test(v.phone.replace(/\s/g, ""))) {
    return "연락처 형식을 확인해주세요. (예: 010-1234-5678)";
  }
  if (!EMAIL_RE.test(v.email)) return "이메일 형식을 확인해주세요.";
  if (!v.agreed) return "개인정보 수집·이용 동의가 필요해요.";
  return null;
}

export function BusinessInquiryForm() {
  const [agreed, setAgreed] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);

    const data = new FormData(e.currentTarget);
    const str = (k: string) => String(data.get(k) ?? "").trim();

    // 서버로 보내기 전에 먼저 거른다 — 오타가 시간당 5회 한도를 깎지 않게(위 주석 참고).
    const invalid = validate({
      facilityName: str("facilityName"),
      registryNo: str("registryNo"),
      managerName: str("managerName"),
      phone: str("phone"),
      email: str("email"),
      agreed,
    });
    if (invalid) {
      setError(invalid);
      return;
    }

    setSending(true);
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
          marketingConsent: marketing,
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
          1영업일 안에 입력하신 <strong className="font-semibold text-ink-700">이메일</strong>로
          서류 확인과 계정 연결 절차를 안내드립니다. 전화는 드리지 않으니 메일함(스팸함 포함)을
          확인해 주세요.
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
            <p className="mt-1.5 text-xs text-ink-300">
              모든 안내가 이 주소로 나가요. 자주 확인하는 주소를 적어주세요.
            </p>
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
            placeholder="궁금한 점이나 시설 상황을 알려주시면 안내 때 참고할게요."
          />
        </div>

        {/* ---- 동의 ---- */}
        {/* 미리 체크하지 않는다 — 사전 체크된 동의는 명시적 동의로 인정받기 어렵다
            (건강 정보 동의에서 세운 기준을 그대로 적용) */}
        <div className="space-y-2.5">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-ivory-100 p-3.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary-500"
            />
            <span className="text-xs leading-relaxed text-ink-500">
              <strong className="font-semibold text-ink-700">(필수)</strong> 개인정보 수집·이용에
              동의합니다. <span className="text-ink-300">자세한 내용은 아래 안내를 확인해 주세요.</span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-ivory-100 p-3.5">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary-500"
            />
            <span className="text-xs leading-relaxed text-ink-500">
              <strong className="font-semibold text-ink-700">(선택)</strong> 돌보다의 기업회원
              대상 소식·혜택 안내(이메일·문자) 수신에 동의합니다. 동의하지 않아도 입점 신청과
              이용에 불이익이 없어요.
            </span>
          </label>
        </div>

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

      {/* ---- 필수 동의 상세 안내 (개인정보 수집·이용) ----
          법정 고지 4요소(항목·목적·기간·거부권)를 전부 펼쳐 적는다. 접어두지 않는 이유:
          "동의했는데 그런 내용인 줄 몰랐다"는 상황 자체를 만들지 않기 위해서다. */}
      <div className="mt-6 rounded-xl border border-ink-100 bg-ivory-100/60 p-4">
        <p className="mb-2 text-xs font-bold text-ink-700">개인정보 수집·이용 안내 (필수 동의)</p>
        <div className="space-y-2.5 text-[11px] leading-relaxed text-ink-500">
          <p>
            <strong className="font-semibold text-ink-700">1. 수집 항목</strong>
            <br />· 필수: 시설명, 기관기호 또는 사업자등록번호, 담당자 이름, 직책(입력 시),
            휴대전화번호, 이메일 주소, 남기신 문의 내용
            <br />· 인증 단계에서 별도 제출: 장기요양기관 지정서·사업자등록증·의료기관
            개설신고증명서 중 1건의 사본
          </p>
          <p>
            <strong className="font-semibold text-ink-700">2. 수집·이용 목적</strong>
            <br />· 입점 신청의 접수·확인 및 처리 결과 안내
            <br />· 시설 운영 주체 확인(사칭 방지) 및 시설 페이지와 담당자 계정의 연결
            <br />· 유료 서비스 계약 체결 시 청구·세금계산서 발행
            <br />· 신청·이용 과정의 문의 응대와 분쟁 발생 시 사실관계 확인
          </p>
          <p>
            <strong className="font-semibold text-ink-700">3. 보유·이용 기간</strong>
            <br />· 수집일로부터 <strong className="font-semibold text-ink-700">2년간</strong>{" "}
            보관 후 지체 없이 파기합니다.
            <br />· 다만 인증이 완료되어 서비스를 이용 중인 경우에는 이용 계약이 유지되는 동안
            보관하며, 계약 종료(인증 해제·탈퇴) 시점부터 2년 후 파기합니다.
            <br />· 전자상거래 등에서의 소비자 보호에 관한 법률 등 관계 법령이 별도의 보존
            기간을 정한 경우(계약·청약철회 기록 5년, 대금결제·재화 공급 기록 5년, 소비자
            불만·분쟁 처리 기록 3년)에는 그 기간 동안 해당 법령에 따라 보존합니다.
            <br />· 시설 확인용 서류 사본은 위 기간과 무관하게{" "}
            <strong className="font-semibold text-ink-700">확인 완료 즉시 파기</strong>합니다.
          </p>
          <p>
            <strong className="font-semibold text-ink-700">4. 파기 방법</strong>
            <br />· 전자적 파일은 복구할 수 없는 방법으로 영구 삭제하고, 출력물은 분쇄 또는
            소각합니다.
          </p>
          <p>
            <strong className="font-semibold text-ink-700">5. 제3자 제공</strong>
            <br />· 수집한 개인정보는 제3자에게 제공하지 않습니다. 다만 법령에 근거한 요청이
            있는 경우는 예외로 합니다.
          </p>
          <p>
            <strong className="font-semibold text-ink-700">6. 동의를 거부할 권리</strong>
            <br />· 필수 항목의 수집·이용 동의를 거부하실 수 있으나, 이 경우 입점 신청 접수가
            불가능합니다. 선택(마케팅) 동의는 거부하셔도 신청과 이용에 어떤 불이익도 없습니다.
            <br />· 동의 후에도 언제든 철회를 요청하실 수 있습니다(문의:
            wkdgytls1201@gmail.com).
          </p>
        </div>
      </div>
    </form>
  );
}
