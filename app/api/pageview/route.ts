import { NextResponse } from "next/server"
import { incrementTodayViews, getTodayViews } from "@/lib/pageViews"

// 카운터는 항상 최신 값이어야 해서 캐시하지 않는다
export const dynamic = "force-dynamic"

export async function POST() {
  const count = await incrementTodayViews()
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } })
}

export async function GET() {
  const count = await getTodayViews()
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } })
}
