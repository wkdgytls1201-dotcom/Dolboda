import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/siteConfig";

// 웹 앱 매니페스트 — Next가 /manifest.webmanifest로 서빙하고 <head>에 자동 연결한다.
// 안드로이드 앱(TWA) 패키징의 필수 조건이자, 홈 화면 설치 시 앱처럼 뜨는 기준.
// display: standalone — 설치·앱 실행 시 브라우저 UI 없이 전체 화면
// (상태바 안전영역은 globals.css의 --safe-top이 처리한다)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "ko",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF3",
    theme_color: "#FFFBF3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // maskable: 안드로이드 아이콘 마스킹(원형 등) 대응 — 여백이 부족하면 가장자리가
      // 잘릴 수 있어 전용 아이콘이 생기면 교체한다. 없는 것보단 있는 게 낫다.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
