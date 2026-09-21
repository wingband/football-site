import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdSlot from "@/components/AdSlot";
import KakaoAdBanner from "@/components/KakaoAdBanner";
import Script from "next/script";
import { GoogleTagManager, GoogleAnalytics } from '@next/third-parties/google';
import { ClerkProvider } from "@clerk/nextjs";
import { SITE_URL } from "@/lib/siteConfig";

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
  // canonical/og:image의 상대주소를 절대주소로 바꿀 기준 도메인.
  // 이게 없으면 Next가 배포 URL(...vercel.app)을 기준으로 삼아서,
  // 그 주소로 들어온 방문자에게는 canonical이 vercel.app으로 찍혀 중복 색인이 생긴다
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GoalLine - 실시간 축구 스코어 · 순위표 · 경기 분석",
    template: "%s | GoalLine",
  },
  description:
    "전 세계 축구 리그의 실시간 스코어, 순위표, 라인업, 경기 분석을 한곳에서 확인하세요. 한국인 해외파 선수 소식도 매일 업데이트됩니다.",
  // (2026-09-21) 네이버 서치어드바이저 "사이트 간단 체크"에서 Open Graph
  // 제목/설명 누락으로 지적됨 — 카카오톡/네이버 등에 링크 공유 시 미리보기
  // 카드가 안 뜨던 원인. 대표 이미지는 app/opengraph-image.tsx가 동적 생성.
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "GoalLine",
    title: "GoalLine - 실시간 축구 스코어 · 순위표 · 경기 분석",
    description:
      "전 세계 축구 리그의 실시간 스코어, 순위표, 라인업, 경기 분석을 한곳에서 확인하세요. 한국인 해외파 선수 소식도 매일 업데이트됩니다.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "GoalLine - 실시간 축구 스코어 · 순위표 · 경기 분석",
    description:
      "전 세계 축구 리그의 실시간 스코어, 순위표, 라인업, 경기 분석을 한곳에서 확인하세요.",
  },
  verification: {
    // Search Console 속성이 둘(도메인/URL 접두어)이라 토큰도 둘이다.
    // 배열로 두면 meta 태그가 두 개 렌더되어 기존 인증이 풀리지 않는다
    google: [
      "dHUEnfghtcC90rFALLbmNhtyBzcT9034n9AcTiKBTAE",
      "QvrjeTaJdEjRFF8PJ2mKx2Q6WbM-J7SEkYlo6NeqiVc",
    ],
    // 네이버 서치어드바이저 소유확인. Next.js Metadata 타입에 naver 전용
    // 필드가 없어서 other로 임의 메타태그를 추가한다
    other: {
      "naver-site-verification": "3836c5a9753c3db89b2e8c1f994b93231c889147",
      // Google AdSense 사이트 소유권 확인용 메타태그 (2026-09-21).
      // 처음엔 next/script(beforeInteractive)로 <script> 태그를 넣었으나
      // 렌더링된 <head>에 실제로 반영이 안 되는 문제가 있어서, 이미 검증된
      // verification 메타태그 패턴(위 google/naver와 동일)으로 대체했다.
      "google-adsense-account": "ca-pub-4818682522889602",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <GoogleTagManager gtmId="GTM-MXDTC98T" />
      <GoogleAnalytics gaId="G-1PL7KFH8KD" />
      {/* 카카오 애드핏 스크립트. 광고 자리(KakaoAdBanner)가 여러 개 생겨도
          이 스크립트는 페이지당 한 번만 있으면 된다 (2026-09-21, 애드핏
          매체 등록 및 상단 배너 광고단위 생성 후 적용) */}
      <Script src="//t1.kakaocdn.net/kas/static/ba.min.js" strategy="afterInteractive" async />
      <body className="min-h-full flex flex-col bg-pitch-night">
        <Header />
        {/* 전 페이지 공통 상단 배너 광고 자리 — 카카오 애드핏.
            PC(728x90)와 모바일(320x50) 광고단위를 각각 별도로 렌더링해두고
            Tailwind 반응형 클래스로 한쪽만 보이게 전환한다. 애드핏 광고단위는
            생성 시점에 크기가 고정되는 방식이라(반응형 단일 배너 불가), 화면
            폭에 안 맞는 728x90을 모바일에 그대로 우겨넣으면 잘려 보이는
            문제가 있었다 (2026-09-21, 모바일 화면 배너 잘림 확인 → 320x50
            전용 광고단위(DAN-BIe8FUOzKHZPUiH5) 신규 생성 후 분기 처리). */}
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-3">
          <div className="hidden md:block">
            <KakaoAdBanner
              adUnit="DAN-y9b1xdwBphlFmU6b"
              width={728}
              height={90}
              className="w-full h-16 sm:h-20"
            />
          </div>
          <div className="block md:hidden">
            <KakaoAdBanner
              adUnit="DAN-BIe8FUOzKHZPUiH5"
              width={320}
              height={50}
              className="w-full h-[50px]"
            />
          </div>
        </div>
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
    </ClerkProvider>
  );
}