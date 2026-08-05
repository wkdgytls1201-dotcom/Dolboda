import type { Metadata } from "next";
import Link from "next/link";
import { BusinessInquiryForm } from "../BusinessInquiryForm";

// 입점 신청 전용 페이지.
//
// /business 본문에 폼을 심지 않고 따로 뺀 이유(사용자 결정): 신청에는 개인정보·마케팅
// 동의가 따라붙는데, 소개 페이지 한복판에 동의 문서까지 펼치면 소개도 신청도 다 무거워진다.
// 소개는 소개대로 가볍게, 신청은 이 페이지에서 동의까지 한 호흡으로 받는다.
//
// 얇은 폼 페이지라 색인 대상이 아니다 — /business가 검색을 받는 입구다.
export const metadata: Metadata = {
  title: "시설 입점 신청",
  robots: { index: false, follow: true },
};

export default function BusinessApplyPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8 pb-20">
      <nav aria-label="현재 위치" className="mb-3 text-xs text-ink-300">
        <Link href="/business" className="inline-block py-2 hover:text-ink-500">
          기업회원 안내
        </Link>
        <span className="mx-1">›</span>
        <span className="text-ink-500">입점 신청</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-ink-900">시설 입점 신청</h1>
      <p className="mb-6 text-sm leading-relaxed text-ink-500">
        아래 정보를 남겨주시면 1영업일 안에 입력하신 이메일로 다음 절차(서류 확인·계정 연결)를
        안내드립니다. 전화는 드리지 않으니 메일함만 확인해 주세요.
      </p>

      <BusinessInquiryForm />
    </main>
  );
}
