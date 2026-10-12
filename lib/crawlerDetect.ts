// 검색엔진/AI/SEO 툴 크롤러 User-Agent 판별 — middleware.ts(레이트리밋 완화)와
// app/api/pageview/route.ts(방문자 카운터 제외) 양쪽에서 공유해서 쓴다.
//
// (2026-09-30) 처음엔 알려진 크롤러 이름을 하나하나 화이트리스트로 나열했는데
// (Yeti/Googlebot/bingbot 등), 배포 직후에도 방문자 카운터가 분당 수십 명씩
// 계속 올라가는 게 확인됨 — GPTBot/ClaudeBot/PerplexityBot/Bytespider/
// AhrefsBot/SemrushBot 같이 목록에 없던 크롤러들이 여전히 잡혔던 것으로 추정.
// 이름을 일일이 따라잡는 대신, "bot/spider/crawler" 같은 공통 단어가 들어간
// User-Agent는 통째로 크롤러로 간주한다 — 정상 브라우저 UA엔 이런 단어가
// 들어갈 일이 없어서 훨씬 포괄적이면서도 안전하다. 이 패턴에 안 걸리는
// 이름(Yeti, DaumWeb 등)만 명시적으로 추가한다.
export const CRAWLER_USER_AGENT_PATTERN =
  /bot|spider|crawler|slurp|Yeti|DaumWeb|facebookexternalhit|Discordbot|TelegramBot|WhatsApp|Google-InspectionTool|GoogleOther|AdsBot|Mediapartners/i

export function isKnownCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return CRAWLER_USER_AGENT_PATTERN.test(userAgent)
}

// (2026-10-12) 사이트에 도움이 안 되면서 DB·API만 소모하는 수집용 봇 — 크롤러 사고로 DB/API 한도가 반복해서 찼다.
// 검색엔진(Googlebot·Bing·Yeti·Daum)과 애드센스 심사 봇(Mediapartners/AdsBot), 링크 미리보기(facebookexternalhit·카카오 등)는 여기에 넣지 않는다.
export const BLOCKED_BOT_NAMES = [
  "GPTBot", "CCBot", "ClaudeBot", "anthropic-ai", "Claude-Web", "Bytespider", "PerplexityBot", "Amazonbot",
  "Applebot-Extended", "meta-externalagent", "FacebookBot", "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot",
  "PetalBot", "DataForSeoBot", "BLEXBot", "SeznamBot", "Barkrowler", "ImagesiftBot", "Diffbot", "omgili",
  "Timpibot", "SerpstatBot", "ZoominfoBot", "Scrapy", "HeadlessChrome",
]
const BLOCKED_BOT_PATTERN = new RegExp(
  `${BLOCKED_BOT_NAMES.join("|")}|^python-requests|^curl/|^Wget/|^Go-http-client|^node-fetch|^axios/|^okhttp`,
  "i"
)

export function isBlockedBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  return BLOCKED_BOT_PATTERN.test(userAgent)
}
