import { NextRequest, NextResponse } from "next/server"
import { getStandings } from "@/lib/matchApi"

// 경기 상세 페이지의 "순위" 탭 전용 — 이전엔 페이지 로드 시 무조건 서버에서
// 미리 fetch해서 탭을 클릭 안 해도 API 호출이 나갔다. 이제 탭을 실제로
// 클릭했을 때만 브라우저에서 이 라우트를 호출하도록 바꿔서, 안 보는 사용자는
// 이 호출 자체가 아예 안 나가게 한다.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const leagueId = Number(searchParams.get("leagueId"))
  const season = Number(searchParams.get("season"))

  if (!leagueId || !season) {
    return NextResponse.json({ error: "leagueId/season required" }, { status: 400 })
  }

  const standings = await getStandings(leagueId, season)
  return NextResponse.json({ standings })
}
