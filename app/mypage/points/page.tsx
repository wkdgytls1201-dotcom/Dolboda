"use client";

// 돌봄 포인트(docs/points-spec.md) — 잔액·적립 방법·사용처·내역을 한 화면에.
// 현금·상품권으로 바꿀 수 없는 플랫폼 내 리워드라는 것을 화면에서도 상시 고지한다
// (약관 제12조의2와 같은 내용 — 선불전자지급수단·보수 지급으로 오해되지 않게).

import { useEffect, useState } from "react";
import { Coins, Star, Megaphone, UserPlus } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { shareOrCopyLink } from "@/lib/shareLink";
import {
  POINT_EARN,
  POINT_SPEND,
  POINT_KIND_LABEL,
  POINT_EXPIRY_MONTHS,
} from "@/lib/pointsConfig";

interface PointsData {
  balance: number;
  entries: { id: string; amount: number; kind: string; createdAt: string }[];
  referral: { code: string; invited: number; rewarded: number };
  ribbon: { eligible: boolean; until: string | null };
  requestBoost: { eligible: boolean; until: string | null };
}

const EARN_ROWS = [
  { label: "돌봄 완료 후 보호자 후기가 도착하면", who: "매니저", amount: POINT_EARN.reviewReceived },
  { label: "그 후기가 5점 만점이면 추가로", who: "매니저", amount: POINT_EARN.fiveStarBonus },
  {
    label: `돌봄일지에 보호자 반응(🙏😊💪)을 받으면 기록당 (요청당 최대 ${POINT_EARN.reactionCapPerRequest}회)`,
    who: "매니저",
    amount: POINT_EARN.reactionPerLog,
  },
  { label: "완료한 돌봄에 후기를 남기면", who: "보호자", amount: POINT_EARN.reviewWritten },
];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function activeUntil(until: string | null) {
  if (!until) return null;
  const d = new Date(until);
  return d > new Date() ? d : null;
}

export default function PointsPage() {
  const [data, setData] = useState<PointsData | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    fetch("/api/points")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }
  useEffect(load, []);

  async function buy(item: "ribbon" | "requestBoost") {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
      });
      const d = await res.json();
      if (!res.ok) {
        setNotice(d.error ?? "잠시 후 다시 시도해주세요.");
        return;
      }
      setNotice(`${POINT_SPEND[item].label}이 적용됐어요!`);
      load();
    } catch {
      setNotice("잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (data === undefined) return <PageLoader />;
  if (data === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
        <p className="text-sm text-ink-500">돌봄 포인트는 로그인 후 확인할 수 있어요.</p>
      </main>
    );
  }

  const ribbonActive = activeUntil(data.ribbon.until);
  const boostActive = activeUntil(data.requestBoost.until);

  return (
    // pb: 마지막 섹션이 푸터에 붙지 않게 숨 쉴 여백(사용자 피드백 2026-08-05)
    <div className="space-y-7 pb-12">
      {/* 잔액 */}
      <section className="rounded-2xl bg-gradient-to-br from-primary-500 to-peach-400 p-5 text-white shadow-card">
        <p className="mb-1 flex items-center gap-1.5 text-[14px] font-semibold opacity-90">
          <Coins size={14} aria-hidden />내 돌봄 포인트
        </p>
        <p className="text-4xl font-extrabold">
          {data.balance.toLocaleString()}
          <span className="ml-1 text-lg font-bold">P</span>
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed opacity-80">
          보호자의 후기와 감사가 쌓이는 리워드예요. 현금·상품권으로 바꿀 수 없고, 돌보다
          안에서만 쓸 수 있어요.
        </p>
      </section>

      {notice && (
        <p className="rounded-xl bg-primary-50 px-3.5 py-2.5 text-[14px] font-semibold text-primary-700">
          {notice}
        </p>
      )}

      {/* 사용처 */}
      <section className="space-y-2.5">
        <h2 className="px-1 text-[16px] font-bold text-ink-900">포인트 사용하기</h2>

        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <p className="mb-0.5 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
            <Star size={15} className="text-accent-500" aria-hidden />
            {POINT_SPEND.ribbon.label}
            <span className="ml-auto shrink-0 text-primary-600">
              {POINT_SPEND.ribbon.price.toLocaleString()}P
            </span>
          </p>
          <p className="mb-2.5 break-keep text-[13px] leading-relaxed text-ink-500">
            {POINT_SPEND.ribbon.desc}
          </p>
          {ribbonActive ? (
            <p className="rounded-xl bg-mint-100/70 px-3 py-2 text-[13px] font-bold text-mint-700">
              적용 중 — {ribbonActive.getMonth() + 1}.{ribbonActive.getDate()}까지. 다시 사면
              기간이 이어져요.
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy || !data.ribbon.eligible || data.balance < POINT_SPEND.ribbon.price}
            onClick={() => buy("ribbon")}
            className="mt-1 min-h-[44px] w-full rounded-xl bg-primary-500 text-[14px] font-bold text-white transition-all duration-150 hover:bg-primary-600 active:scale-[0.98] disabled:bg-ink-100 disabled:text-ink-300"
          >
            {!data.ribbon.eligible
              ? "매니저 프로필이 있어야 쓸 수 있어요"
              : data.balance < POINT_SPEND.ribbon.price
                ? `포인트가 ${POINT_SPEND.ribbon.price - data.balance}P 더 필요해요`
                : `${POINT_SPEND.ribbon.price}P로 ${POINT_SPEND.ribbon.days}일 적용하기`}
          </button>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <p className="mb-0.5 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
            <Megaphone size={15} className="text-royal-500" aria-hidden />
            {POINT_SPEND.requestBoost.label}
            <span className="ml-auto shrink-0 text-primary-600">
              {POINT_SPEND.requestBoost.price.toLocaleString()}P
            </span>
          </p>
          <p className="mb-2.5 break-keep text-[13px] leading-relaxed text-ink-500">
            {POINT_SPEND.requestBoost.desc} 매니저로 활동하며 모은 포인트를 내 가족의 돌봄을
            구할 때 쓸 수 있어요.
          </p>
          {boostActive ? (
            <p className="rounded-xl bg-mint-100/70 px-3 py-2 text-[13px] font-bold text-mint-700">
              적용 중 — {boostActive.getMonth() + 1}.{boostActive.getDate()}까지
            </p>
          ) : null}
          <button
            type="button"
            disabled={
              busy || !data.requestBoost.eligible || data.balance < POINT_SPEND.requestBoost.price
            }
            onClick={() => buy("requestBoost")}
            className="mt-1 min-h-[44px] w-full rounded-xl bg-royal-500 text-[14px] font-bold text-white transition-all duration-150 hover:bg-royal-600 active:scale-[0.98] disabled:bg-ink-100 disabled:text-ink-300"
          >
            {!data.requestBoost.eligible
              ? "지원자를 받는 중인 요청이 있어야 쓸 수 있어요"
              : data.balance < POINT_SPEND.requestBoost.price
                ? `포인트가 ${POINT_SPEND.requestBoost.price - data.balance}P 더 필요해요`
                : `${POINT_SPEND.requestBoost.price}P로 ${POINT_SPEND.requestBoost.days}일 적용하기`}
          </button>
        </div>
      </section>

      {/* 화면 폭에 따라 사용하기 카드가 폴드에 딱 걸려 "여기가 끝"으로 보일 수 있다 —
          아래에 더 있음을 항상 알리는 0-JS 힌트(사용자 피드백 2026-08-05) */}
      <p className="!mt-4 flex items-center justify-center gap-1 text-[12px] font-semibold text-ink-300">
        아래에 친구 초대·적립 방법이 더 있어요
        <span aria-hidden className="text-[13px]">⌄</span>
      </p>

      {/* 친구 초대 — 가입(귀속) 즉시 양쪽 지급(points-spec §5, 2026-08-05 사용자 결정
          — 포인트가 현금성이 없어 유령 계정으로 캐도 실익이 없다) */}
      <section className="rounded-2xl border border-royal-200 bg-royal-50/50 p-5">
        <p className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
          <UserPlus size={15} className="text-royal-500" aria-hidden />
          친구 초대
          <span className="ml-auto shrink-0 text-[13px] font-extrabold text-royal-600">
            나 +{POINT_EARN.referralReferrer.toLocaleString()}P · 친구 +
            {POINT_EARN.referralReferee.toLocaleString()}P
          </span>
        </p>
        <p className="mb-2.5 break-keep text-[13px] leading-relaxed text-ink-500">
          초대받은 분이 <strong className="font-bold text-ink-700">가입만 해도 바로</strong> 두 분
          모두에게 포인트를 드려요.
          {data.referral.invited > 0 &&
            ` 지금까지 ${data.referral.invited}명 초대 · ${data.referral.rewarded}명 보상 완료.`}
        </p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-2.5 text-center text-[16px] font-extrabold tracking-[3px] text-royal-700 ring-1 ring-royal-100">
            {data.referral.code}
          </code>
          <button
            type="button"
            onClick={async () => {
              const outcome = await shareOrCopyLink({
                url: `${window.location.origin}/?ref=${data.referral.code}`,
                title: "돌보다 초대",
                text: "돌보다에서 요양시설 찾기부터 돌봄 매칭까지 — 초대 링크로 시작해보세요.",
              });
              setNotice(
                outcome === "copied"
                  ? "초대 링크를 복사했어요. 붙여넣어 보내주세요."
                  : outcome === "fallback"
                    ? "주소창의 링크를 전달해주세요."
                    : null
              );
            }}
            className="min-h-[44px] shrink-0 rounded-xl bg-royal-500 px-4 text-[14px] font-bold text-white transition-all duration-150 hover:bg-royal-600 active:scale-[0.98]"
          >
            링크 공유
          </button>
        </div>
      </section>

      {/* 적립 방법 */}
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="mb-3.5 text-[16px] font-bold text-ink-900">이렇게 쌓여요</h2>
        <ul className="space-y-3">
          {EARN_ROWS.map((r) => (
            <li key={r.label} className="flex items-baseline gap-2 text-[14px]">
              <span className="shrink-0 rounded-full bg-ink-100/60 px-1.5 py-0.5 text-[11px] font-bold text-ink-500">
                {r.who}
              </span>
              <span className="min-w-0 flex-1 break-keep leading-relaxed text-ink-700">
                {r.label}
              </span>
              <span className="shrink-0 font-extrabold text-primary-600">+{r.amount}P</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 break-keep text-[12px] leading-relaxed text-ink-400">
          포인트는 돌봄의 대가가 아니라, 보호자가 남긴 후기·감사에 대해 돌보다가 드리는
          리워드예요. 적립일로부터 {POINT_EXPIRY_MONTHS}개월이 지나면 사라지고, 부정한 방법으로
          모은 포인트는 회수될 수 있어요.
        </p>
      </section>

      {/* 내역 */}
      {data.entries.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3.5 text-[16px] font-bold text-ink-900">최근 내역</h2>
          <ul className="space-y-2.5">
            {data.entries.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-[14px]">
                <span className="shrink-0 text-ink-300">{fmtDate(e.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-700">
                  {POINT_KIND_LABEL[e.kind] ?? e.kind}
                </span>
                <span
                  className={`shrink-0 font-bold ${e.amount > 0 ? "text-primary-600" : "text-ink-400"}`}
                >
                  {e.amount > 0 ? "+" : ""}
                  {e.amount.toLocaleString()}P
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
