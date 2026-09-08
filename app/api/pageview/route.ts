import { NextRequest, NextResponse } from "next/server"
import { incrementTodayViews, getTodayViews, incrementUtmSource } from "@/lib/pageViews"

// 카운터는 항상 최신 값이어야 해서 캐시하지 않는다
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
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
