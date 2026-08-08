import Link from "next/link";
import { Search, BookOpen, ClipboardCheck, Home } from "lucide-react";

// 404 화면.
//
// 이 파일이 없던 동안에는 Next 기본 404("404 | This page could not be found")가 떴다.
// 영문 한 줄에 헤더·푸터도 없어서, 보호자 입장에선 사이트를 잘못 찾아온 것처럼 보이고
// 돌아갈 링크조차 없었다.
//
// 실제로 여기로 떨어지는 경로가 적지 않다 — 시설 상세(재적재로 사라진 시설),
// 매니저 프로필, 가이드 slug, 복지용구 품목, 유형 페이지 다섯 군데가 notFound()를 부른다.
// 특히 시설 상세는 2만 8천 개 URL이 색인돼 있어, 공단 데이터에서 빠진 시설의 옛 링크가
// 검색결과에 남아 있는 동안 계속 들어온다.
//
// 그래서 사과 문구만 두지 않고 **다음 행동으로 갈 내부 링크**를 함께 둔다 —
// 사용자에겐 막다른 길을 없애주고, 검색엔진에는 크롤 경로를 돌려준다.
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
      <p className="mb-2 text-5xl font-extrabold text-primary-500">404</p>
      <h1 className="mb-3 break-keep text-xl font-extrabold text-ink-900 sm:text-2xl">
        찾으시는 페이지가 없어요
      </h1>
      <p className="mb-8 break-keep text-sm leading-relaxed text-ink-500">
        주소가 바뀌었거나, 시설 정보가 공단 자료에서 빠졌을 수 있어요.
        <br />
        아래에서 다시 찾아보실 수 있어요.
      </p>

      <div className="grid w-full grid-cols-2 gap-2.5">
        <NavCard href="/search" icon={<Search size={20} />} label="시설 찾기" desc="지역·유형으로 검색" />
        <NavCard href="/guide" icon={<BookOpen size={20} />} label="요양 가이드" desc="처음이라면 여기부터" />
        <NavCard
          href="/grade-test"
          icon={<ClipboardCheck size={20} />}
          label="등급 테스트"
          desc="예상 등급 알아보기"
        />
        <NavCard href="/" icon={<Home size={20} />} label="홈으로" desc="처음 화면" />
      </div>
    </main>
  );
}

function NavCard({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      // min-h-[88px] — 터치 타깃 44px의 두 배. 50~70대 타깃이라 넉넉하게 잡는다.
      className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl bg-white px-3 py-4 shadow-card transition-transform active:scale-[0.98]"
    >
      <span className="text-primary-500">{icon}</span>
      <span className="text-sm font-bold text-ink-900">{label}</span>
      <span className="break-keep text-[11px] text-ink-400">{desc}</span>
    </Link>
  );
}
