import type { Metadata } from "next";
import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { myFacilities, capabilityOf } from "@/lib/facilityOwner";
import { getMonthlyReport, type MonthlyReport } from "@/lib/monthlyReport";
import { ViewTrendChart } from "@/components/ViewTrendChart";
import { auth } from "@/auth";
import { ConsoleLoginButton } from "../ConsoleLoginButton";

// 월간 성과 보고서 — 지역 프리미엄 이상 전용.
//
// 원칙: 못 재는 지표는 숨긴다. sponsor/banner가 null이면 그 섹션 자체가 안 나가고,
// "노출 0"처럼 거짓으로 읽힐 수 있는 값을 만들지 않는다. 차트는 새 라이브러리 없이
// 기존 브랜드 토큰(primary/mint/ink)만 쓰는 얇은 CSS(ViewTrendChart, 기업회원 콘솔의
// 조회 추이 그래프와 공용) — 이 페이지는 시설 담당자 한 명이 한 달에 몇 번 보는
// 화면이라 무거운 차트 라이브러리가 안 맞는다.
export const metadata: Metadata = {
  title: "월간 성과 보고서",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { facilityId?: string };
}) {
  // 콘솔 본 화면과 같은 이유로 로그인 여부를 먼저 가른다 — myFacilities()는 비로그인도
  // 빈 배열이라, 구분하지 않으면 **프리미엄 고객이 로그아웃 상태에서 들어왔을 때
  // "요금제가 안 된다"는 안내를 보게 된다**(2026-08-08 B2B 실사용 검증).
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-2 break-keep text-xl font-bold text-ink-900">
          로그인 후 이용하실 수 있어요
        </h1>
        <p className="mb-6 break-keep text-sm leading-relaxed text-ink-500">
          시설 인증을 신청하실 때 쓰신 계정으로 로그인해 주세요.
        </p>
        <ConsoleLoginButton />
      </main>
    );
  }

  const facilities = await myFacilities();
  const eligible = facilities.filter((f) => capabilityOf(f.plan).hasReport);

  if (eligible.length === 0) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">월간 성과 보고서는 아직이에요</h1>
        <p className="mb-6 text-sm leading-relaxed text-ink-500">
          지역 프리미엄 이상 시설에서 볼 수 있는 화면이에요. 조회수·상담·광고 성과를
          한 달 단위로 모아 보여드립니다.
        </p>
        <Link
          href="/business/console#plans"
          className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-primary-500 px-6 text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-600"
        >
          확장 상품 보기
        </Link>
      </main>
    );
  }

  const selected =
    eligible.find((f) => f.facilityId === searchParams.facilityId) ?? eligible[0];
  const report = await getMonthlyReport(selected.facilityId, selected.facilityName, selected.plan);

  if (!report) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-sm text-ink-500">시설 정보를 찾을 수 없어요.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink-900">월간 성과 보고서</h1>
        <Link
          href="/business/console"
          className="text-xs font-semibold text-ink-500 hover:text-primary-600"
        >
          콘솔로 돌아가기
        </Link>
      </div>
      <p className="mb-4 text-sm text-ink-500">
        {report.periodLabel} 기준 · {report.facilityName}
      </p>

      {/* 시설이 여러 곳이면 링크 전환 — 서버 컴포넌트라 폼/select보다 이 방식이 단순하고
          확실하게 동작한다. 대부분은 시설이 하나뿐이라 이 블록 자체가 안 보인다. */}
      {eligible.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {eligible.map((f) => (
            <Link
              key={f.facilityId}
              href={`/business/console/report?facilityId=${encodeURIComponent(f.facilityId)}`}
              className={`min-h-[44px] rounded-full px-3 text-xs font-bold transition-colors ${
                f.facilityId === selected.facilityId
                  ? "bg-ink-900 text-white"
                  : "bg-white text-ink-500 shadow-card"
              }`}
            >
              {f.facilityName}
            </Link>
          ))}
        </div>
      )}

      <StatCard
        title="페이지 조회수"
        thisMonth={report.views.thisMonth}
        lastMonth={report.views.lastMonth}
        deltaPct={report.views.deltaPct}
        unit="회"
        periodLabel={report.periodLabel}
        prevPeriodLabel={report.prevPeriodLabel}
      >
        {report.regionAvgViews != null && report.regionLabel && (
          <p className="mt-2 text-xs text-ink-500">
            {report.regionLabel} 시설 평균 대비{" "}
            <strong className="text-ink-700">
              {report.regionAvgViews > 0
                ? `${(report.views.thisMonth / report.regionAvgViews).toFixed(1)}배`
                : "비교 불가"}
            </strong>
            {" "}(지역 평균 {report.regionAvgViews.toLocaleString()}회)
          </p>
        )}
        <ViewTrendChart series={report.views.last30Days} unit="회" title="최근 30일 조회 추이" />
      </StatCard>

      <StatCard
        title="상담 신청"
        thisMonth={report.consults.thisMonth}
        lastMonth={report.consults.lastMonth}
        deltaPct={report.consults.deltaPct}
        unit="건"
        periodLabel={report.periodLabel}
        prevPeriodLabel={report.prevPeriodLabel}
      >
        <dl className="mt-2 grid grid-cols-3 gap-2">
          {report.consults.byStatus.map((s) => (
            <div key={s.label} className="rounded-lg bg-ivory-100 py-2 text-center">
              <dt className="text-[10px] text-ink-300">{s.label}</dt>
              <dd className="text-sm font-bold text-ink-900">{s.count}</dd>
            </div>
          ))}
        </dl>
        {/* 전환율 — "노출을 늘릴 문제인가, 페이지를 손볼 문제인가"를 가른다.
            조회 30회 미만이면 null이라 아예 안 나온다(한 건이 수치를 흔든다). */}
        {report.consults.conversionPct !== null && (
          <p className="mt-2 break-keep rounded-lg bg-royal-50 px-3 py-2 text-[12px] leading-relaxed text-royal-700">
            시설 페이지를 본 100명 중{" "}
            <strong className="font-extrabold">{report.consults.conversionPct}명</strong>이 상담을
            신청했어요.
          </p>
        )}
      </StatCard>

      {/* 비급여 비용 지역 비교 — 운영자가 가장 자주 묻는 "우리가 비싼 편인가요"에 답한다.
          공단 공개자료만 보면 자기 시설 금액밖에 못 보지만, 우리는 전국 값을 갖고 있어
          중앙값을 낼 수 있다(docs/data-assets-spec.md §2).
          비교 가능한 항목이 없으면 섹션을 통째로 감춘다 — "비교 불가"를 "차이 없음"처럼
          보이게 하면 안 된다. */}
      {report.fees.length > 0 && (
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-1 text-[15px] font-bold text-ink-900">비급여 비용 · 지역 비교</h2>
          <p className="mb-3 text-[11px] leading-relaxed text-ink-300">
            같은 지역 같은 유형 시설들의 중앙값과 비교한 값이에요. 금액 조정을 권하는 게
            아니라, 보호자가 보는 화면에서 어떻게 비치는지 알려드리는 참고 자료예요.
          </p>
          <ul className="space-y-3">
            {report.fees.map((f, i) => {
              // ⚠️ 같은 항목명이 한 시설에 여러 번 올 수 있다 — "상급침실사용료"가 1인실·
              //    2인실로 각각 등록된 경우다(실측: 155,000원과 310,000원 두 행).
              //    이름만으로 key를 잡으면 중복되므로 순번을 함께 쓴다.
              //    기준값(중앙값)은 이름 단위라 두 행이 같은 값과 비교된다 — 공단 원본이
              //    병실 등급을 구분하지 않아 지금은 여기까지가 정확한 한계다.
              // 두 막대를 같은 축에 놓아 길이 차이가 그대로 금액 차이가 되게 한다
              const scale = Math.max(f.monthly, f.regionMedian, 1);
              const higher = f.diffPct > 5;
              const lower = f.diffPct < -5;
              return (
                <li key={`${f.name}-${i}`}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-[13px] font-bold text-ink-900">{f.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        higher
                          ? "bg-accent-100 text-accent-600"
                          : lower
                            ? "bg-mint-100 text-mint-700"
                            : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {higher || lower
                        ? `지역 중앙값보다 ${Math.abs(f.diffPct)}% ${higher ? "높음" : "낮음"}`
                        : "지역 중앙값과 비슷"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[52px] shrink-0 text-[11px] font-bold text-ink-700">우리 시설</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100/70">
                      <span
                        aria-hidden
                        className="block h-full rounded-full bg-primary-500"
                        style={{ width: `${(f.monthly / scale) * 100}%` }}
                      />
                    </span>
                    <span className="w-[76px] shrink-0 text-right text-[11px] font-bold tabular-nums text-ink-900">
                      {f.monthly.toLocaleString()}원
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="w-[52px] shrink-0 text-[11px] text-ink-400">지역 중앙</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100/70">
                      <span
                        aria-hidden
                        className="block h-full rounded-full bg-ink-300"
                        style={{ width: `${(f.regionMedian / scale) * 100}%` }}
                      />
                    </span>
                    <span className="w-[76px] shrink-0 text-right text-[11px] tabular-nums text-ink-400">
                      {f.regionMedian.toLocaleString()}원
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-ink-300">
                    {report.regionLabel ?? "지역"} 같은 유형 {f.sampleN.toLocaleString()}곳 기준
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(report.sponsor || report.banner) && (
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-[15px] font-bold text-ink-900">광고 성과 · {report.periodLabel}</h2>
          <div className="space-y-3">
            {report.sponsor && (
              <AdRow
                label="지역 스폰서"
                impressions={report.sponsor.impressions}
                clicks={report.sponsor.clicks}
                ctr={report.sponsor.ctr}
              />
            )}
            {report.banner && (
              <AdRow
                label="지역 배너"
                impressions={report.banner.impressions}
                clicks={report.banner.clicks}
                ctr={report.banner.ctr}
              />
            )}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
            노출은 보호자 화면에 실제로 표시된 횟수, 클릭은 그중 시설 페이지로 이동한
            횟수예요.
          </p>
        </section>
      )}

      <section className="mb-4 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[15px] font-bold text-ink-900">페이지 관리 현황</h2>
        <ul className="space-y-1.5 text-sm text-ink-700">
          <li className="flex items-center justify-between">
            <span className="text-ink-500">소개글</span>
            <span className="font-semibold">{report.content.hasIntro ? "작성됨" : "미작성"}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-ink-500">등록된 사진</span>
            <span className="font-semibold">{report.content.photosCount}장</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-ink-500">{report.periodLabel} 발행한 소식</span>
            <span className="font-semibold">{report.content.postsThisMonth}건</span>
          </li>
        </ul>
        {!report.content.hasIntro && (
          <Link
            href="/business/console"
            className="mt-3 block rounded-xl bg-ivory-100 p-3 text-center text-xs font-semibold text-ink-700 transition-colors hover:bg-ivory-200"
          >
            소개글이 비어 있어요. 콘솔에서 채워보세요 →
          </Link>
        )}
      </section>

      <p className="text-center text-[11px] text-ink-300">
        조회수·광고 지표는 매일 자정(KST) 기준으로 집계돼요. 지역 평균은 같은 시·군·구
        시설이 2곳 이상일 때만 계산됩니다.
      </p>
    </main>
  );
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs font-semibold text-ink-300">지난달 데이터 없음</span>;
  }
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink-500">
        <Minus size={12} /> 지난달과 동일
      </span>
    );
  }
  const up = pct > 0;
  return (
    <span
      // down을 primary(이 앱의 경고·CTA 색)로 쓰지 않는다 — 조회수가 준 것 자체는
      // 위험 신호가 아니다. 기업회원 콘솔의 증감 배지와 같은 규칙(§ ConsoleClient.tsx의
      // Delta 컴포넌트 주석)을 여기도 맞춘다 — 같은 데이터를 두 화면에서 다른 색으로
      // 보여주면 신뢰가 깎인다.
      className={`inline-flex items-center gap-0.5 text-xs font-bold ${
        up ? "text-mint-700" : "text-ink-500"
      }`}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}
      {pct}% 지난달 대비
    </span>
  );
}

function StatCard({
  title,
  thisMonth,
  lastMonth,
  deltaPct,
  unit,
  periodLabel,
  prevPeriodLabel,
  children,
}: {
  title: string;
  thisMonth: number;
  lastMonth: number;
  deltaPct: number | null;
  unit: string;
  periodLabel: string;
  prevPeriodLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
        <DeltaBadge pct={deltaPct} />
      </div>
      <p className="flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-ink-900">
          {thisMonth.toLocaleString()}
          <span className="ml-0.5 text-sm font-semibold text-ink-500">{unit}</span>
        </span>
        <span className="text-xs text-ink-300">
          {prevPeriodLabel} {lastMonth.toLocaleString()}
          {unit}
        </span>
      </p>
      {children}
    </section>
  );
}

function AdRow({
  label,
  impressions,
  clicks,
  ctr,
}: {
  label: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
}) {
  return (
    <div className="rounded-xl bg-ivory-100 p-3.5">
      <p className="mb-1.5 text-xs font-bold text-ink-700">{label}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-ink-300">노출</p>
          <p className="text-sm font-bold text-ink-900">{impressions.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] text-ink-300">클릭</p>
          <p className="text-sm font-bold text-ink-900">{clicks.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] text-ink-300">클릭률</p>
          <p className="text-sm font-bold text-ink-900">{ctr != null ? `${ctr}%` : "-"}</p>
        </div>
      </div>
    </div>
  );
}

