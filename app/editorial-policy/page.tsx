import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

// 콘텐츠 원칙 — 가이드·지역 페이지가 "누가 어떤 기준으로 쓰는가"를 밝히는 자리(E-E-A-T).
// 가이드 바이라인의 "콘텐츠 작성·검수 원칙 보기"가 여기로 온다.
// 데이터 자체의 출처·산식은 /data-policy 소관이라 여기서는 겹치지 않게 링크만 건다.

export const metadata: Metadata = {
  title: "콘텐츠 작성·검수 원칙",
  description:
    "돌보다의 요양 가이드와 시설 정보 콘텐츠를 누가, 어떤 기준으로 만들고 언제 다시 검토하는지, 광고와 정보를 어떻게 구분하는지 안내합니다.",
  alternates: { canonical: "/editorial-policy" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "콘텐츠 작성·검수 원칙" },
      ],
    },
  ],
};

const SECTIONS: { heading: string; paragraphs: string[]; list?: string[] }[] = [
  {
    heading: "누가 만드나요",
    paragraphs: [
      "요양 가이드와 안내 콘텐츠는 돌보다 콘텐츠팀이 작성합니다. 국민건강보험공단·건강보험심사평가원의 공공데이터와 보건복지부 고시를 근거로 쓰고, 각 글에 근거자료를 표시합니다.",
      "전문가 검수를 거친 글에는 검수자의 이름과 자격을 함께 표시합니다. 검수자 표시가 없는 글은 콘텐츠팀이 공공자료를 근거로 작성한 글입니다.",
    ],
  },
  {
    heading: "작성 원칙",
    paragraphs: [
      "검색 노출을 위한 글이 아니라, 요양시설을 알아보는 보호자가 실제로 판단에 쓸 수 있는 글을 씁니다.",
    ],
    list: [
      "모든 제도·비용 설명은 공공기관 자료와 정부 고시를 근거로 합니다",
      "해마다 고시로 바뀌는 금액은 기준 연도를 함께 표시합니다",
      "근거를 대기 어려운 단정(“어디가 제일 좋다” 같은 표현)은 쓰지 않습니다",
      "특정 시설을 돈을 받고 콘텐츠 안에서 추천하지 않습니다",
    ],
  },
  {
    heading: "언제 다시 검토하나요",
    paragraphs: [
      "장기요양 수가·본인부담률 등 고시가 개정되거나 근거 데이터가 크게 바뀌면 해당 글을 다시 검토하고, 각 가이드에 최근 검토일을 표시합니다. 시설 현황 데이터는 공공데이터를 매일 동기화해 반영합니다.",
    ],
  },
  {
    heading: "광고와 정보를 구분합니다",
    paragraphs: [
      "시설이 비용을 지불하고 노출되는 자리는 항상 “광고” 표시를 붙여 일반 목록과 구분하고, 지역당 소수 슬롯으로 제한합니다.",
      "평가등급, 안심지수, 이용자 후기 같은 신뢰 데이터는 광고 여부와 무관하게 같은 기준으로 계산되며, 비용을 받고 바꾸지 않습니다.",
    ],
  },
  {
    heading: "오류를 발견하셨다면",
    paragraphs: [
      "시설 정보나 가이드 내용에서 오류를 발견하시면 알려주세요. 확인 후 바로잡습니다. 데이터의 출처와 정정 요청 방법은 데이터 출처 페이지에 안내되어 있습니다.",
    ],
  },
];

export default function EditorialPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />

      <h1 className="mb-3 break-keep text-2xl font-bold leading-snug text-ink-900">
        콘텐츠 작성·검수 원칙
      </h1>
      <p className="mb-9 break-keep text-[16px] leading-[1.8] text-ink-700">
        돌보다의 가이드와 안내 콘텐츠를 누가, 어떤 기준으로 만들고 언제 다시 검토하는지
        밝힙니다.
      </p>

      <div className="space-y-9">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="mb-3 break-keep text-lg font-bold text-ink-900">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 20)} className="mb-3 break-keep text-[15px] leading-[1.8] text-ink-700">
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="space-y-2 rounded-2xl border border-ink-100/60 bg-white p-4">
                {s.list.map((item) => (
                  <li key={item} className="flex gap-2 break-keep text-[14px] leading-[1.7] text-ink-700">
                    <span aria-hidden className="mt-[2px] shrink-0 font-bold text-primary-500">
                      ·
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-2">
        <Link
          href="/data-policy"
          className="flex min-h-[48px] items-center justify-between rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
        >
          데이터 출처와 안심지수 계산 방식
          <span aria-hidden className="text-ink-300">›</span>
        </Link>
        <Link
          href="/guide"
          className="flex min-h-[48px] items-center justify-between rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
        >
          요양 가이드 보러 가기
          <span aria-hidden className="text-ink-300">›</span>
        </Link>
      </div>
    </main>
  );
}
