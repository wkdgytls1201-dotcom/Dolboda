"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Home, Search, ClipboardCheck, User } from "lucide-react";
import { AuthModal } from "./AuthModal";

// 웹으로 들어와도 앱처럼 느껴지게 하는 핵심 화면 4개만 하단 탭바에 둔다. 나머지는 햄버거 메뉴로.
// 이미 자체 하단 CTA 바가 있는 화면(돌봄요청 마법사·등급테스트 진행·시설상세)에서는 탭바를
// 숨긴다 — 두 바가 겹치면 더 헷갈리고, 그 화면들은 어차피 몰입해서 끝까지 진행하는 흐름이라
// 중간에 다른 탭으로 새는 걸 유도할 필요도 적다.
const HIDDEN_PREFIXES = [
  "/facility/",
  "/grade-test",
  "/grade-helper",
  "/care-request",
  // 매니저 등록 마법사도 자체 하단 "다음" 바가 있다 — 탭바가 위에 겹치면
  // z-index에 따라 다음 버튼이 통째로 가려져 진행 자체가 막힌다
  "/mypage/sitter/register",
];

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/search", label: "시설찾기", icon: Search },
  { href: "/grade-test", label: "등급테스트", icon: ClipboardCheck },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showAuth, setShowAuth] = useState(false);

  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  const myPageActive = pathname?.startsWith("/mypage") || pathname === "/account";

  return (
    <>
      {/* 탭바 높이만큼 문서 흐름에 여백을 만들어 마지막 콘텐츠가 탭바에 가려지지 않게 한다. */}
      <div className="h-[72px] sm:hidden" aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur sm:hidden [padding-bottom:env(safe-area-inset-bottom)]"
        aria-label="주요 메뉴"
      >
        <div className="grid grid-cols-4">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition-all duration-150 active:scale-90 active:bg-ink-100/60 ${
                  active ? "text-primary-600" : "text-ink-400"
                }`}
              >
                <Icon size={23} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}

          {session?.user ? (
            <Link
              href="/mypage"
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition-all duration-150 active:scale-90 active:bg-ink-100/60 ${
                myPageActive ? "text-primary-600" : "text-ink-400"
              }`}
            >
              <User size={23} strokeWidth={myPageActive ? 2.4 : 2} />
              마이페이지
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 py-2 text-xs font-semibold text-ink-400 transition-all duration-150 active:scale-90 active:bg-ink-100/60 active:text-primary-600"
            >
              <User size={23} />
              마이페이지
            </button>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
