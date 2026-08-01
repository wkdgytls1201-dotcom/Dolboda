import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, ShieldCheck, Database, HeartHandshake } from "lucide-react";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "돌보다 소개 — 정보 비대칭 없는 투명한 돌봄",
  description:
    "돌보다는 전국 요양병원·요양원·주야간보호·방문요양 시설 정보를 공공데이터 기반으로 정리해 보호자가 비교할 수 있게 돕는 서비스입니다. 운영 주체와 연락처, 서비스 원칙을 안내합니다.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    icon: Database,
    title: "공공데이터를 원본 그대로",
    desc: "국민건강보험공단·건강보험심사평가원이 공개한 자료를 가공 없이 보여드립니다. 없는 값은 비워두고 '아직 공개되지 않았어요'라고 밝힙니다. 추정치를 만들어 채우지 않습니다.",
  },
  {
    icon: ShieldCheck,
    title: "이상한 값은 숫자로 보여주지 않습니다",
    desc: "원본에 '1일 1원' 같은 값이 섞여 있으면 그대로 노출하지 않고 '시설 문의 필요'로 표시합니다. 잘못된 숫자가 결정을 좌우하면 안 되기 때문입니다.",
  },
  {
    icon: HeartHandshake,
    title: "광고비로 순위를 바꾸지 않습니다",
    desc: "검색 결과와 안심지수는 공개 데이터로만 계산합니다. 추천 영역에 노출되는 시설이 생기면 '추천'임을 명확히 표시합니다.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "돌보다",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        "전국 요양병원·요양시설 정보를 공공데이터 기반으로 비교하는 서비스",
      email: "wkdgytls1201@gmail.com",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "wkdgytls1201@gmail.com",
        availableLanguage: "Korean",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "돌보다 소개" },
      ],
    },
  ],
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="mb-3 text-2xl font-bold leading-snug text-ink-900">
        정보 비대칭 없는
        <br />
        투명한 돌봄을 만듭니다
      </h1>
      <p className="mb-8 text-[16px] leading-[1.8] text-ink-700">
        부모님을 모실 요양시설을 알아보는 일은 대부분 갑자기 시작됩니다. 정보는 여러 기관에 흩어져
        있고, 평가등급이 무엇을 뜻하는지, 한 달에 얼마가 드는지 알기 어렵습니다. 돌보다는 공개된
        자료를 한자리에 모아 <strong className="font-bold text-ink-900">비교할 수 있게</strong>{" "}
        만드는 일을 합니다.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">우리가 지키는 원칙</h2>
        <div className="space-y-3">
          {PRINCIPLES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-white p-5 shadow-card">
              <p className="mb-2 flex items-center gap-2 text-[15px] font-bold text-ink-900">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Icon size={16} />
                </span>
                {title}
              </p>
              <p className="text-[15px] leading-[1.75] text-ink-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">서비스 범위</h2>
        <ul className="space-y-2.5 rounded-2xl bg-white p-5 shadow-card">
          {[
            "전국 요양병원·요양원·주야간보호·방문요양 시설 검색과 비교",
            "평가등급·인력현황·비급여비용·프로그램 등 공개 정보 제공",
            "월 실부담 시뮬레이터와 장기요양등급 예상 테스트",
            "보호자와 돌봄 인력(돌보다 매니저)을 잇는 돌봄 요청 매칭",
          ].map((t) => (
            <li key={t} className="flex gap-2.5 text-[15px] leading-[1.75] text-ink-700">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary-400" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-2xl bg-ink-100/40 p-4 text-[13px] leading-relaxed text-ink-500">
          돌보다는 요양시설을 직접 운영하거나 입소를 알선하지 않습니다. 시설 정보는 참고용이며,
          실제 계약과 비용은 반드시 해당 시설에 확인해 주세요.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">운영 정보</h2>
        <dl className="divide-y divide-ink-100 rounded-2xl bg-white px-5 shadow-card">
          {[
            ["서비스명", "돌보다 (Dolboda)"],
            ["운영자", "장성권"],
            ["개인정보 보호책임자", "장성권"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3.5">
              <dt className="shrink-0 text-sm text-ink-500">{k}</dt>
              <dd className="text-right text-sm font-semibold text-ink-900">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href="mailto:wkdgytls1201@gmail.com"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-ink-700 shadow-card transition-transform hover:-translate-y-0.5"
          >
            <Mail size={16} className="text-primary-500" />
            이메일 문의
          </a>
          <a
            href="tel:010-2222-9943"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-ink-700 shadow-card transition-transform hover:-translate-y-0.5"
          >
            <Phone size={16} className="text-mint-600" />
            010-2222-9943
          </a>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-300">
          시설 정보 정정 요청, 제휴·광고 문의, 서비스 오류 신고 모두 위 연락처로 받고 있어요.
          시설 관계자분이 정보 수정을 요청하시는 경우 기관명과 함께 알려주시면 확인 후
          반영해 드립니다.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          href="/data-policy"
          className="flex min-h-[52px] items-center justify-center rounded-2xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-transform hover:-translate-y-0.5"
        >
          데이터 출처·안심지수 계산 방식
        </Link>
        <Link
          href="/guide"
          className="flex min-h-[52px] items-center justify-center rounded-2xl border border-ink-100 bg-white text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
        >
          요양 가이드 보기
        </Link>
      </div>
    </main>
  );
}
