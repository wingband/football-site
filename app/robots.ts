import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/siteConfig"
import { BLOCKED_BOT_NAMES } from "@/lib/crawlerDetect"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 색인 가치가 없는 경로만 막아서 크롤 예산을 경기/리그/팀 페이지에 쓰게 한다.
        // /matches?date=... 같은 목록 페이지는 일부러 열어둠 ("8월 22일 경기 일정" 류 검색 유입)
        // (2026-10-11) /compare?player1=... 조합 주소는 noindex인데도 수천 개가 크롤링돼
        // 크롤 예산을 낭비했다. 빈 /compare 랜딩만 허용하고 파라미터 붙은 주소는 막는다.
        // /columns/write, /board/write 같은 작성 화면도 막는다.
        // (2026-10-26) 경기별 공유 이미지(/matches/.../opengraph-image)를 구글이 1,000개 넘게 "페이지"로 크롤링해
        // Search Console "크롤링됨 - 색인 생성 안 됨"에 쌓이고, 매번 API를 불렀다. 검색엔진에는 막는다.
        disallow: ["/api/", "/search", "/sign-in", "/sign-up", "/compare?", "/columns/write", "/columns/names", "/board/write", "/matches/*/opengraph-image"],
      },
      // 카카오톡·페이스북·X·디스코드 등 링크 미리보기 봇은 공유 이미지를 받아야 하므로 막지 않는다
      {
        userAgent: ["kakaotalk-scrap", "facebookexternalhit", "Facebot", "Twitterbot", "Discordbot", "TelegramBot", "Slackbot", "WhatsApp", "LinkedInBot"],
        allow: "/",
        disallow: ["/api/", "/columns/write", "/columns/names", "/board/write"],
      },
      // 수집용 봇은 전체 차단 (middleware에서도 403으로 막는다)
      { userAgent: BLOCKED_BOT_NAMES.filter((n) => !["HeadlessChrome", "Scrapy"].includes(n)), disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
