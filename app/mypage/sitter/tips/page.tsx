"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { MyPageShell } from "@/components/MyPageShell";
import { MANAGER_TIPS } from "@/lib/managerTips";

const CATEGORY_ORDER = ["지원 잘하기", "돌봄 실전", "정산·제도"] as const;

// 매니저 가이드 — 지원 성공률을 높이는 실전 팁. 매니저가 마이페이지에 다시 올 이유를 만든다.
export default function SitterTipsPage() {
  // 여러 개를 동시에 펼칠 수 있게 한다. 예전엔 한 번에 하나만 열리는 아코디언이라,
  // 아래쪽 글을 펼치면 위에 열려 있던 긴 글이 접히면서 화면이 통째로 위로 올라갔다
  // — 누른 카드가 손가락 아래에서 사라지고 엉뚱한 위치로 튄 것처럼 보였다.
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(
    () => new Set(MANAGER_TIPS[0] ? [MANAGER_TIPS[0].slug] : [])
  );
  const toggle = (slug: string) =>
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });

  return (
    <MyPageShell>
      <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-ink-900">
        <BookOpen size={20} className="text-royal-500" />
        매니저 가이드
      </h2>
      <p className="mb-6 text-sm text-ink-500">
        지원이 매칭으로 이어지게 하는 실전 팁이에요. 새 글이 계속 추가돼요.
      </p>

      {CATEGORY_ORDER.map((category) => {
        const list = MANAGER_TIPS.filter((t) => t.category === category);
        if (list.length === 0) return null;
        return (
          <section key={category} className="mb-7">
            <h3 className="mb-3 text-[13px] font-bold text-ink-400">{category}</h3>
            <div className="space-y-2.5">
              {list.map((tip) => {
                const isOpen = openSlugs.has(tip.slug);
                return (
                  <article
                    key={tip.slug}
                    className="overflow-hidden rounded-2xl border border-ink-100 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(tip.slug)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 active:bg-ink-100/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold leading-snug text-ink-900">
                          {tip.title}
                        </span>
                        {!isOpen && (
                          <span className="mt-1 line-clamp-1 block text-[13px] text-ink-400">
                            {tip.summary}
                          </span>
                        )}
                      </span>
                      {/* 화살표만 두면 누를 수 있는 줄 모른다 — 시설 상세 프로그램 아코디언과
                          같은 규칙으로 "펼치기/접기" 글자를 함께 둔다 */}
                      <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ink-300">
                        {isOpen ? "접기" : "펼치기"}
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-ink-100 px-4 pb-5 pt-4">
                        <p className="mb-4 text-sm leading-relaxed text-ink-500">{tip.summary}</p>
                        <div className="space-y-4">
                          {tip.sections.map((s) => (
                            <div key={s.heading}>
                              <p className="mb-1.5 text-sm font-bold text-ink-900">{s.heading}</p>
                              {s.body.map((b) => (
                                <p
                                  key={b.slice(0, 16)}
                                  className="mb-1.5 text-sm leading-[1.75] text-ink-700"
                                >
                                  {b}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="rounded-2xl bg-ink-100/40 p-4 text-xs leading-relaxed text-ink-500">
        더 알고 싶은 주제가 있으면 알려주세요. 매니저분들이 자주 묻는 내용부터 차례로 추가할게요.
      </p>
    </MyPageShell>
  );
}
