// 검색엔진 크롤러 User-Agent 판별 — middleware.ts(레이트리밋 완화)와
// app/api/pageview/route.ts(방문자 카운터 제외) 양쪽에서 공유해서 쓴다.
// (2026-09-30) 레이트리밋 완화 이후 크롤러가 JS를 실행하며 페이지를 렌더링해
// pageview 카운터까지 올려버리는 문제 확인 — 카운트 제외용으로도 재사용
export const CRAWLER_USER_AGENT_PATTERN = /Yeti|Googlebot|bingbot|DaumWeb|Applebot|DuckDuckBot/i

export function isKnownCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return CRAWLER_USER_AGENT_PATTERN.test(userAgent)
}
