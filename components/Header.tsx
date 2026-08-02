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
  // 요양 가이드가 앞 — 처음 온 보호자는 "무엇부터 알아야 하는지"를 먼저 찾는다.
  // (모바일 햄버거에는 등급 테스트가 하단 탭바에 있어서 애초에 안 들어간다)
  { href: "/guide", label: "요양 가이드" },
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

  // 메뉴를 열어둔 채 본문을 스크롤하면 닫는다 — 메뉴가 헤더 아래 붙어 있어서, 열어놓고
  // 아래로 내리면 화면 위쪽을 계속 가린 채 따라다닌다("닫는 법"을 찾게 만든다).
  // 40px 여유를 두는 이유: 메뉴가 열리며 레이아웃이 밀릴 때 스크롤 이벤트가 한 번 튀는데,
  // 그걸로 즉시 닫히면 열자마자 사라지는 것처럼 보인다.
  useEffect(() => {
    if (!menuOpen) return;
    const from = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - from) > 40) setMenuOpen(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  const navItems = NAV.filter((item) => !item.authOnly || user);
  // 모바일은 하단 탭바(홈·시설찾기·등급테스트·마이페이지)가 따로 있어서 햄버거에서 겹치는
  // 항목은 뺀다. 로그인 상태면 돌봄 서비스도 상단 버튼으로 빠지니 같이 뺀다.
  // 데스크톱은 탭바가 없으니 navItems를 그대로 쓴다.
  const mobileNavItems = navItems.filter(
    (item) =>
      item.href !== "/search" &&
      item.href !== "/grade-test" &&
      !(item.href === "/services" && user)
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
      {/* padding-top: 앱(웹뷰)에서 상태바·노치 아래로 내용이 파고들지 않게 — 브라우저에선 0 */}
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur [padding-top:var(--safe-top)]">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:h-16">
          <Link
            href="/"
            className="flex items-center gap-1 transition hover:opacity-80"
            aria-label="돌보다 홈"
          >
            <Logo className="h-10 w-10 sm:h-16 sm:w-16" priority />
            {/* 워드마크 — 웹폰트를 새로 얹으면 한글 폰트만 수백 KB라, 시스템 폰트에
                자간·굵기로만 다듬고 색은 사이트 메인 코랄로 맞춰 가볍게 처리.
                글자 높이는 로고의 꽃 부분과 비슷해 보이는 크기 */}
            <span className="text-base font-extrabold leading-none tracking-tight text-primary-500 sm:text-xl">
              돌보다
            </span>
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

          {/* justify-between 아래서 데스크톱 nav가 display:none이 되면 모바일엔 로고·이 그룹
              둘만 남아야 하는데, 묶지 않으면 돌봄요청 버튼이 셋째 아이템으로 화면 가운데에
              떠버린다. 햄버거와 한 그룹으로 묶어서 항상 오른쪽 끝에 붙인다. */}
          <div className="flex items-center gap-2 sm:hidden">
            {/* 마이페이지 화면에서만 — 여기까지 온 로그인 사용자에게 돌봄요청을 눈에 띄게 보여준다 */}
            {user && pathname?.startsWith("/mypage") && (
              <Link
                href="/care-request"
                className="flex min-h-[44px] items-center rounded-full bg-royal-500 px-3.5 text-xs font-bold text-white shadow-royal transition-transform active:scale-95"
              >
                돌봄 요청
              </Link>
            )}
            {/* 마이페이지가 아닌 다른 화면에서는 로그인 사용자에게 돌봄 서비스를 대신 보여준다
                (햄버거 안에 있던 걸 여기로 옮긴 것 — 로그인 전엔 그대로 햄버거 안에 남아있음) */}
            {user && !pathname?.startsWith("/mypage") && (
              <Link
                href="/services"
                className="flex min-h-[44px] items-center rounded-full bg-primary-500 px-3.5 text-xs font-bold text-white shadow-soft transition-transform active:scale-95"
              >
                돌봄 서비스
              </Link>
            )}

            {/* 모바일 햄버거 버튼 */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={menuOpen}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 active:scale-95 ${
                menuOpen ? "bg-primary-500 text-white shadow-soft" : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              {/* 두 아이콘을 겹쳐두고 회전+투명도로 교차 — 햄버거가 돌면서 X로 바뀌는 느낌.
                  열림 상태에선 코랄 배경 + 흰 X라 "누르면 닫힌다"가 한눈에 보인다 */}
              <span className="relative block h-[22px] w-[22px]" aria-hidden>
                <Menu
                  size={22}
                  className={`absolute inset-0 transition-all duration-300 ease-snappy ${
                    menuOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
                  }`}
                />
                <X
                  size={22}
                  className={`absolute inset-0 transition-all duration-300 ease-snappy ${
                    menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
                  }`}
                />
              </span>
              {!menuOpen && mobileBadgeCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-300 px-1 text-[10px] font-bold text-ink-900">
                  {mobileBadgeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 모바일 드롭다운 메뉴 — 오른쪽 정렬(엄지 닿는 쪽), 장식 없이 텍스트 위주로 깔끔하게.
            현재 화면 항목만 옅은 배경으로 표시하고, 로그아웃은 구분선 아래에 옅게 분리한다. */}
        {menuOpen && (
          <div className="border-t border-ink-100 bg-white/95 px-4 py-2 backdrop-blur sm:hidden">
            <nav className="flex flex-col">
              {mobileNavItems.map((item) => {
                const active = pathname?.startsWith(item.href);
                const badge = badgeFor(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-[52px] items-center justify-end gap-2 rounded-xl px-4 py-3 text-right text-base transition-colors duration-200 ${
                      active
                        ? "bg-primary-50 font-bold text-primary-700"
                        : item.highlight
                        ? "font-bold text-royal-600"
                        : "font-medium text-ink-700 hover:bg-ink-100"
                    }`}
                  >
                    {badge > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-300 px-1.5 text-xs font-bold text-ink-900">
                        {badge}
                      </span>
                    )}
                    {item.label}
                    {item.highlight && !active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-royal-500" aria-hidden />
                    )}
                  </Link>
                );
              })}

              <Link
                href="/notifications"
                className={`flex min-h-[52px] items-center justify-end rounded-xl px-4 py-3 text-base transition-colors duration-200 ${
                  pathname?.startsWith("/notifications")
                    ? "bg-primary-50 font-bold text-primary-700"
                    : "font-medium text-ink-700 hover:bg-ink-100"
                }`}
              >
                알림
              </Link>

              {/* 마이페이지는 보통 하단 탭바로 가지만, 시설 상세·등급테스트·돌봄요청처럼
                  자체 하단 CTA 바가 있는 화면에서는 탭바가 숨겨진다(MobileTabBar의
                  HIDDEN_PREFIXES). 그 화면에서 햄버거에도 없으면 마이페이지로 갈 방법이
                  아예 없어져서 — 실제로 시설 상세에서 막혔다 — 여기에도 항상 둔다. */}
              {user && (
                <Link
                  href="/mypage"
                  className={`flex min-h-[52px] items-center justify-end rounded-xl px-4 py-3 text-base transition-colors duration-200 ${
                    pathname?.startsWith("/mypage") || pathname === "/account"
                      ? "bg-primary-50 font-bold text-primary-700"
                      : "font-medium text-ink-700 hover:bg-ink-100"
                  }`}
                >
                  마이페이지
                </Link>
              )}

              {/* 로그아웃은 몇 번 눌러야 닿는 마이페이지 화면까지 안 가도 여기서 바로 되게. */}
              {user && (
                <button
                  type="button"
                  onClick={signOutAndClear}
                  className="mt-1 flex w-full items-center justify-end border-t border-ink-100 px-4 pb-2 pt-3 text-sm font-medium text-ink-400 transition-colors duration-200 hover:text-ink-700 active:scale-95"
                >
                  로그아웃
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
