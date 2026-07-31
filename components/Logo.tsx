// 사용자가 직접 제공한 로고 원본 이미지(public/logo.png, 256px로 경량화됨)를 그대로 사용.
// priority: 헤더처럼 첫 화면에 바로 보이는 자리에서는 브라우저에 우선 다운로드를 지시해
// 로고가 늦게 뜨는 현상을 줄인다.
export function Logo({
  className = "h-10 w-10",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/logo.png"
      alt="돌보다"
      className={`${className} object-contain`}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
