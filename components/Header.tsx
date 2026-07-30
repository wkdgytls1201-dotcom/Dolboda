"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { useCompare } from "@/lib/compareContext";
import { useFavorites } from "@/lib/favoritesContext";
import { useSession, signOut } from "next-auth/react";
import { AuthModal } from "./AuthModal";
import { Logo } from "./Logo";

const NAV = [
  { href: "/search", label: "시설 찾기" },
  { href: "/compare", label: "비교하기" },
  { href: "/favorites", label: "관심시설" },
];

export function Header() {
  const pathname = usePathname();
  const { selectedIds } = useCompare();
  const { favoriteIds } = useFavorites();
  const { data: session } = useSession();
  const user = session?.user;
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center transition hover:opacity-80" aria-label="돌보다 홈">
          <Logo className="h-14 w-14" />
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-primary-50 text-primary-700"
                    : "text-ink-500 hover:-translate-y-0.5 hover:bg-royal-50 hover:text-royal-700"
                }`}
              >
                {item.label}
                {item.href === "/compare" && selectedIds.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-[pop_0.25s_ease-out] items-center justify-center rounded-full bg-accent-300 text-[11px] font-bold text-ink-900">
                    {selectedIds.length}
                  </span>
                )}
                {item.href === "/favorites" && favoriteIds.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-[pop_0.25s_ease-out] items-center justify-center rounded-full bg-accent-300 text-[11px] font-bold text-ink-900">
                    {favoriteIds.length}
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
                <span className="text-sm font-medium text-ink-700">{user.name}</span>
                <button
                  type="button"
                  onClick={() => signOut()}
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
      </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
