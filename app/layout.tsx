import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 스코어/제목용 — 경기장 전광판 느낌의 폭 좁은 대문자 서체
const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// 스탯 숫자용 — 고정폭, 데이터 판독기 느낌
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "GoalLine - 실시간 축구 스코어 · 순위표 · AI 경기 분석",
    template: "%s | GoalLine",
  },
  description:
    "전 세계 축구 리그의 실시간 스코어, 순위표, 라인업, AI 경기 분석을 한곳에서 확인하세요. 한국인 해외파 선수 소식도 매일 업데이트됩니다.",
  verification: {
    google: "dHUEnfghtcC90rFALLbmNhtyBzcT9034n9AcTiKBTAE",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-pitch-night">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />

        {/* 1. GA4 측정 ID(G-로 시작)를 사용하실 경우 */}
        <GoogleAnalytics gaId="G-XXXXXXXXXX" />

        {/* 2. 만약 GTM ID(GTM-으로 시작)를 쓰실 거라면 위 태그 대신 아래 태그를 사용하세요 */}
        {/* <GoogleTagManager gtmId="GTM-MXDTC98T" /> */}
      </body>
    </html>
  );
}