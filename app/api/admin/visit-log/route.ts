import { NextRequest, NextResponse } from "next/server"
import { getVisitLog } from "@/lib/pageViews"

// 하단 "오늘 방문자" 카운터에 누가 잡히는지 확인하는 조회 전용 진단 엔드포인트 (2026-11-25).
// 날짜·분류(human/load/crawler/automation)별 합계와, 많이 들어온 브라우저 종류(User-Agent)·국가 상위 200개.
// IP 등 개인정보는 저장하지 않으므로 utm-stats와 같은 이유로 별도 인증 없이 열어둔다.
// 사용: https://www.goalline.me/api/admin/visit-log?days=3
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const daysParam = req.nextUrl.searchParams.get("days")
  const days = daysParam ? Math.min(30, Math.max(1, Number(daysParam) || 3)) : 3
  const log = await getVisitLog(days)
  return NextResponse.json({ days, ...log }, { headers: { "Cache-Control": "no-store" } })
}
