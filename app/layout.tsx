import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompareProvider } from "@/lib/compareContext";
import { SessionProvider } from "next-auth/react";
import { ViewGateProvider } from "@/lib/viewGateContext";
import { FavoritesProvider } from "@/lib/favoritesContext";
import { AlertPreferencesProvider } from "@/lib/alertPreferencesContext";

export const metadata: Metadata = {
  title: "돌보다 — 요양병원·요양시설 찾기",
  description: "요양병원·요양원·실버타운 정보와 시설 비교",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="font-sans">
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
