import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { CompareProvider } from "@/lib/compareContext";
import { SessionProvider } from "next-auth/react";
import { ViewGateProvider } from "@/lib/viewGateContext";
import { FavoritesProvider } from "@/lib/favoritesContext";
import { CareProfileProvider } from "@/lib/careProfileContext";
import { AlertPreferencesProvider } from "@/lib/alertPreferencesContext";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/siteConfig";
import { jsonLdHtml } from "@/lib/jsonLd";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "돌보다 — 전국 요양병원·요양시설 찾기·비교",
    template: "%s | 돌보다",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "요양시설",
    "요양시설정보",
    "요양병원",
    "요양병원정보",
    "요양원",
    "주야간보호",
    "방문요양",
    "실버타운",
    "요양병원 찾기",
    "요양시설 비교",
    "요양병원 평가등급",
    "요양원 추천",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "돌보다 — 전국 요양병원·요양시설 찾기·비교",
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "돌보다 — 전국 요양병원·요양시설 찾기·비교",
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  // 서치콘솔 소유 확인 코드 — 어차피 HTML에 공개되는 값이라 코드에 직접 둔다.
  // (환경변수가 있으면 그 값이 우선)
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ??
      "D0jTYRzQmyfFDSMJOOXVyxKSU9BI-vnARrGfgiEd29M",
    other: {
      "naver-site-verification":
        process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ??
        "17ae401edac83b65f683811a2f470a9aacc4b299",
    },
  },
};

// 모바일 브라우저 UI(주소창·상태바)를 배경색과 같은 아이보리로 물들이고,
// 노치 기기에서 화면 끝까지 쓸 수 있게 한다(하단 탭바는 이미 safe-area 패딩을 갖고 있다).
// 나중에 WebView로 감쌀 때도 이 설정을 그대로 쓴다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFBF3",
};

// 구글/네이버가 사이트 성격과 내부 검색을 이해하도록 돕는 구조화 데이터.
const SITE_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "ko",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 본문 폰트(Pretendard) — 공식 배포 방식인 dynamic-subset을 쓴다.
            unicode-range로 쪼개져 있어 화면에 실제 등장한 글자 묶음만 내려받는다(개당 ~35KB).
            예전 globals.css의 @font-face는 URL이 404라 폰트가 로드된 적이 없었다(글꼴 복구 겸 교체).
            preconnect 두 줄: CSS는 no-cors, 폰트 파일은 CORS 연결이라 서로 재사용이 안 돼
            각각 미리 열어둔다. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 히어로 배너 사진 도메인에 미리 연결해 첫 이미지 로딩을 앞당긴다 */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {/* 헤더 로고(20KB)는 모든 화면 첫인상이라 HTML 파싱 즉시 내려받게 한다 */}
        <link rel="preload" as="image" href="/logo.png" fetchPriority="high" />
      </head>
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(SITE_JSONLD) }}
        />
        <SessionProvider>
          {/* 세션(전체 페이지 로드)당 한 번만 어르신 돌봄 프로필을 받아 여기서 공유한다.
              이전엔 시설 상세·상담 모달·돌봄요청 마법사가 각자 훅으로 따로 불러서,
              시설 상세만 28,000여 페이지라 페이지를 옮길 때마다 같은 데이터를 또 받았다. */}
          <CareProfileProvider>
            <ViewGateProvider>
              <CompareProvider>
                <FavoritesProvider>
                  <AlertPreferencesProvider>
                    <Header />
                    {children}
                    <Footer />
                    <MobileTabBar />
                  </AlertPreferencesProvider>
                </FavoritesProvider>
              </CompareProvider>
            </ViewGateProvider>
          </CareProfileProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
