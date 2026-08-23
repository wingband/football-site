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
        disallow: ["/api/", "/search", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
