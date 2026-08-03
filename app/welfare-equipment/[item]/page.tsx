import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  allEquipmentItems,
  findEquipmentBySlug,
  ANNUAL_LIMIT,
  BASE_YEAR,
  COPAY_TIERS,
  EXAMPLE_AMOUNT,
  copayOf,
} from "@/lib/welfareEquipment";
import { WelfareItemIcon, toneOf } from "@/components/WelfareItemIcon";
import { WelfareConsultGate } from "@/components/WelfareConsultGate";
import { WelfareLoginCta } from "@/components/WelfareLoginCta";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

// 복지용구 품목별 상세 페이지 — /welfare-equipment/[item].
//
// 목적: "이동변기 지원" "전동침대 대여 요양등급" 같은 품목 단위 롱테일 검색어를 받는 자리.
// 목록 페이지(/welfare-equipment)의 카드 desc 한 줄만으로는 이런 검색어를 못 받는다.
// URL은 한글 그대로 쓴다 — /요양원 허브 페이지와 같은 규칙(dynamicParams=false는
// 한글 slug에서 전부 404를 낸다는 게 실측돼 있어, notFound() 방식을 그대로 따른다).
export const revalidate = 86400;

export async function generateStaticParams() {
  return allEquipmentItems().map((item) => ({ item: item.slug }));
}

function resolve(param: string) {
  return findEquipmentBySlug(decodeURIComponent(param));
}

export async function generateMetadata({
  params,
}: {
  params: { item: string };
}): Promise<Metadata> {
  const item = resolve(params.item);
  if (!item) return {};

  const title = `${item.name} 장기요양 지원 — 연 ${ANNUAL_LIMIT.toLocaleString()}원 한도`;
  const description = `${item.who} ${item.detail} 장기요양등급이 있으면 본인부담 15~0%로 ${item.kind === "구입" ? "구입" : "대여"}할 수 있어요.`;
  const path = `/welfare-equipment/${encodeURIComponent(item.slug)}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${item.name} 지원 안내 | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}${path}`,
      type: "website",
      images: [OG_IMAGE],
    },
  };
}

export default function WelfareEquipmentItemPage({ params }: { params: { item: string } }) {
  const item = resolve(params.item);
  if (!item) notFound();

  const allItems = allEquipmentItems();
  const idx = allItems.findIndex((i) => i.slug === item.slug);
  const related = allItems.filter((i) => i.kind === item.kind && i.slug !== item.slug).slice(0, 4);

  const path = `/welfare-equipment/${encodeURIComponent(item.slug)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "복지용구 혜택", item: `${SITE_URL}/welfare-equipment` },
          { "@type": "ListItem", position: 3, name: item.name, item: `${SITE_URL}${path}` },
        ],
      },
    ],
  };

  const tone = toneOf(idx);

  return (
    <main className="pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      <section className="bg-hero-gradient px-4 pb-10 pt-8">
        <div className="mx-auto max-w-lg">
          <Link
            href="/welfare-equipment"
            className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-500"
          >
            <ArrowLeft size={14} />
            복지용구 혜택으로
          </Link>
          <div className="flex items-start gap-3.5">
            <WelfareItemIcon name={item.name} index={idx} size={30} className="h-16 w-16 shadow-soft" />
            <div>
              <span
                className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone.bg} ${tone.text}`}
              >
                {item.kind} 품목
              </span>
              <h1 className="text-[22px] font-extrabold leading-snug text-ink-900">{item.name}</h1>
            </div>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-700">{item.who}</p>
        </div>
      </section>

      <div className="mx-auto max-w-lg px-4">
        <section className="mt-8">
          <h2 className="mb-2 text-[15px] font-bold text-ink-900">어떤 물건인가요</h2>
          <p className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-ink-600 shadow-card">
            {item.detail}
          </p>
        </section>

        {item.checkpoints.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-[15px] font-bold text-ink-900">고를 때 확인할 점</h2>
            <ul className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
              {item.checkpoints.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-mint-600" />
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-[15px] font-bold text-ink-900">
            {EXAMPLE_AMOUNT.toLocaleString()}원짜리를 {item.kind === "구입" ? "살" : "빌릴"} 때 본인부담금
          </h2>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <ul className="space-y-2">
              {COPAY_TIERS.map((tier) => (
                <li key={tier.id} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-700">{tier.label}</span>
                  <span className="font-extrabold text-primary-600">
                    {copayOf(EXAMPLE_AMOUNT, tier.rate).toLocaleString()}원
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-300">
              {BASE_YEAR}년 연 {ANNUAL_LIMIT.toLocaleString()}원 한도 안에서 적용돼요. 실제 가격은
              사업소·제품에 따라 달라요.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <WelfareConsultGate defaultItem={item.name} />
        </section>

        <section className="mt-8 rounded-2xl bg-royal-50/60 p-5 text-center">
          <p className="mb-1 text-[14px] font-bold text-ink-900">내 혜택 한도를 바로 보고 싶다면</p>
          <p className="mb-3 text-[12px] leading-relaxed text-ink-500">
            회원가입하고 어르신 등급을 등록하면 마이페이지에서 바로 확인할 수 있어요.
          </p>
          <WelfareLoginCta className="inline-flex min-h-[46px] items-center gap-1.5 rounded-xl bg-royal-500 px-5 text-sm font-bold text-white shadow-soft transition-colors hover:bg-royal-600">
            로그인하고 확인하기
            <ArrowRight size={15} />
          </WelfareLoginCta>
        </section>

        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[15px] font-bold text-ink-900">
              함께 보는 {item.kind} 품목
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {related.map((r) => {
                const rIdx = allItems.findIndex((i) => i.slug === r.slug);
                return (
                  <Link
                    key={r.slug}
                    href={`/welfare-equipment/${encodeURIComponent(r.slug)}`}
                    className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-card transition-transform duration-150 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                  >
                    <WelfareItemIcon name={r.name} index={rIdx} size={16} className="h-8 w-8" />
                    <span className="text-[13px] font-bold text-ink-900">{r.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
