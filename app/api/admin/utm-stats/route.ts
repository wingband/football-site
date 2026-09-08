import { NextRequest, NextResponse } from "next/server"
import { getUtmStats } from "@/lib/pageViews"

// 커뮤니티별 홍보 링크(?utm_source=)가 실제로 얼마나 클릭/방문으로 이어졌는지 확인하는
// 조회 전용 진단 엔드포인트. 집계된 방문 수만 보여주고 개인정보가 없어서
// check-api-football과 같은 이유로 별도 인증 없이 열어둔다.
// 사용: curl "https://goalline.me/api/admin/utm-stats?days=14"
export async function GET(req: NextRequest) {
  const daysParam = req.nextUrl.searchParams.get("days")
  const days = daysParam ? Math.min(90, Math.max(1, Number(daysParam))) : 14

  const stats = await getUtmStats(days)

  return NextResponse.json({
    days,
    stats,
  })
}
