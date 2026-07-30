"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake, Settings, Briefcase, Wallet, Bell, ChevronRight } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function MyPageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSitter, setIsSitter] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sitter-profile")
      .then((r) => {
        if (!cancelled) setIsSitter(r.ok);
      })
      .catch(() => {
        if (!cancelled) setIsSitter(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const infoItems: NavItem[] = [
    { href: "/mypage", label: "계정 설정", icon: <Settings size={16} /> },
    { href: "/mypage/edit", label: "정보 수정", icon: <ChevronRight size={16} /> },
  ];

  const sitterItems: NavItem[] = [
    { href: "/mypage/sitter/profile", label: "프로필 관리", icon: <HeartHandshake size={16} /> },
    { href: "/mypage/sitter/jobs", label: "일자리 관리", icon: <Briefcase size={16} /> },
    { href: "/mypage/sitter/settlements", label: "정산 관리", icon: <Wallet size={16} /> },
    { href: "/mypage/sitter/notifications", label: "알림 설정", icon: <Bell size={16} /> },
  ];

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 sm:w-full ${
          active ? "bg-primary-50 text-primary-700" : "text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
        }`}
      >
        {item.icon}
        {item.label}
      </Link>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:flex sm:gap-8">
      <aside className="mb-4 sm:mb-0 sm:w-52 sm:shrink-0">
        <h1 className="mb-4 hidden text-lg font-bold text-ink-900 sm:block">마이페이지</h1>

        <p className="mb-1.5 hidden px-1 text-xs font-semibold text-ink-300 sm:block">내 정보</p>
        <nav className="flex gap-1.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-col sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {infoItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <p className="mb-1.5 mt-4 hidden px-1 text-xs font-semibold text-ink-300 sm:block">
          모심시터
        </p>
        <nav className="mt-2 flex gap-1.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-0 sm:flex-col sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {isSitter ? (
            sitterItems.map((item) => <NavLink key={item.href} item={item} />)
          ) : (
            <Link
              href="/mypage/sitter/register"
              className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-primary-300 bg-primary-50 px-3.5 py-2.5 text-sm font-semibold text-primary-600 transition-colors duration-150 hover:bg-primary-100 sm:w-full"
            >
              <HeartHandshake size={16} />
              모심시터 등록하기
            </Link>
          )}
        </nav>
      </aside>

      <div className="flex-1">{children}</div>
    </main>
  );
}
