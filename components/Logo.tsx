// 사용자가 직접 제공한 로고 원본 이미지(public/logo.png)를 그대로 사용.
export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="돌보다" className={`${className} object-contain`} />;
}
