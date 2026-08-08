"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { Home, Search, ClipboardCheck, BookOpen, User } from "lucide-react";
import { AuthModal } from "./AuthModal";
import {
  getTabBarHidden,
  getTabBarHiddenServer,
  subscribeTabBarHidden,
} from "@/lib/tabBarVisibility";

// 웹으로 들어와도 앱처럼 느껴지게 하는 핵심 화면 4개만 하단 탭바에 둔다. 나머지는 햄버거 메뉴로.
// 이미 자체 하단 CTA 바가 있는 화면(돌봄요청 마법사·등급테스트 진행·시설상세)에서는 탭바를
// 숨긴다 — 두 바가 겹치면 더 헷갈리고, 그 화면들은 어차피 몰입해서 끝까지 진행하는 흐름이라
// 중간에 다른 탭으로 새는 걸 유도할 필요도 적다.
//
const HIDDEN_PREFIXES = [
  "/facility/",
  "/grade-helper",
  // 등급테스트는 전 단계(인트로·진행·결과)에서 탭바를 숨긴다(2026-08-05 사용자 지시 —
  // 14차의 "진행 중만 숨기고 바닥에서 등장" 상태 신호 방식을 대체). 자체 하단 CTA가
  // 흐름을 끌고 가는 화면이라 탭바가 없는 쪽이 몰입에 맞다.
  "/grade-test",
  "/care-request",
  // 매니저 등록 마법사도 자체 하단 "다음" 바가 있다 — 탭바가 위에 겹치면
  // z-index에 따라 다음 버튼이 통째로 가려져 진행 자체가 막힌다
  "/mypage/sitter/register",
];

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/search", label: "시설찾기", icon: Search },
  { href: "/grade-test", label: "등급테스트", icon: ClipboardCheck },
  // 5번째 탭(2026-08-05) — 50~70대 타깃의 첫 방문 목적이 "정보"라 등급테스트와
  // 정보축 쌍을 이룬다. 라벨은 폭 때문에 짧게.
  { href: "/guide", label: "가이드", icon: BookOpen },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showAuth, setShowAuth] = useState(false);
  // 등급테스트 진행 중처럼 "같은 경로 안에서 단계에 따라" 숨겨야 하는 화면의 신호
  const stateHidden = useSyncExternalStore(
    subscribeTabBarHidden,
    getTabBarHidden,
    getTabBarHiddenServer
  );

  if (stateHidden || HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  const myPageActive = pathname?.startsWith("/mypage") || pathname === "/account";

  return (
    <>
      {/* 탭바 높이만큼 문서 흐름에 여백을 만들어 마지막 콘텐츠가 탭바에 가려지지 않게 한다.
          ⚠️ safe-area를 함께 더해야 한다 — 탭바 자신은 아래 [padding-bottom:env(...)]로
          홈 인디케이터를 피하지만, 이 스페이서가 60px 고정이면 그만큼이 계산에서 빠진다.
          브라우저(safe-area=0)에선 탭바 59px < 60px라 멀쩡해 보이고, 홈 인디케이터가 있는
          아이폰에서만 탭바가 93px가 되어 **마지막 33px이 가려졌다**(실측 2026-08-08). */}
      <div className="h-[calc(60px+env(safe-area-inset-bottom))] sm:hidden" aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur sm:hidden [padding-bottom:env(safe-area-inset-bottom)]"
        aria-label="주요 메뉴"
      >
        <div className="grid grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-90 active:bg-ink-100/60 ${
                  active ? "text-primary-600" : "text-ink-400"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}

          {session?.user ? (
            <Link
              href="/mypage"
              className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-90 active:bg-ink-100/60 ${
                myPageActive ? "text-primary-600" : "text-ink-400"
              }`}
            >
              <User size={19} strokeWidth={myPageActive ? 2.4 : 2} />
              마이페이지
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold text-ink-400 transition-all duration-150 active:scale-90 active:bg-ink-100/60 active:text-primary-600"
            >
              <User size={19} />
              마이페이지
            </button>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
