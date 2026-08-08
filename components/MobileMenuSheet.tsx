"use client";

// 모바일 전체 메뉴 시트 (2026-08-05 — 50~70대 타깃 개편).
// 기존 우측 정렬 드롭다운을 대체한다. 원칙:
// - 라벨 없는 햄버거가 문제였지 아이콘이 문제가 아니다 → 버튼은 "☰ 메뉴"(Header 쪽).
// - 시트는 "여기 열면 다 있다"가 목적이라 탭바와의 중복을 일부러 허용한다.
// - 사양(사용자 지정): 제목 17px/600 · 그룹 14px 진회색 · 설명 13.5px · 아이콘 22px ·
//   행 60px · 좌우 20px · 터치 48px+ · 화살표/숫자 우측 · 슬라이드 280ms ·
//   뒤 검정 30% + 약한 블러.
// 되돌리기: Header의 USE_SHEET_MENU를 false로 — 예전 드롭다운 코드가 그대로 남아 있다.

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Gift,
  Heart,
  HeartHandshake,
  Scale,
  Search,
  User,
  X,
} from "lucide-react";
import { useCompare } from "@/lib/compareContext";
import { useFavorites } from "@/lib/favoritesContext";
import { signOutAndClear } from "@/lib/signOutAndClear";

interface MenuRow {
  href: string;
  label: string;
  desc?: string;
  icon: React.ReactNode;
  badge?: number;
  authOnly?: boolean;
}

interface MenuGroup {
  title: string;
  rows: MenuRow[];
}

function Row({ row, active, onClose }: { row: MenuRow; active: boolean; onClose: () => void }) {
  return (
    <Link
      href={row.href}
      onClick={onClose}
      className={`flex min-h-[60px] items-center gap-3.5 rounded-2xl px-2 py-2 transition-colors duration-150 active:bg-primary-50 ${
        active ? "bg-primary-50" : "hover:bg-ivory-100"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-white text-primary-600 shadow-soft" : "bg-ivory-100 text-ink-500"
        }`}
      >
        {row.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-lg font-semibold leading-snug ${
            active ? "text-primary-700" : "text-ink-900"
          }`}
        >
          {row.label}
        </span>
        {row.desc && (
          <span className="block truncate text-[13px] leading-snug text-ink-500">{row.desc}</span>
        )}
      </span>
      {row.badge !== undefined && row.badge > 0 && (
        <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-accent-300 px-1.5 text-[13px] font-bold text-ink-900">
          {row.badge}
        </span>
      )}
      <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden />
    </Link>
  );
}

export function MobileMenuSheet({
  isLoggedIn,
  onClose,
  onLogin,
}: {
  isLoggedIn: boolean;
  onClose: () => void;
  onLogin: () => void;
}) {
  const pathname = usePathname();
  const { selectedIds } = useCompare();
  const { favoriteIds } = useFavorites();

  // ⚠️ 여기엔 useBackToClose를 쓰지 않는다(2026-08-08 판단).
  //    이 시트는 존재 목적이 "다른 화면으로 이동"이라 거의 매번 링크를 타고 나간다.
  //    히스토리를 한 칸 쌓아두면 이동한 뒤 뒤로가기를 눌렀을 때 그 빈 칸을 먼저 밟아
  //    "뒤로가기가 한 번 헛도는" 증상이 사용할 때마다 생긴다. 뒤로가기로 닫히는 이득보다
  //    그 부작용이 크다. 이동이 목적이 아닌 오버레이(로그인·상담·필터 시트)에만 적용한다.
  //
  // 열려 있는 동안 본문 스크롤 잠금 + ESC 닫기
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const groups: MenuGroup[] = [
    {
      title: "시설 찾기",
      rows: [
        { href: "/search", label: "시설 검색", desc: "지도와 필터로 전국 시설 찾기", icon: <Search size={22} /> },
        { href: "/compare", label: "시설 비교", desc: "최대 3곳 나란히 보기", icon: <Scale size={22} />, badge: selectedIds.length },
        { href: "/favorites", label: "관심 시설", desc: "찜해둔 시설과 빈자리 알림", icon: <Heart size={22} />, badge: favoriteIds.length },
      ],
    },
    {
      title: "돌봄 준비",
      rows: [
        { href: "/guide", label: "요양 가이드", desc: "비용·제도, 가장 많이 묻는 질문", icon: <BookOpen size={22} /> },
        { href: "/grade-test", label: "등급 테스트", desc: "3분이면 예상 등급 확인", icon: <ClipboardCheck size={22} /> },
        { href: "/welfare-equipment", label: "복지용구 혜택", desc: "연 한도 잔액 계산", icon: <Gift size={22} /> },
      ],
    },
    {
      title: "돌봄 매칭",
      rows: [
        { href: "/services", label: "돌봄 서비스", desc: "간병·가사·자택 돌봄 안내", icon: <HeartHandshake size={22} /> },
        { href: "/care-request", label: "돌봄 요청", desc: "매니저에게 지원받기", icon: <ClipboardList size={22} />, authOnly: true },
      ],
    },
    {
      title: "내 계정",
      rows: [
        { href: "/mypage", label: "마이페이지", icon: <User size={22} />, authOnly: true },
        { href: "/notifications", label: "알림", desc: "받아볼 소식 관리", icon: <Bell size={22} /> },
        { href: "/mypage/points", label: "돌봄 포인트", desc: "후기·감사가 쌓이는 리워드", icon: <Coins size={22} />, authOnly: true },
        { href: "/business", label: "기업회원", desc: "시설 운영자이신가요?", icon: <Building2 size={22} /> },
      ],
    },
  ];

  const body = (
    // lg:hidden — Header의 햄버거 그룹(lg:hidden)과 반드시 같은 경계여야 한다.
    // sm:hidden이던 시절엔 640~1023px에서 메뉴 버튼은 보이는데 이 시트가 display:none이라
    // 눌러도 아무것도 안 열렸다(2026-08-08 헤더 가로스크롤 수정과 한 쌍).
    <div className="fixed inset-0 z-[80] lg:hidden">
      <style>{`
        @keyframes menu-sheet-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes menu-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .menu-sheet, .menu-backdrop { animation: none !important; }
        }
      `}</style>

      {/* 뒤 배경 — 검정 30% + 약한 블러(사양) */}
      <button
        type="button"
        aria-label="메뉴 닫기"
        onClick={onClose}
        className="menu-backdrop absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        style={{ animation: "menu-backdrop-in 200ms ease-out both" }}
      />

      {/* 오른쪽 슬라이드 시트 — 280ms(사양 250~300ms) */}
      <div
        role="dialog"
        aria-label="전체 메뉴"
        className="menu-sheet absolute bottom-0 right-0 top-0 flex w-[320px] max-w-[85vw] flex-col bg-white shadow-[-12px_0_40px_rgba(27,23,48,0.18)]"
        style={{ animation: "menu-sheet-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <span className="text-lg font-extrabold text-primary-500">돌보다</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="-mr-2 flex h-12 w-12 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogin();
              }}
              className="mb-2 mt-1 flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-primary-500 text-lg font-bold text-white shadow-soft transition-all duration-150 hover:bg-primary-600 active:scale-[0.98]"
            >
              간편하게 시작하기
            </button>
          )}

          {groups.map((group) => {
            const rows = group.rows.filter((r) => !r.authOnly || isLoggedIn);
            if (rows.length === 0) return null;
            return (
              <div key={group.title} className="mt-4">
                <p className="px-2 pb-1 text-[14px] font-bold text-ink-600">{group.title}</p>
                {rows.map((row) => (
                  <Row
                    key={row.href}
                    row={row}
                    active={row.href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(row.href))}
                    onClose={onClose}
                  />
                ))}
              </div>
            );
          })}

          {/* 회사·약관 — 푸터에서 흡수. 푸터(ink-300대)보다 진한 ink-600으로(사양) */}
          <div className="mt-6 border-t border-ink-100 pt-4">
            <p className="flex flex-wrap gap-x-4 gap-y-2.5 px-2 text-[13px] font-medium text-ink-600">
              <Link href="/about" onClick={onClose} className="py-1">회사 소개</Link>
              <Link href="/data-policy" onClick={onClose} className="py-1">데이터 출처</Link>
              <Link href="/editorial-policy" onClick={onClose} className="py-1">콘텐츠 원칙</Link>
              <Link href="/terms" onClick={onClose} className="py-1">이용약관</Link>
              <Link href="/privacy" onClick={onClose} className="py-1">개인정보처리방침</Link>
            </p>
          </div>

          {isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                onClose();
                signOutAndClear();
              }}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl text-[14px] font-medium text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              로그아웃
            </button>
          )}
        </nav>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
