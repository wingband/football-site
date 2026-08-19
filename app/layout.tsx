import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
    default: "Football Site — 실시간 축구 스코어 · 순위표 · AI 경기 분석",
    template: "%s | Football Site",
  },
  description:
    "전 세계 축구 리그의 실시간 스코어, 순위표, 라인업, AI 경기 분석을 한곳에서 확인하세요. 한국인 해외파 선수 소식도 매일 업데이트됩니다.",
  verification: {
    google: "dHUEnfghtcC90rFALlbmNhtyBzcT9034n9AcTiKBTAE",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-pitch-night">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}