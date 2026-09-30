import { NextRequest, NextResponse } from "next/server"
import { incrementTodayViews, getTodayViews, incrementUtmSource } from "@/lib/pageViews"
import { isKnownCrawler } from "@/lib/crawlerDetect"

// 카운터는 항상 최신 값이어야 해서 캐시하지 않는다
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  // (2026-09-30) 크롤러 레이트리밋을 완화한 뒤(middleware.ts), 구글봇/Yeti가
  // JS를 실행하며 페이지를 렌더링해 이 카운터 코드까지 그대로 실행시켜버렸다.
  // GA 실제 활성 사용자(29명)와 우리 자체 카운터(2,502명)가 크게 어긋난 것으로
  // 확인됨 — 크롤러 UA는 여기서 아예 집계 대상에서 제외한다.
  const userAgent = req.headers.get("user-agent")
  if (isKnownCrawler(userAgent)) {
    const count = await getTodayViews()
    return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } })
  }

  const count = await incrementTodayViews()

  // ?utm_source= 값이 있으면(커뮤니티 홍보 링크 등) 소스별로도 기록
  let source: string | null = null
  try {
    const body = await req.json()
    source = typeof body?.source === "string" ? body.source.slice(0, 50) : null
  } catch {
    // body 없이 호출되는 기존 방식도 그대로 지원
  }
  if (source) {
    await incrementUtmSource(source)
  }

  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } })
}

export async function GET() {
  const count = await getTodayViews()
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } })
}
