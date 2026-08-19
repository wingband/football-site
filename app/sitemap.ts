import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/siteConfig"

// 정적인 페이지(항상 존재하는 페이지) 목록.
// 경기/팀/선수처럼 매일 바뀌는 페이지는 양이 너무 많고 금방 사라지기도 해서
// 사이트맵에는 보통 넣지 않고, 대신 리그 페이지처럼 "계속 존재하는" 페이지 위주로 등록합니다.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/matches",
    "/stories",
    "/transfers",
    "/news",
    "/tv-guide",
    "/about",
    "/careers",
    "/advertise",
    "/privacy",
    "/terms",
  ]

  return staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/matches" || route === "/stories" ? "hourly" : "weekly",
    priority: route === "" || route === "/matches" || route === "/stories" ? 1 : 0.5,
  }))
}