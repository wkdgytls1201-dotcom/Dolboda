import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Database,
  HeartHandshake,
  Mail,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import { SITE_URL, OG_IMAGE, SITE_NAME } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

const ONE_LINER =
  "돌보다는 정보 비대칭으로 생기는 돌봄 공백을 해결하고, 보호자가 신뢰할 수 있는 요양시설과 돌봄 서비스를 투명하게 비교·선택할 수 있도록 돕는 에이지테크(AgeTech) 플랫폼입니다.";

export const metadata: Metadata = {
  title: "돌보다 소개 — 돌봄 정보 격차를 없애는 에이지테크 플랫폼",
  description: ONE_LINER,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `${SITE_NAME} 소개`,
    description: ONE_LINER,
    url: `${SITE_URL}/about`,
    type: "website",
    images: [OG_IMAGE],
  },
};

// 돌봄의 전 과정 — 지금 되는 것과 앞으로 만들 것을 배지로 구분한다.
// "없는 것을 있는 것처럼 보여주지 않는다"는 프로젝트 원칙을 소개 페이지에서도 지킨다.
const JOURNEY = [
  {
    icon: Search,
    step: "찾는다",
    status: "제공 중",
    desc: "전국 요양병원·요양원·주야간보호·방문요양의 위치·비용·인력 현황·평가 정보를 한자리에서 비교합니다.",
  },
  {
    icon: HeartHandshake,
    step: "연결한다",
    status: "제공 중",
    desc: "집에서 모시기로 했다면, 돌봄이 필요한 조건을 남기고 돌보다 매니저의 지원을 받아 직접 정하실 수 있습니다.",
  },
  {
    icon: Activity,
    step: "이어서 돌본다",
    status: "준비 중",
    desc: "시설을 정한 뒤에도 끝이 아닙니다. 어르신의 건강과 일상을 이어서 살피는 기능을 만들어가고 있습니다.",
  },
];

const PRINCIPLES = [
  {
    icon: Database,
    title: "공공데이터를 왜곡하지 않습니다",
    // "가공 없이 그대로"라고 쓰면 사실과 다르다 — 우리는 실제로 정제·표준화하고,
    // 안심지수는 미공개 항목을 전국 평균으로 보정해 계산한다. 원칙은 "손대지 않는다"가
    // 아니라 "무엇을 어떻게 손댔는지 밝힌다"여야 한다.
    desc: "국민건강보험공단·건강보험심사평가원이 공개한 자료를 임의로 바꾸지 않고, 보호자가 비교할 수 있도록 정제·표준화해 보여드립니다. 없는 값은 비워두고 '아직 공개되지 않았어요'라고 밝히며, 안심지수처럼 계산이 들어가는 지표는 사용 데이터·평가 영역·산출 원칙을 투명하게 공개합니다.",
  },
  {
    icon: ShieldCheck,
    title: "이상한 값은 숫자로 보여주지 않습니다",
    desc: "원본에 '1일 1원' 같은 값이 섞여 있으면 그대로 노출하지 않고 '시설 문의 필요'로 표시합니다. 잘못된 숫자가 결정을 좌우하면 안 되기 때문입니다.",
  },
  {
    icon: HeartHandshake,
    // 기업회원용 광고 상품(/business)과 앞뒤가 맞아야 하는 문장.
    // 단정형 약속("~하지 않습니다")보다, 어떻게 운영되는지의 사실 서술로 쓴다.
    title: "광고와 정보를 구분해 보여드립니다",
    desc: "일반 목록의 순서는 거리·평가등급·안심지수 기준으로 매겨지고, 시설이 구매하는 스폰서 노출은 분리된 자리에 '광고'로 표시합니다. 안심지수는 공개 데이터로만 계산하며 산출 원칙을 투명하게 공개합니다.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "돌보다",
      alternateName: "Dolboda",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      slogan: "기술로 더 나은 노후와 돌봄의 기준을 만듭니다",
      description: ONE_LINER,
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
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />

      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5 text-[12px] font-bold text-primary-700">
        <ShieldCheck size={13} />
        에이지테크 · 시니어 케어 플랫폼
      </span>
      <h1 className="mb-4 text-[26px] font-extrabold leading-snug text-ink-900 sm:text-3xl">
        정보 비대칭 없는
        <br />
        투명한 돌봄을 만듭니다
      </h1>
      <p className="mb-10 text-[16px] leading-[1.85] text-ink-700">
        돌보다는{" "}
        <strong className="font-bold text-ink-900">고령화 시대의 돌봄 정보 격차를 해소하는</strong>{" "}
        시니어 케어 플랫폼입니다. 흩어져 있는 요양시설 정보를 한자리에 모아, 보호자가 스스로
        비교하고 판단할 수 있게 합니다.
      </p>

      {/* 문제 정의 — 왜 이 서비스가 필요한지부터 말한다 */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">왜 만들었나요</h2>
        <div className="space-y-3 text-[15px] leading-[1.85] text-ink-600">
          <p>
            대한민국은 이미 초고령사회에 들어섰지만, 가족이 부모님의 돌봄을 준비하는 과정은
            여전히 막막합니다. 대부분 준비할 겨를도 없이 갑자기 시작되고요.
          </p>
          <p>
            어떤 요양시설이 좋은지, 비용은 적절한지, 실제 돌봄 환경은 어떤지 확인할 수 있는
            정보는 부족하고 복잡하게 흩어져 있습니다. 시설마다 안내하는 기준이 다르고, 서비스
            품질이나 비용을 객관적으로 견주기도 쉽지 않습니다.
          </p>
          <p className="font-semibold text-ink-800">
            돌보다는 이 돌봄 시장의 정보 비대칭을 해소하고, 보호자의 합리적인 의사결정을 돕기
            위해 만들어졌습니다.
          </p>
        </div>
      </section>

      {/* 돌봄의 전 과정 — 현재 제공과 준비 중을 배지로 구분해서 과장 없이 */}
      <section className="mb-10">
        <h2 className="mb-1 text-lg font-bold text-ink-900">돌봄의 전 과정을 하나로</h2>
        <p className="mb-4 text-sm leading-relaxed text-ink-500">
          돌봄이 필요한 순간부터 시설을 찾고, 돌봄 인력을 연결하고, 일상을 이어서 살피는 일까지
          하나의 흐름으로 잇는 것이 돌보다가 그리는 모습입니다.
        </p>
        <ol className="relative space-y-3 border-l-2 border-primary-100 pl-6">
          {JOURNEY.map(({ icon: Icon, step, status, desc }, i) => {
            const ready = status === "제공 중";
            return (
              <li key={step} className="relative">
                <span
                  className={`absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full text-white ${
                    ready ? "bg-primary-500" : "bg-ink-200"
                  }`}
                >
                  <Icon size={13} />
                </span>
                <div className="rounded-2xl bg-white p-4 shadow-card">
                  <p className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[15px] font-bold text-ink-900">
                      {i + 1}. {step}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        ready ? "bg-mint-100 text-mint-700" : "bg-ink-100 text-ink-400"
                      }`}
                    >
                      {status}
                    </span>
                  </p>
                  <p className="text-[14px] leading-[1.75] text-ink-500">{desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 지향점 — 소개 페이지에서 가장 오래 읽히는 자리라 본문보다 한 단계 크게 */}
      <section className="mb-10 rounded-3xl bg-gradient-to-br from-primary-500 to-peach-500 p-7 text-center shadow-soft">
        <p className="mb-4 space-y-1 text-[15px] font-semibold leading-[1.9] text-white/90">
          <span className="block">정보 부족으로 좋은 돌봄의 기회를 놓치는 사람이 없도록,</span>
          <span className="block">보호자는 더 안심하고 선택할 수 있도록,</span>
          <span className="block">돌봄 제공자는 더 투명하게 신뢰받을 수 있도록.</span>
        </p>
        <p className="text-[17px] font-extrabold leading-snug text-white">
          돌보다는 기술로
          <br />더 나은 노후와 돌봄의 기준을 만들어갑니다
        </p>
      </section>

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

        {/* 두 버튼이 나란히 있는데 왼쪽은 "이메일 문의"라는 이름만, 오른쪽은 번호만 있어서
            텍스트로 읽으면 "이메일 문의 010-2222-9943"으로 붙어 전화번호가 이메일 주소처럼
            읽혔다(검색엔진·AI 크롤러가 실제로 그렇게 뽑아갔다). 각 버튼에 무엇인지와 값을
            함께 적어 그 자체로 뜻이 닫히게 한다. */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href="mailto:wkdgytls1201@gmail.com"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-ink-700 shadow-card transition-transform duration-150 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Mail size={16} className="shrink-0 text-primary-500" />
            <span className="min-w-0">
              <span className="block text-[11px] leading-tight text-ink-300">이메일 문의</span>
              <span className="block truncate text-sm font-bold">wkdgytls1201@gmail.com</span>
            </span>
          </a>
          <a
            href="tel:010-2222-9943"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-ink-700 shadow-card transition-transform duration-150 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Phone size={16} className="shrink-0 text-mint-600" />
            <span className="min-w-0">
              <span className="block text-[11px] leading-tight text-ink-300">전화 문의</span>
              <span className="block truncate text-sm font-bold">010-2222-9943</span>
            </span>
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
          className="flex min-h-[52px] items-center justify-center rounded-2xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-transform duration-150 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          데이터 출처·안심지수 계산 방식
        </Link>
        <Link
          href="/guide"
          className="flex min-h-[52px] items-center justify-center rounded-2xl border border-ink-100 bg-white text-sm font-bold text-ink-700 transition-colors duration-150 hover:bg-ink-100 active:scale-[0.98]"
        >
          요양 가이드 보기
        </Link>
      </div>
    </main>
  );
}
