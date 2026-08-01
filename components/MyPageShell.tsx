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
  ChevronLeft,
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
  // 모바일에서는 /mypage 루트가 메뉴 허브, 서브 화면은 콘텐츠만 보여준다.
  // 예전엔 매니저 메뉴 블록(대표 카드+그리드)이 모든 서브 화면 위에 그대로 깔려서,
  // 보호자 프로필을 만들러 들어가도 매니저 메뉴가 한 화면을 다 차지했다.
  const atRoot = pathname === "/mypage";

  const infoItems: NavItem[] = [
    { href: "/mypage", label: "계정 설정", icon: <Settings size={16} /> },
    { href: "/mypage/care-profile", label: "보호자 프로필", icon: <HeartHandshake size={16} /> },
    { href: "/mypage/edit", label: "정보 수정", icon: <ChevronRight size={16} /> },
  ];

  // 자주 쓰는 순서대로 — 일자리 확인이 매니저의 주 목적이라 맨 앞에 둔다.
  // 모바일에서는 이 순서가 그대로 위계가 된다: 대표 카드(일자리) → 그리드 4개 → 알림은 얇은 줄.
  const sitterItems: NavItem[] = [
    { href: "/mypage/sitter/jobs", label: "일자리 관리", icon: <Briefcase size={20} />, hint: "새 일자리와 지원·매칭 현황" },
    { href: "/mypage/sitter/profile", label: "프로필 관리", icon: <HeartHandshake size={18} />, hint: "보호자에게 보이는 내 정보" },
    { href: "/mypage/sitter/workplaces", label: "일하기 좋은 시설", icon: <Building2 size={18} />, hint: "근무환경 지수 순" },
    { href: "/mypage/sitter/tips", label: "매니저 가이드", icon: <BookOpen size={18} />, hint: "지원 성공률 높이기" },
    { href: "/mypage/sitter/settlements", label: "정산 관리", icon: <Wallet size={18} />, hint: "계좌 등록" },
    { href: "/mypage/sitter/notifications", label: "알림 설정", icon: <Bell size={18} />, hint: "받을 알림 고르기" },
  ];
  const [primaryItem, ...restItems] = sitterItems;
  const gridItems = restItems.slice(0, 4);
  const compactItems = restItems.slice(4);

  // 모바일 대표 카드 — 매니저가 들어오는 첫 목적(일자리)을 한눈에 띄게.
  // 보호자용 "진행 중 돌봄 요청" 카드가 보라(royal) 그라데이션이라, 매니저 대표 카드는
  // 브랜드 코랄로 구분한다. 현재 화면일 때는 흰 배경 + 링으로 바꿔 "여기 있음"을 알린다.
  function PrimaryNavCard({ item }: { item: NavItem }) {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3.5 rounded-2xl px-4 py-4 transition-all duration-150 active:scale-[0.98] ${
          active
            ? "bg-white ring-2 ring-primary-300"
            : "bg-gradient-to-br from-primary-500 to-peach-500 shadow-soft"
        }`}
      >
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            active ? "bg-primary-50 text-primary-600" : "bg-white/20 text-white"
          }`}
        >
          {item.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-base font-extrabold leading-snug ${
              active ? "text-primary-700" : "text-white"
            }`}
          >
            {item.label}
          </span>
          {item.hint && (
            <span
              className={`mt-0.5 block text-[13px] leading-snug ${
                active ? "text-ink-400" : "text-white/85"
              }`}
            >
              {item.hint}
            </span>
          )}
        </span>
        <ChevronRight
          size={18}
          className={`shrink-0 ${active ? "text-primary-400" : "text-white/70"}`}
        />
      </Link>
    );
  }

  // 얇은 한 줄짜리 — 알림 설정처럼 가끔 한 번 들어가는 메뉴는 카드 자리를 차지할 필요가 없다
  function CompactNavRow({ item }: { item: NavItem }) {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-4 transition-colors duration-150 active:scale-[0.99] ${
          active ? "bg-primary-50 ring-1 ring-primary-200" : "bg-white shadow-card"
        }`}
      >
        <span className={active ? "text-primary-600" : "text-ink-400"}>{item.icon}</span>
        <span
          className={`flex-1 text-[15px] font-bold ${active ? "text-primary-700" : "text-ink-900"}`}
        >
          {item.label}
        </span>
        {item.hint && <span className="text-[12px] text-ink-300">{item.hint}</span>}
        <ChevronRight size={16} className="shrink-0 text-ink-200" />
      </Link>
    );
  }

  // 모바일에서는 가로 스크롤 대신 2열 그리드 — 예전엔 메뉴 폭이 975px인데 화면이 338px이라
  // 6개 중 2개만 보이고 나머지는 밀어야 나와서, 있는 줄도 모르고 지나쳤다.
  function NavCard({ item }: { item: NavItem }) {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        // 높이는 그리드의 auto-rows-fr가 맞춰준다 — 예전엔 h-[112px]로 못박아뒀는데
        // 글자를 키우면 설명이 잘려나가서, 가장 긴 카드에 맞춰 같이 자라게 바꿨다.
        className={`flex flex-col rounded-2xl p-4 transition-all duration-150 active:scale-[0.98] ${
          active
            ? "bg-primary-50 ring-1 ring-primary-200"
            : "bg-white shadow-card hover:shadow-card-hover"
        }`}
      >
        <span
          className={`mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl ${
            active ? "bg-white text-primary-600 shadow-soft" : "bg-ivory-100 text-ink-400"
          }`}
        >
          {item.icon}
        </span>
        <span
          className={`text-[15px] font-bold leading-snug ${
            active ? "text-primary-700" : "text-ink-900"
          }`}
        >
          {item.label}
        </span>
        {item.hint && (
          <span className="mt-1.5 text-[12px] leading-snug text-ink-400">{item.hint}</span>
        )}
      </Link>
    );
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors duration-150 sm:w-full ${
          active ? "bg-primary-50 text-primary-700" : "text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
        }`}
      >
        <span className="shrink-0">{item.icon}</span>
        {item.label}
      </Link>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:flex sm:gap-9">
      <aside className={`${atRoot ? "mb-6" : "hidden"} sm:mb-0 sm:block sm:w-56 sm:shrink-0`}>
        <h1 className="mb-5 hidden text-lg font-bold text-ink-900 sm:block">마이페이지</h1>

        <p className="mb-2 hidden px-1 text-[13px] font-semibold text-ink-300 sm:block">내 정보</p>
        {/* 2개뿐이라 가로 스크롤을 둘 이유가 없다 — 좁은 화면에서도 줄바꿈이면 충분하다 */}
        <nav className="flex flex-wrap gap-2 sm:flex-col sm:gap-1.5">
          {infoItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <p className="mb-2.5 mt-6 px-1 text-[13px] font-bold text-ink-500 sm:mb-2 sm:mt-5 sm:font-semibold sm:text-ink-300">
          돌보다 매니저
        </p>
        {isSitter === null ? (
          // 이미 등록된 시터에게 "등록하기"가 잠깐 떴다 사라지는 걸 막기 위해
          // 확인 끝나기 전(null)엔 아무것도 안 보여준다.
          <div className="h-24 w-full animate-pulse rounded-2xl bg-ink-100/60" aria-hidden />
        ) : isSitter ? (
          <>
            {/* 모바일: 대표 카드(일자리) → 2×2 그리드 → 얇은 줄(알림).
                6개를 동급으로 깔면 정작 매일 쓰는 일자리 관리가 묻힌다 — 쓰는 빈도가 곧 크기다.
                auto-rows-fr로 같은 줄 카드의 높이를 서로 맞춘다 */}
            <nav className="flex flex-col gap-2.5 sm:hidden">
              <PrimaryNavCard item={primaryItem} />
              <div className="grid auto-rows-fr grid-cols-2 gap-2.5">
                {gridItems.map((item) => (
                  <NavCard key={item.href} item={item} />
                ))}
              </div>
              {compactItems.map((item) => (
                <CompactNavRow key={item.href} item={item} />
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
            className="flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-300 bg-primary-50 px-4 text-[15px] font-bold text-primary-600 transition-colors duration-150 hover:bg-primary-100 sm:w-full"
          >
            <HeartHandshake size={18} />
            돌보다 매니저 등록하기
          </Link>
        )}
      </aside>

      <div className="flex-1">
        {/* 서브 화면 모바일 전용 — 메뉴 대신 마이페이지로 돌아가는 길만 한 줄 남긴다 */}
        {!atRoot && (
          <Link
            href="/mypage"
            className="-ml-2 mb-3 inline-flex min-h-[44px] items-center gap-0.5 px-2 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:text-ink-900 sm:hidden"
          >
            <ChevronLeft size={18} />
            마이페이지
          </Link>
        )}
        {children}
      </div>
    </main>
  );
}
