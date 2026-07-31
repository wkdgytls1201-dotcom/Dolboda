"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, User, X } from "lucide-react";
import { useCompare } from "@/lib/compareContext";
import { useFavorites } from "@/lib/favoritesContext";
import { useSession } from "next-auth/react";
import { signOutAndClear } from "@/lib/signOutAndClear";
import { AuthModal } from "./AuthModal";
import { Logo } from "./Logo";

// authOnly 항목은 로그인해야 쓸 수 있는 기능이라 비로그인 상태에선 노출하지 않는다.
const NAV = [
  // highlight: 다른 메뉴와 색을 달리해 눈에 띄게 (신규·핵심 기능)
  { href: "/grade-test", label: "등급 테스트", highlight: true },
  { href: "/services", label: "돌봄 서비스" },
  { href: "/search", label: "시설 찾기" },
  { href: "/compare", label: "시설 비교" },
  { href: "/favorites", label: "관심시설" },
  { href: "/care-request", label: "돌봄 요청", authOnly: true },
];

export function Header() {
  const pathname = usePathname();
  const { selectedIds } = useCompare();
  const { favoriteIds } = useFavorites();
  const { data: session } = useSession();
  const user = session?.user;
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // 라우트가 바뀌면 모바일 메뉴를 닫는다 (링크 클릭 후 메뉴가 열린 채로 남지 않도록).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navItems = NAV.filter((item) => !item.authOnly || user);
  // 모바일은 하단 탭바(홈·시설찾기·등급테스트·마이페이지)가 따로 있어서 햄버거에서 겹치는
  // 항목은 뺀다. 데스크톱은 탭바가 없으니 navItems를 그대로 쓴다.
  const mobileNavItems = navItems.filter(
    (item) => item.href !== "/search" && item.href !== "/grade-test"
  );

  function badgeFor(href: string) {
    if (href === "/compare") return selectedIds.length;
    if (href === "/favorites") return favoriteIds.length;
    return 0;
  }

  // 모바일 햄버거 아이콘에 표시할 전체 알림 개수 (비교 + 관심시설)
  const mobileBadgeCount = selectedIds.length + favoriteIds.length;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:h-16">
          <Link href="/" className="flex items-center transition hover:opacity-80" aria-label="돌보다 홈">
            <Logo className="h-9 w-9 sm:h-14 sm:w-14" />
          </Link>

          {/* 데스크톱 내비게이션 */}
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const active = pathname?.startsWith(item.href);
              const badge = badgeFor(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? item.highlight
                        ? "bg-royal-500 text-white shadow-royal"
                        : "bg-primary-50 text-primary-700"
                      : item.highlight
                      ? // 눈에 띄게: 보라색 배경으로 다른 메뉴와 구분
                        "bg-royal-50 text-royal-700 hover:-translate-y-0.5 hover:bg-royal-100 hover:shadow-royal"
                      : "text-ink-500 hover:-translate-y-0.5 hover:bg-royal-50 hover:text-royal-700"
                  }`}
                >
                  {item.label}
                  {badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-[pop_0.25s_ease-out] items-center justify-center rounded-full bg-accent-300 text-[11px] font-bold text-ink-900">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <Link
              href="/notifications"
              aria-label="알림"
              className={`rounded-full p-2 transition-all duration-200 ${
                pathname?.startsWith("/notifications")
                  ? "bg-primary-50 text-primary-700"
                  : "text-ink-500 hover:-translate-y-0.5 hover:bg-royal-50 hover:text-royal-700"
              }`}
            >
              <Bell size={18} />
            </Link>

            <div className="ml-2 flex items-center gap-2 border-l border-ink-100 pl-3">
              {user ? (
                <>
                  <Link
                    href="/mypage"
                    className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                      pathname?.startsWith("/mypage") || pathname === "/account"
                        ? "bg-primary-50 text-primary-700"
                        : "text-ink-500 hover:-translate-y-0.5 hover:bg-royal-50 hover:text-royal-700"
                    }`}
                  >
                    <User size={16} />
                    마이페이지
                  </Link>
                  <button
                    type="button"
                    onClick={signOutAndClear}
                    aria-label="로그아웃"
                    className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-ink-300 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-700"
                  >
                    <LogOut size={14} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="rounded-full bg-primary-500 px-4 py-2 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0 active:scale-95"
                >
                  로그인
                </button>
              )}
            </div>
          </nav>

          {/* 마이페이지 화면에서만 — 여기까지 온 로그인 사용자에게 돌봄요청을 눈에 띄게 보여준다 */}
          {user && pathname?.startsWith("/mypage") && (
            <Link
              href="/care-request"
              className="mr-1 flex items-center rounded-full bg-royal-500 px-3 py-1.5 text-xs font-bold text-white shadow-royal transition-transform active:scale-95 sm:hidden"
            >
              돌봄 요청
            </Link>
          )}

          {/* 모바일 햄버거 버튼 */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors duration-200 hover:bg-ink-100 active:scale-95 sm:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
            {!menuOpen && mobileBadgeCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-300 px-1 text-[10px] font-bold text-ink-900">
                {mobileBadgeCount}
              </span>
            )}
          </button>
        </div>

        {/* 모바일 드롭다운 메뉴 */}
        {menuOpen && (
          <div className="border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
            <nav className="flex flex-col gap-1">
              {mobileNavItems.map((item) => {
                const active = pathname?.startsWith(item.href);
                const badge = badgeFor(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-colors duration-200 ${
                      active
                        ? item.highlight
                          ? "bg-royal-500 text-white"
                          : "bg-primary-50 text-primary-700"
                        : item.highlight
                        ? "bg-royal-50 text-royal-700"
                        : "text-ink-700 hover:bg-ink-100"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {item.label}
                      {item.highlight && !active && (
                        <span className="rounded-full bg-royal-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          NEW
                        </span>
                      )}
                    </span>
                    {badge > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-300 px-1.5 text-xs font-bold text-ink-900">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              <Link
                href="/notifications"
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition-colors duration-200 ${
                  pathname?.startsWith("/notifications")
                    ? "bg-primary-50 text-primary-700"
                    : "text-ink-700 hover:bg-ink-100"
                }`}
              >
                <Bell size={18} />
                알림
              </Link>
              {/* 마이페이지(로그인 포함)는 하단 탭바로 옮겨서 여기선 뺐다 —
                  로그아웃은 마이페이지 화면 안에 이미 있음(app/mypage/page.tsx). */}
            </nav>
          </div>
        )}
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
