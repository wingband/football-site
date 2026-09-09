import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

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
  "/sitemap.xml",
  "/robots.txt",
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

  // 팀 페이지 링크의 ?ref=internal을 커스텀 헤더로 넘겨준다.
  // app/teams/[id]/layout.tsx가 이 헤더를 보고 "우리 사이트 안에서 클릭해 들어온
  // 요청인지"를 판단해서 스코프 밖 팀도 통과시킬지 정한다. layout.tsx는 Next.js
  // 구조상 searchParams를 직접 못 읽어서(페이지 컴포넌트만 받을 수 있음)
  // 미들웨어에서 한 번 읽어 헤더로 대신 전달하는 방식을 쓴다
  // (2026-09-09, Referer 헤더만으로는 클라이언트 사이드 라우팅에서 신뢰할 수 없어서 추가)
  if (/^\/teams\//.test(req.nextUrl.pathname) && req.nextUrl.searchParams.get("ref") === "internal") {
    const forwardedHeaders = new Headers(req.headers)
    forwardedHeaders.set("x-team-ref-internal", "1")
    return NextResponse.next({ request: { headers: forwardedHeaders } })
  }
})

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
}
