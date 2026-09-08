import { NextRequest, NextResponse } from "next/server"
import { getPlayerCareer, getPlayerRecentMatches } from "@/lib/playerData"

// /players/[id] 페이지의 "경력"/"최근 경기" 섹션을 위한 지연 로딩 엔드포인트.
// 원래 페이지 SSR에서 한 번에 처리하던 걸 분리했다 — 이 두 항목이 합쳐서
// 최대 14콜(career 5 + recentMatches 1+8)로 가장 비쌌는데, 클라이언트에서
// 마운트 시점에만 호출하게 만들어서 순수 HTML만 긁는 봇/스크래퍼는
// 이 호출 자체를 트리거하지 못하게 한다 (2026-09-08 확인된 반복 스크래핑 대응)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const season = Number(searchParams.get("season"))
  const teamIdParam = searchParams.get("teamId")
  const teamId = teamIdParam ? Number(teamIdParam) : null

  if (!id || !Number.isFinite(season)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 })
  }

  const [career, recentMatches] = await Promise.all([
    getPlayerCareer(id, season),
    teamId ? getPlayerRecentMatches(id, teamId, season, 8) : Promise.resolve([]),
  ])

  return NextResponse.json(
    { career, recentMatches },
    { headers: { "Cache-Control": "s-maxage=10800, stale-while-revalidate=3600" } }
  )
}
