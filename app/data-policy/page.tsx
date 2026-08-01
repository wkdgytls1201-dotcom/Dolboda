import type { Metadata } from "next";
import Link from "next/link";
import { SCORE_AREAS } from "@/lib/dolbodaScore";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "데이터 출처와 안심지수 계산 방식",
  description:
    "돌보다가 사용하는 공공데이터의 출처와 갱신 주기, 돌보다 AI기반 안심지수의 영역별 가중치와 계산식, 데이터가 없을 때의 처리 원칙, 오류 정정 요청 방법을 공개합니다.",
  alternates: { canonical: "/data-policy" },
};

const SOURCES = [
  {
    name: "국민건강보험공단 장기요양기관 내역",
    covers: "요양원·주야간보호·방문요양 기본정보, 정원·현원·대기자",
    cycle: "분기 단위 공개 → 갱신 시 반영",
  },
  {
    name: "국민건강보험공단 장기요양기관 상세정보",
    covers: "인력현황·근속현황·시설현황·프로그램 운영·비급여비용·치매전담실",
    cycle: "연 단위 공개 → 갱신 시 반영",
  },
  {
    name: "국민건강보험공단 장기요양기관 평가 결과",
    covers: "평가등급(A~E)과 영역별 세부점수",
    cycle: "정기평가 주기(약 2~3년)",
  },
  {
    name: "건강보험심사평가원 병원정보서비스",
    covers: "요양병원 기본정보·적정성 평가등급·의사/간호 인력등급·진료과목·의료장비",
    cycle: "월 단위 API 조회",
  },
  {
    name: "보건복지부 장기요양급여 비용 고시",
    covers: "월 한도액, 급여 수가, 본인부담률 (시뮬레이터 계산 기준)",
    cycle: "연 1회 개정 → 개정 시 반영",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "데이터 출처와 안심지수" },
      ],
    },
  ],
};

export default function DataPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="mb-3 text-2xl font-bold leading-snug text-ink-900">
        데이터 출처와 안심지수 계산 방식
      </h1>
      <p className="mb-9 text-[16px] leading-[1.8] text-ink-700">
        돌보다에 표시되는 모든 숫자는 공공기관이 공개한 자료에서 옵니다. 어떤 자료를 쓰는지, 안심지수를
        어떻게 계산하는지, 데이터가 없을 때 무엇을 하는지 전부 공개합니다.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">1. 데이터 출처와 갱신 주기</h2>
        <div className="space-y-2.5">
          {SOURCES.map((s) => (
            <div key={s.name} className="rounded-2xl bg-white p-4 shadow-card">
              <p className="mb-1 text-[15px] font-bold text-ink-900">{s.name}</p>
              <p className="text-[14px] leading-relaxed text-ink-500">{s.covers}</p>
              <p className="mt-1.5 text-[12px] font-semibold text-primary-600">{s.cycle}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-2xl bg-ink-100/40 p-4 text-[13px] leading-relaxed text-ink-500">
          공공데이터는 기관이 제출한 시점의 값이라 실제 현황과 차이가 있을 수 있습니다. 시설별
          상세페이지 하단에 해당 시설 데이터의 기준일을 표시합니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">2. 돌보다 AI기반 안심지수</h2>
        <p className="mb-4 text-[15px] leading-[1.8] text-ink-700">
          보호자가 시설을 고를 때 실제로 걱정하는 순서를 그대로 점수 구조에 반영했습니다. 공개된
          공공데이터만으로 계산하는 참고 지표이며, 이용자 평점이나 리뷰가 아닙니다.
        </p>

        <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-100/40">
                <th className="p-3 text-left text-xs font-bold text-ink-500">영역</th>
                <th className="p-3 text-right text-xs font-bold text-ink-500">가중치</th>
              </tr>
            </thead>
            <tbody>
              {SCORE_AREAS.map((a) => (
                <tr key={a.key} className="border-b border-ink-100 last:border-0">
                  <td className="p-3 text-ink-700">{a.label}</td>
                  <td className="p-3 text-right font-bold text-ink-900">{a.weight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 text-[15px] font-bold text-ink-900">계산 방법</h3>
        <ul className="mb-4 space-y-2.5 rounded-2xl bg-white p-5 shadow-card">
          {[
            "영역 점수 = 그 영역에 속한 신호들의 가중 평균 (데이터가 없는 신호는 계산에서 제외)",
            "총점 = 영역 점수 × 영역 가중치의 합 ÷ 확보된 가중치",
            "확보된 가중치가 절반(50%) 미만이면 점수를 내지 않고 '산출 보류'로 표시",
            "미확보 가중치만큼은 전국 평균 수준(65점)으로 수렴시켜, 데이터가 적은 시설이 유리해지지 않게 보정",
          ].map((t) => (
            <li key={t} className="flex gap-2.5 text-[14px] leading-[1.75] text-ink-700">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary-400" />
              {t}
            </li>
          ))}
        </ul>

        <h3 className="mb-2 text-[15px] font-bold text-ink-900">데이터가 없을 때</h3>
        <p className="mb-4 text-[15px] leading-[1.8] text-ink-700">
          없는 값을 추정해 채우지 않습니다. 해당 신호를 계산에서 빼고, 화면에도 &ldquo;아직 공개되지
          않았어요&rdquo;라고 그대로 밝힙니다. 상세페이지의 &lsquo;전체 근거 보기&rsquo;를 열면 어떤
          신호가 몇 점이고 무엇이 미공개인지 항목별로 확인할 수 있습니다.
        </p>

        <div className="rounded-2xl border border-accent-300/60 bg-accent-100/40 p-4">
          <p className="mb-1 text-[14px] font-bold text-ink-900">한계</p>
          <p className="text-[13px] leading-relaxed text-ink-600">
            안심지수는 공개 데이터로 계산한 참고 지표일 뿐, 시설의 실제 돌봄 품질을 보증하지
            않습니다. 청결도, 직원의 태도, 어르신과의 궁합처럼 데이터로 볼 수 없는 부분이 많습니다.
            입소를 결정하기 전에는 반드시 직접 방문해 확인하시기를 권합니다.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">3. 이상값 처리</h2>
        <p className="text-[15px] leading-[1.8] text-ink-700">
          공공데이터 원본에는 &lsquo;1일 1원&rsquo;처럼 입력 실수로 보이는 값이 섞여 있습니다. 이런
          값은 숫자를 그대로 보여주지 않고 <strong className="font-bold text-ink-900">시설 문의 필요</strong>로
          표시합니다. 원본을 임의로 고쳐 쓰지는 않으며, 이상해 보인다는 사실만 알려드립니다. 비급여
          월 금액은 공단 공개자료의 31일 기준 값입니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">4. 오류 정정 요청</h2>
        <p className="mb-3 text-[15px] leading-[1.8] text-ink-700">
          표시된 정보가 실제와 다르다면 알려주세요. 시설 관계자분의 정보 수정 요청도 받고 있습니다.
          기관명과 함께 어떤 항목이 다른지 보내주시면 공공데이터 원본과 대조한 뒤 반영합니다.
        </p>
        <a
          href="mailto:wkdgytls1201@gmail.com?subject=%5B%EB%8F%8C%EB%B3%B4%EB%8B%A4%5D%20%EC%8B%9C%EC%84%A4%20%EC%A0%95%EB%B3%B4%20%EC%A0%95%EC%A0%95%20%EC%9A%94%EC%B2%AD"
          className="flex min-h-[52px] items-center justify-center rounded-2xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-transform hover:-translate-y-0.5"
        >
          정보 정정 요청하기
        </a>
      </section>

      <Link
        href="/about"
        className="flex min-h-[52px] items-center justify-center rounded-2xl border border-ink-100 bg-white text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
      >
        돌보다 소개 보기
      </Link>
    </main>
  );
}
