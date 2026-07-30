import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompareProvider } from "@/lib/compareContext";
import { SessionProvider } from "next-auth/react";
import { ViewGateProvider } from "@/lib/viewGateContext";
import { FavoritesProvider } from "@/lib/favoritesContext";
import { AlertPreferencesProvider } from "@/lib/alertPreferencesContext";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/siteConfig";

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
    images: [{ url: "/logo.png", width: 512, height: 512, alt: SITE_NAME }],
  },
  robots: { index: true, follow: true },
  // 서치콘솔 등록 후 발급받는 인증 코드 — Vercel 환경변수로 넣으면 자동 반영된다.
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    }),
    ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION && {
      other: { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION },
    }),
  },
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
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSONLD) }}
        />
        <SessionProvider>
          <ViewGateProvider>
            <CompareProvider>
              <FavoritesProvider>
                <AlertPreferencesProvider>
                  <Header />
                  {children}
                  <Footer />
                </AlertPreferencesProvider>
              </FavoritesProvider>
            </CompareProvider>
          </ViewGateProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
