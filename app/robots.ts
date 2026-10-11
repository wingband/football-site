import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/siteConfig"

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
        disallow: ["/api/", "/search", "/sign-in", "/sign-up", "/compare?", "/columns/write", "/columns/names", "/board/write"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
