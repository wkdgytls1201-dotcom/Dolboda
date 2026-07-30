import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white/60 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center text-xs text-ink-300 sm:flex-row sm:justify-between sm:text-left">
        <p>&copy; {new Date().getFullYear()} 돌보다. 표시된 시설 정보는 공공데이터 기반으로 실제와 다를 수 있습니다.</p>
        <div className="flex gap-4">
          <Link href="/terms" className="transition-colors duration-150 hover:text-ink-700">
            이용약관
          </Link>
          <Link href="/privacy" className="font-semibold transition-colors duration-150 hover:text-ink-700">
            개인정보처리방침
          </Link>
        </div>
      </div>
    </footer>
  );
}
