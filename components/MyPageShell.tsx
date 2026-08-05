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
  ClipboardCheck,
  ClipboardList,
  NotebookPen,
  Gift,
  Heart,
  Scale,
} from "lucide-react";
import { useSitterProfileContext } from "@/lib/sitterProfileContext";
import { useMyPageRole } from "@/lib/mypageRoleContext";
import { MyPageRoleCard } from "./MyPageRoleCard";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** 모바일 그리드 카드에서 라벨 아래 보여줄 한 줄 설명 */
  hint?: string;
  /** 카드 우상단에 붙는 작은 강조 띠 (예: "추천") */
  ribbon?: string;
}

// 얇은 한 줄짜리 — 알림 설정처럼 가끔 한 번 들어가는 메뉴는 카드 자리를 차지할 필요가 없다
function CompactNavRow({ item, delayIndex }: { item: NavItem; delayIndex?: number }) {
  const pathname = usePathname();
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      className={`animate-fade-up flex min-h-[52px] items-center gap-3 rounded-2xl px-4 transition-colors duration-150 active:scale-[0.99] ${
        active ? "bg-primary-50 ring-1 ring-primary-200" : "bg-white shadow-card"
      }`}
      style={delayIndex !== undefined ? { animationDelay: `${delayIndex * 70}ms` } : undefined}
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

// 가끔 들춰보는 기록 메뉴(등급 테스트·상담 신청 내역) — 마이페이지 첫 화면에서
// 대시보드 "바로 아래"에 놓으라고 page.tsx가 직접 가져다 쓴다.
// 예전엔 셸이 {children} 뒤에 그렸는데, children(계정 페이지)의 맨 끝이 한참 아래
// 내려간 회원탈퇴라 이 메뉴가 탈퇴보다 아래로 떨어졌다 — 버그처럼 보였고 동선도 나빴다.
// 데스크톱은 사이드바(infoItems)에 상담 내역이, 상단 내비에 등급 테스트가 그대로 있다.
const GUARDIAN_RECORD_ITEMS: NavItem[] = [
  {
    href: "/grade-test",
    label: "등급 테스트",
    icon: <ClipboardCheck size={18} />,
    hint: "1분 자가진단",
  },
  {
    href: "/mypage/consults",
    label: "상담 신청 내역",
    icon: <ClipboardList size={18} />,
    hint: "시설에 남긴 상담",
  },
];

export function GuardianRecordsMenu() {
  const { role } = useMyPageRole();
  if (role !== "guardian") return null;
  return (
    <nav className="mt-6 flex flex-col gap-2.5 sm:hidden">
      {GUARDIAN_RECORD_ITEMS.map((item, i) => (
        <CompactNavRow key={item.href} item={item} delayIndex={i} />
      ))}
    </nav>
  );
}

// 시터 프로필 데이터(SitterProfileProvider)는 app/mypage/layout.tsx에서 한 번만
// 불러와 여기와 하위 화면(프로필관리·정산관리 등)이 공유한다 — 예전엔 화면마다
// /api/sitter-profile를 따로 불러서 페이지를 옮길 때마다 중복 요청이 나갔다.
export function MyPageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSitter } = useSitterProfileContext();
  const { role } = useMyPageRole();
  // 모바일에서는 /mypage 루트가 메뉴 허브, 서브 화면은 콘텐츠만 보여준다.
  // 예전엔 매니저 메뉴 블록(대표 카드+그리드)이 모든 서브 화면 위에 그대로 깔려서,
  // 보호자 프로필을 만들러 들어가도 매니저 메뉴가 한 화면을 다 차지했다.
  const atRoot = pathname === "/mypage";

  const infoItems: NavItem[] = [
    { href: "/mypage", label: "계정 설정", icon: <Settings size={16} /> },
    { href: "/care-request", label: "돌봄 신청 내역", icon: <HeartHandshake size={16} /> },
    { href: "/mypage/welfare-benefit", label: "복지용구 혜택", icon: <Gift size={16} /> },
    { href: "/mypage/care-profile", label: "보호자 프로필", icon: <HeartHandshake size={16} /> },
    { href: "/mypage/consults", label: "상담 신청 내역", icon: <ClipboardList size={16} /> },
    { href: "/mypage/edit", label: "정보 수정", icon: <ChevronRight size={16} /> },
  ];

  // 보호자 메뉴 — 매니저 쪽과 **같은 문법**(대표 카드 → 2×2 그리드 → 얇은 줄)으로 맞췄다.
  //
  // 대표 카드는 돌봄 신청(매칭) 내역이다. 시설 상담은 대부분 검색하고 바로 전화해버려서
  // "상담 신청 내역"을 다시 보러 오는 일이 드물다 — 반면 돌봄 요청은 매니저 지원·매칭이
  // 이 안에서 진행되므로 돌아와서 확인할 이유가 실제로 있다. 상담 내역은 지우지 않고
  // 얇은 줄로 내렸다(기존 기능 제거 아님).
  const guardianItems: NavItem[] = [
    {
      href: "/care-request",
      label: "돌봄 신청 내역",
      icon: <HeartHandshake size={20} />,
      hint: "매니저 지원·매칭 현황",
    },
    // 복지용구 혜택 — 연 160만원 한도인데 몰라서 못 쓰는 사람이 많아 그리드 상단에
    // 강조해서 배치한다(등급테스트는 상단 내비·하단 탭바에 이미 다른 진입점이 있어
    // 여기서는 얇은 줄로 내려도 접근성이 줄지 않는다).
    {
      href: "/mypage/welfare-benefit",
      label: "복지용구 혜택",
      icon: <Gift size={18} />,
      hint: "연 160만원 한도",
      ribbon: "혜택",
    },
    {
      href: "/mypage/care-profile",
      label: "보호자 프로필",
      icon: <HeartHandshake size={18} />,
      hint: "저장해두고 재사용",
    },
    { href: "/favorites", label: "관심 시설", icon: <Heart size={18} />, hint: "찜해둔 시설" },
    { href: "/compare", label: "시설 비교", icon: <Scale size={18} />, hint: "최대 3곳 나란히" },
    // 등급 테스트·상담 신청 내역은 GUARDIAN_RECORD_ITEMS(모듈 상단)로 옮겼다 —
    // 대시보드 아래 자리에 page.tsx가 직접 그린다.
    // 정보 수정은 여기 두지 않는다 — 역할 카드 앞면에 이미 버튼이 있어 한 화면에
    // 같은 링크가 두 번 나왔다. 데스크톱 사이드바(infoItems)에도 그대로 남아 있다.
  ];
  const [guardianPrimary, ...guardianGrid] = guardianItems;

  // 모바일에서는 이 순서가 그대로 위계가 된다: 대표 카드 → 그리드 → 얇은 줄.
  // 대표 카드는 돌봄일지 관리(2026-08-05 사용자 지시) — 바로 아래 대시보드 카드가
  // 지원중·매칭·완료 숫자로 일자리 관리에 이미 직행하고 있어, 대표 자리에 일자리를
  // 두면 같은 목적지가 연달아 두 번 나왔다. 일자리 관리는 얇은 줄로 남긴다.
  const sitterItems: NavItem[] = [
    { href: "/care-request/care-log", label: "돌봄일지 관리", icon: <NotebookPen size={20} />, hint: "오늘 기록 남기고 보호자 반응 확인" },
    { href: "/mypage/sitter/jobs", label: "일자리 관리", icon: <Briefcase size={18} />, hint: "새 일자리와 지원·매칭 현황" },
    { href: "/mypage/sitter/profile", label: "매니저 프로필", icon: <HeartHandshake size={18} />, hint: "보호자에게 보이는 내 정보" },
    { href: "/mypage/sitter/workplaces", label: "일하기 좋은 시설", icon: <Building2 size={18} />, hint: "근무환경 지수 순", ribbon: "돌보다 단독" },
    { href: "/mypage/sitter/tips", label: "매니저 가이드", icon: <BookOpen size={18} />, hint: "지원 성공률 높이기", ribbon: "꿀팁" },
    { href: "/mypage/sitter/settlements", label: "정산 관리", icon: <Wallet size={18} />, hint: "계좌 등록" },
    { href: "/mypage/sitter/notifications", label: "알림 설정", icon: <Bell size={18} />, hint: "받을 알림 고르기" },
  ];
  // 모바일 위계: 대표 카드(일자리) → 네모 카드 2개 → 얇은 줄.
  //
  // 프로필 관리는 네모 카드에서 뺐다 — 바로 위 역할 카드 앞면에 이미 "프로필 관리"
  // 버튼이 있어 한 화면에 같은 링크가 두 번 나왔다(데스크톱 사이드바에는 그대로 있다).
  // 정산 관리·알림 설정은 가끔 한 번 들어가는 곳이라 얇은 줄로 내린다.
  const [primaryItem] = sitterItems;
  const CARD_HREFS = ["/mypage/sitter/workplaces", "/mypage/sitter/tips"];
  const gridItems = sitterItems.filter((i) => CARD_HREFS.includes(i.href));
  const compactItems = sitterItems.filter(
    (i) => i !== primaryItem && !CARD_HREFS.includes(i.href) && i.href !== "/mypage/sitter/profile"
  );

  // 모바일 대표 카드 — 각 역할이 들어오는 첫 목적을 한눈에 띄게.
  // 색으로 역할을 구분한다: 보호자는 보라(royal), 매니저는 브랜드 코랄.
  // 역할 카드 앞·뒷면과 같은 색이라, 전환했을 때 화면 전체 톤이 함께 바뀌어
  // "지금 다른 모드에 있다"가 글자를 읽지 않아도 전달된다.
  // 현재 화면일 때는 흰 배경 + 링으로 바꿔 "여기 있음"을 알린다.
  function PrimaryNavCard({ item, tone }: { item: NavItem; tone: "guardian" | "manager" }) {
    const active = pathname === item.href;
    const guardian = tone === "guardian";
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3.5 rounded-2xl px-4 py-4 transition-all duration-150 active:scale-[0.98] ${
          active
            ? `bg-white ring-2 ${guardian ? "ring-royal-300" : "ring-primary-300"}`
            : guardian
            ? "bg-gradient-to-br from-royal-600 via-royal-500 to-royal-400 shadow-royal"
            : "bg-gradient-to-br from-primary-500 to-peach-500 shadow-soft"
        }`}
      >
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            active
              ? guardian
                ? "bg-royal-50 text-royal-600"
                : "bg-primary-50 text-primary-600"
              : "bg-white/20 text-white"
          }`}
        >
          {item.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-base font-extrabold leading-snug ${
              active ? (guardian ? "text-royal-700" : "text-primary-700") : "text-white"
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
          className={`shrink-0 ${
            active ? (guardian ? "text-royal-400" : "text-primary-400") : "text-white/70"
          }`}
        />
      </Link>
    );
  }

  // 모바일에서는 가로 스크롤 대신 2열 그리드 — 예전엔 메뉴 폭이 975px인데 화면이 338px이라
  // 6개 중 2개만 보이고 나머지는 밀어야 나와서, 있는 줄도 모르고 지나쳤다.
  //
  // 아이콘 위·글자 아래로 쌓는 세로형이었을 때는 카드 하나가 177px까지 자라서(2×2
  // 그리드의 두 행이 auto-rows-fr로 같은 높이를 맞추는데, 좁은 칸에서 설명이 두 줄로
  // 감기는 카드 하나 때문에 나머지 다섯 칸까지 같이 늘어났다) 그 아래 얇은 메뉴 두 줄이
  // 화면 접히는 지점 밖으로 밀려났다. 아이콘·글자를 가로로 나란히 두면 설명이 감겨도
  // 카드가 세로로 자라지 않아 이 문제 자체가 안 생긴다(2026-08-04).
  function NavCard({ item, delayIndex }: { item: NavItem; delayIndex?: number }) {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={`animate-fade-up relative flex items-center gap-2 overflow-hidden rounded-2xl p-2.5 transition-all duration-150 active:scale-[0.98] ${
          active
            ? "bg-primary-50 ring-1 ring-primary-200"
            : "bg-white shadow-card hover:shadow-card-hover"
        }`}
        style={delayIndex !== undefined ? { animationDelay: `${delayIndex * 70}ms` } : undefined}
      >
        {/* 우상단 강조 칩 — 모서리에 딱 붙이면 카드의 rounded-2xl + overflow-hidden이
            칩 오른쪽을 곡선으로 깎아 글자가 잘렸다("돌보다 단독" 실측 2026-08-05).
            모서리 곡선 안쪽으로 살짝 들여 붙인다. */}
        {item.ribbon && (
          <span className="absolute right-1 top-1 rounded-full bg-gradient-to-r from-royal-500 to-primary-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
            {item.ribbon}
          </span>
        )}
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
            active ? "bg-white text-primary-600 shadow-soft" : "bg-ivory-100 text-ink-400"
          }`}
        >
          {item.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[13px] font-bold leading-tight ${
              active ? "text-primary-700" : "text-ink-900"
            }`}
          >
            {item.label}
          </span>
          {item.hint && (
            <span className="block truncate text-[10px] leading-tight text-ink-400">
              {item.hint}
            </span>
          )}
        </span>
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

        {/* 역할 카드 — 보호자↔매니저 전환. 예전 인사 카드가 하던 일(이름·역할·빠른 액션 2개)을
            그대로 품고 있고, 여기에 전환 기능이 더해졌다. */}
        <MyPageRoleCard />

        {role === "guardian" ? (
          <>
            {/* 모바일: 매니저 쪽과 같은 문법 — 대표 카드(상담 내역) → 2×2 그리드 → 얇은 줄 */}
            <nav className="flex flex-col gap-2.5 sm:hidden">
              <PrimaryNavCard item={guardianPrimary} tone="guardian" />
              <div className="grid auto-rows-fr grid-cols-2 gap-2.5">
                {guardianGrid.map((item, i) => (
                  <NavCard key={item.href} item={item} delayIndex={i} />
                ))}
              </div>
              {/* 얇은 줄(등급 테스트·상담 신청 내역)은 여기 두지 않는다 —
                  대시보드 바로 아래(GuardianRecordsMenu, page.tsx)로 내렸다. */}
            </nav>

            {/* 데스크톱 사이드바용 내 정보 목록 (모바일에서는 위 카드들이 대신한다) */}
            <p className="mb-2 hidden px-1 text-[13px] font-semibold text-ink-300 sm:block">
              내 정보
            </p>
            <nav className="hidden sm:flex sm:flex-col sm:gap-1.5">
              {infoItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>

            {/* 매니저 미등록자에게만 — 세그먼트의 "매니저 시작"만으로는 왜 해야 하는지가
                전달되지 않는다. 텅 빈 점선 박스보다 이 카드가 전환이 잘 된다.
                isSitter가 확정(false)됐을 때만 — null(확인 중)에 띄우면 이미 등록한
                매니저에게도 "시작하기"가 잠깐 깜빡인다. */}
            {isSitter === false && (
              <Link
                href="/mypage/sitter/register"
                className="group mt-5 flex items-center gap-3.5 rounded-2xl bg-gradient-to-br from-primary-500 to-peach-500 p-4 shadow-soft transition-all duration-200 ease-snappy hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99] sm:w-full"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur">
                  <HeartHandshake size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-extrabold text-white">
                    돌보다 매니저 시작하기
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-white/85">
                    돌봄 일자리에 지원하고 활동 실적을 쌓아보세요
                  </span>
                </span>
                <ChevronRight
                  size={17}
                  className="shrink-0 text-white/70 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            )}
          </>
        ) : (
          <>
            {/* 모바일: 대표 카드(일자리) → 2×2 그리드 → 얇은 줄(알림).
                6개를 동급으로 깔면 정작 매일 쓰는 일자리 관리가 묻힌다 — 쓰는 빈도가 곧 크기다.
                auto-rows-fr로 같은 줄 카드의 높이를 서로 맞춘다 */}
            <nav className="flex flex-col gap-2.5 sm:hidden">
              <PrimaryNavCard item={primaryItem} tone="manager" />
              <div className="grid auto-rows-fr grid-cols-2 gap-2.5">
                {gridItems.map((item, i) => (
                  <NavCard key={item.href} item={item} delayIndex={i} />
                ))}
              </div>
              {compactItems.map((item, i) => (
                <CompactNavRow key={item.href} item={item} delayIndex={gridItems.length + i} />
              ))}
            </nav>
            {/* 데스크톱: 기존 사이드바 목록 유지 */}
            <p className="mb-2 hidden px-1 text-[13px] font-semibold text-ink-300 sm:block">
              돌보다 매니저
            </p>
            <nav className="hidden sm:flex sm:flex-col sm:gap-1.5">
              {sitterItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </>
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
