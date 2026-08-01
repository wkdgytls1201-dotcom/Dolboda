"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HeartHandshake,
  Settings,
  Briefcase,
  Building2,
  Wallet,
  Bell,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { useSitterProfileContext } from "@/lib/sitterProfileContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** 모바일 그리드 카드에서 라벨 아래 보여줄 한 줄 설명 */
  hint?: string;
}

// 시터 프로필 데이터(SitterProfileProvider)는 app/mypage/layout.tsx에서 한 번만
// 불러와 여기와 하위 화면(프로필관리·정산관리 등)이 공유한다 — 예전엔 화면마다
// /api/sitter-profile를 따로 불러서 페이지를 옮길 때마다 중복 요청이 나갔다.
export function MyPageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSitter } = useSitterProfileContext();

  const infoItems: NavItem[] = [
    { href: "/mypage", label: "계정 설정", icon: <Settings size={16} /> },
    { href: "/mypage/edit", label: "정보 수정", icon: <ChevronRight size={16} /> },
  ];

  // 자주 쓰는 순서대로 — 일자리 확인이 매니저의 주 목적이라 맨 앞에 둔다
  const sitterItems: NavItem[] = [
    { href: "/mypage/sitter/jobs", label: "일자리 관리", icon: <Briefcase size={18} />, hint: "지원·매칭 현황" },
    { href: "/mypage/sitter/profile", label: "프로필 관리", icon: <HeartHandshake size={18} />, hint: "보호자에게 보이는 내 정보" },
    { href: "/mypage/sitter/workplaces", label: "일하기 좋은 시설", icon: <Building2 size={18} />, hint: "근무환경 지수 순" },
    { href: "/mypage/sitter/tips", label: "매니저 가이드", icon: <BookOpen size={18} />, hint: "지원 성공률 높이기" },
    { href: "/mypage/sitter/settlements", label: "정산 관리", icon: <Wallet size={18} />, hint: "계좌 등록" },
    { href: "/mypage/sitter/notifications", label: "알림 설정", icon: <Bell size={18} />, hint: "받을 알림 고르기" },
  ];

  // 모바일에서는 가로 스크롤 대신 2열 그리드 — 예전엔 메뉴 폭이 975px인데 화면이 338px이라
  // 6개 중 2개만 보이고 나머지는 밀어야 나와서, 있는 줄도 모르고 지나쳤다.
  function NavCard({ item }: { item: NavItem }) {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        // 높이를 고정해야 카드가 들쭉날쭉하지 않다(설명 길이가 제각각이라 자동 높이로 두면 어긋난다)
        className={`flex h-[112px] flex-col rounded-2xl px-3.5 py-3 transition-colors duration-150 ${
          active ? "bg-primary-50 ring-1 ring-primary-200" : "bg-white shadow-card"
        }`}
      >
        <span className={`mb-1.5 ${active ? "text-primary-600" : "text-ink-400"}`}>{item.icon}</span>
        <span
          className={`text-sm font-bold leading-tight ${active ? "text-primary-700" : "text-ink-900"}`}
        >
          {item.label}
        </span>
        {item.hint && (
          <span className="mt-auto line-clamp-2 text-[11px] leading-tight text-ink-400">
            {item.hint}
          </span>
        )}
      </Link>
    );
  }

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

        <p className="mb-2 mt-5 px-1 text-xs font-bold text-ink-400 sm:mb-1.5 sm:mt-4 sm:font-semibold sm:text-ink-300">
          돌보다 매니저
        </p>
        {isSitter === null ? (
          // 이미 등록된 시터에게 "등록하기"가 잠깐 떴다 사라지는 걸 막기 위해
          // 확인 끝나기 전(null)엔 아무것도 안 보여준다.
          <div className="h-20 w-full animate-pulse rounded-2xl bg-ink-100/60" aria-hidden />
        ) : isSitter ? (
          <>
            {/* 모바일: 2열 그리드 — 6개가 한 화면에 다 보인다 */}
            <nav className="grid grid-cols-2 gap-2 sm:hidden">
              {sitterItems.map((item) => (
                <NavCard key={item.href} item={item} />
              ))}
            </nav>
            {/* 데스크톱: 기존 사이드바 목록 유지 */}
            <nav className="hidden sm:flex sm:flex-col sm:gap-1.5">
              {sitterItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </>
        ) : (
          <Link
            href="/mypage/sitter/register"
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-300 bg-primary-50 px-3.5 text-sm font-bold text-primary-600 transition-colors duration-150 hover:bg-primary-100 sm:w-full"
          >
            <HeartHandshake size={18} />
            돌보다 매니저 등록하기
          </Link>
        )}
      </aside>

      <div className="flex-1">{children}</div>
    </main>
  );
}
