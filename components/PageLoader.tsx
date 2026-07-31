import { Logo } from "./Logo";

// 화면 전환·데이터를 불러오는 동안 보여주는 가벼운 로더. 이미 헤더에서 로드된 로고
// 이미지를 그대로 재사용해서 추가 용량 없이(캐시에서 바로 나옴) 은은하게 펄스만 준다.
export function PageLoader({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-16">
      <Logo className="h-14 w-14 animate-pulse-soft" />
      <p className="text-sm font-medium text-ink-300">{label}</p>
    </div>
  );
}
