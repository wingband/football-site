import { NextRequest, NextResponse } from "next/server"
import { incrementTodayViews, getTodayViews, incrementUtmSource, logVisit } from "@/lib/pageViews"
import { isKnownCrawler, isBlockedBot } from "@/lib/crawlerDetect"

// 카운터는 항상 최신 값이어야 해서 캐시하지 않는다
export const dynamic = "force-dynamic"

const noStore = { headers: { "Cache-Control": "no-store" } }

// (2026-09-30) 크롤러 레이트리밋을 완화한 뒤(middleware.ts), 구글봇/Yeti가
// JS를 실행하며 페이지를 렌더링해 이 카운터 코드까지 그대로 실행시켜버렸다.
// GA 실제 활성 사용자(29명)와 우리 자체 카운터(2,502명)가 크게 어긋난 것으로
// 확인됨 — 크롤러 UA는 집계 대상에서 제외한다.
//
// (2026-11-25) 그 뒤에도 GA 하루 2~4명 vs 카운터 130명으로 다시 어긋났다 — 일반 브라우저인 척하는
// 수집 봇은 UA로는 못 거른다. 그래서 "페이지를 열었다"가 아니라 "사람이 조작했다"(터치·스크롤·키 입력,
// components/VisitorCount.tsx)는 신호가 온 방문만 센다.
//   phase "load"  : 페이지가 열림 — 세지 않고 기록만 남긴다
//   phase "human" : 첫 조작이 일어남 — 센다
// 누가 들어왔는지는 visit_log에 쌓여서 /api/admin/visit-log 로 확인할 수 있다.
export async function POST(req: NextRequest) {
  const userAgent = req.headers.get("user-agent")
  const country = req.headers.get("x-vercel-ip-country")

  let source: string | null = null
  let phase: string | null = null
  let automated = false
  try {
    const body = await req.json()
    source = typeof body?.source === "string" ? body.source.slice(0, 50) : null
    phase = typeof body?.phase === "string" ? body.phase : null
    automated = body?.automated === true
  } catch {
    // body 없이 호출되는 예전 방식(배포 전 열려 있던 탭) — 조작 신호가 없으므로 "열기만 함"으로 본다
  }

  if (isKnownCrawler(userAgent) || isBlockedBot(userAgent)) {
    await logVisit("crawler", userAgent, country)
    return NextResponse.json({ count: await getTodayViews() }, noStore)
  }
  if (automated) {
    await logVisit("automation", userAgent, country)
    return NextResponse.json({ count: await getTodayViews() }, noStore)
  }
  if (phase !== "human") {
    await logVisit("load", userAgent, country)
    return NextResponse.json({ count: await getTodayViews() }, noStore)
  }

  const count = await incrementTodayViews()
  await logVisit("human", userAgent, country)

  // ?utm_source= 값이 있으면(커뮤니티 홍보 링크 등) 소스별로도 기록
  if (source) {
    await incrementUtmSource(source)
  }

  return NextResponse.json({ count }, noStore)
}

export async function GET() {
  const count = await getTodayViews()
  return NextResponse.json({ count }, noStore)
}
