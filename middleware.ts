import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { isInternalReferer } from "@/lib/scope"

const isPublicRoute = createRouteMatcher([
  "/",
  "/matches(.*)",
  "/leagues(.*)",
  "/teams(.*)",
  "/players(.*)",
  "/news(.*)",
  "/stories(.*)",
  "/transfers(.*)",
  "/standings(.*)",
  "/korean-players(.*)",
  "/best11(.*)",
  "/compare(.*)",
  "/privacy(.*)",
  "/company(.*)",
  "/advertise(.*)",
  "/sitemap.xml",
  "/robots.txt",
  "/ads.txt",
  "/api/comments(.*)",
  "/api/global-chat(.*)",
  "/api/vote(.*)",
  "/api/articles(.*)",
  "/api/korean-abroad(.*)",
  "/api/player-search(.*)",
  "/api/players(.*)",
  "/api/pageview(.*)",
  "/api/cron(.*)",
  "/api/admin(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
])

// 비용이 큰 라우트(선수/비교/팀/리그/경기 상세)를 짧은 시간에 대량으로 두드리는
// 스크래퍼를 완화하기 위한 인메모리 레이트리밋.
// 서버리스 인스턴스별로 카운터가 따로 도는 거라 전역적으로 완벽하진 않지만,
// 같은 워밍 인스턴스로 몰리는 반복 스크래핑 트래픽은 실제로 상당 부분 걸러진다.
// (2026-09-07: /players, /compare가 ?season= 값을 돌아가며 여러 IP에서
// 대량 스크래핑당해 선수 하나당 API 호출이 20콜 안팎씩 나갔던 것 확인)
//
// /matches/[slug]는 따로 더 엄격한 한도를 둔다. 경기 상세 하나 보는 데 내부적으로
// (스탯+이벤트+라인업+선수+예측+최근폼 2팀) API 콜이 8~9개씩 나가서, 40/분 기준으로도
// 봇이 분당 최대 360콜까지 뽑아갈 수 있었다. 실제 사용자가 분당 경기 15개 넘게
// 볼 일은 없다 (2026-09-09, 시즌 전체를 라운드별로 순회하며 훑는 크롤러 확인)
const RATE_LIMIT_RULES: { pattern: RegExp; max: number }[] = [
  { pattern: /^\/matches\//, max: 15 },
  { pattern: /^\/players\//, max: 40 },
  { pattern: /^\/compare/, max: 40 },
  { pattern: /^\/teams\//, max: 40 },
  { pattern: /^\/leagues\//, max: 40 },
  { pattern: /^\/matches/, max: 40 },
  { pattern: /^\/transfers/, max: 40 },
  { pattern: /^\/api\/players\//, max: 40 },
]
const RATE_LIMIT_WINDOW_MS = 60_000

const hitCounts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string, pathname: string): boolean {
  const rule = RATE_LIMIT_RULES.find((r) => r.pattern.test(pathname))
  if (!rule) return false

  // 규칙마다 카운터를 따로 둬야 /matches/(15/분)와 다른 라우트(40/분)가 서로 안 섞인다
  const key = `${ip}:${rule.pattern.source}`
  const now = Date.now()
  const entry = hitCounts.get(key)

  if (!entry || now > entry.resetAt) {
    hitCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > rule.max
}

export default clerkMiddleware(async (auth, req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (isRateLimited(ip, req.nextUrl.pathname)) {
    return new NextResponse("Too Many Requests", { status: 429 })
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }

  // "우리 사이트 안에서 들어온 요청인지" 판단해서 스코프 밖 팀/오래된 과거
  // 경기도 통과시킬지 정한다. app/teams/[id]/layout.tsx, app/matches/[slug]/page.tsx가
  // 아래 커스텀 헤더를 보고 최종 판단한다.
  // (2026-09-18) 예전엔 ?ref=internal 쿼리파라미터로 판단했는데, 이 문자열이
  // 우리 사이트 HTML의 <a href>에 그대로 노출되다 보니 HTML을 파싱해서 링크를
  // 따라가는 크롤러는 아무 노력 없이 그 문자열을 그대로 복사해갈 수 있었다.
  // API-Football 대시보드에서 스코프 밖 팀/리그가 계속 라이브로 조회되는 게
  // 확인되면서 드러남. URL에 찍히는 값이 아니라, HTML에 안 나타나는 쿠키로
  // 대체한다 — 스코프 게이트가 없는 다른 페이지(순위표/리그/뉴스 등)를 한 번이라도
  // 봐야 심어지는 쿠키라, 링크만 따라가는 크롤러는 이 쿠키를 절대 못 얻는다.
  const pathname = req.nextUrl.pathname
  const isTeamPath = /^\/teams\//.test(pathname)
  const isMatchDetailPath = /^\/matches\//.test(pathname)

  // 쿠키만으론 아직 부족하다 — httpOnly라 JS로는 못 훔치지만, requests.Session()/
  // curl -b처럼 쿠키 저장소를 쓰는 스크립트는 정상 페이지 한 번 방문해서 받은 쿠키를
  // 그대로 재사용해 이후 요청을 순수 스크립트로 계속 찍어낼 수 있다. 실제 브라우저는
  // 모든 요청에 Sec-Fetch-Site 헤더(Fetch Metadata)를 자동으로 붙이는데, curl/requests
  // 같은 단순 HTTP 클라이언트는 개발자가 일부러 안 넣는 한 이 헤더가 아예 없다 — 그래서
  // 쿠키를 신뢰하는 조건에 "same-origin 또는 직접 진입(none)"까지 같이 요구해서, 쿠키만
  // 복사해 온 단순 스크립트 재생의 문턱을 하나 더 높인다.
  // (2026-09-19) 한계: Puppeteer/Playwright 같은 실제 브라우저 엔진 기반 크롤러는 이
  // 헤더도 정상 브라우저처럼 정확히 보내기 때문에 이 체크로는 못 걸러낸다 — 완벽한
  // 방어가 아니라 흔한 스크립트 재생 패턴의 문턱을 높이는 추가 방어선일 뿐이다.
  const secFetchSite = req.headers.get("sec-fetch-site")
  const looksLikeRealBrowserNav = secFetchSite === "same-origin" || secFetchSite === "none"
  const hasInternalCookie = req.cookies.get("sv")?.value === "1" && looksLikeRealBrowserNav
  const isInternalRequest = hasInternalCookie || isInternalReferer(req.headers.get("referer"))

  const forwardedHeaders = new Headers(req.headers)
  if (isInternalRequest) {
    if (isTeamPath) forwardedHeaders.set("x-team-ref-internal", "1")
    if (isMatchDetailPath) forwardedHeaders.set("x-match-ref-internal", "1")
  }

  const response = NextResponse.next({ request: { headers: forwardedHeaders } })

  // 스코프 게이트가 걸리는 페이지 자체를 방문한 것만으론 "사이트를 둘러보다 왔다"는
  // 증거가 안 되므로 여기선 쿠키를 새로 심지 않는다 (심으면 순차 ID 스캐너가
  // 쿠키 저장소를 쓸 경우 첫 번째 차단 응답에서 쿠키를 받아 다음 요청부터
  // 우회하게 된다).
  if (!isTeamPath && !isMatchDetailPath) {
    response.cookies.set("sv", "1", {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    })
  }

  return response
})

export const config = {
  matcher: [
    "/((?!_next|api/cron|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)((?!/cron).*)",
  ],
}
