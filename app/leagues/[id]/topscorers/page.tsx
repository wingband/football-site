import Link from "next/link"
import PlayerAvatar from "@/components/PlayerAvatar"
import { getSeasonYear } from "@/lib/season"
import { MOCK_TOP_SCORERS } from "@/lib/mockData"
import Logo from "@/components/Logo"
import { fetchApiFootball } from "@/lib/apiFootballClient"

type ScorerEntry = {
  player: { id: number; name: string; photo: string }
  statistics: {
    team: { name: string; logo: string }
    goals: { total: number | null; assists: number | null }
    games: { appearences: number | null }
  }[]
}

// (2026-09-20) 기존엔 fetch를 직접 호출하고 errors 필드를 체크하지 않아서, API
// 레이트리밋 시 "이 시즌 득점 기록 없음"으로 오인해 불필요하게 season-1로
// 폴백하거나 빈 화면을 보여줄 수 있었다. fetchApiFootball()로 통합한다.
async function getTopScorers(leagueId: string, season: number): Promise<ScorerEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TOP_SCORERS

  try {
    const response = await fetchApiFootball(
      `/players/topscorers?league=${leagueId}&season=${season}`,
      { revalidate: 10800 }
    )
    return response as ScorerEntry[]
  } catch (err) {
    console.error("getTopScorers 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

export default async function TopScorersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let scorers = await getTopScorers(id, getSeasonYear("England"))
  if (scorers.length === 0) {
    scorers = await getTopScorers(id, new Date().getFullYear())
  }

  return (
    <>
      {scorers.length === 0 && (
        <p className="text-floodlight/40 text-sm py-6">득점 순위 데이터를 찾을 수 없습니다.</p>
      )}

      {scorers.length > 0 && (
        <div className="bg-turf/40 border-l-2 border-score-amber">
          {scorers.map((s, i) => {
            const stat = s.statistics[0]
            if (!stat) return null
            return (
              <Link
                key={s.player.id}
                href={`/players/${s.player.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/40 border-b border-turf-line/40 last:border-b-0"
              >
                <span className="w-5 text-xs text-floodlight/40 font-data text-center shrink-0">
                  {i + 1}
                </span>
                <PlayerAvatar
                  src={s.player.photo}
                  alt={s.player.name}
                  className="w-9 h-9 rounded-full bg-turf-line object-cover shrink-0 text-xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.player.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Logo src={stat.team.logo} alt="" className="w-3.5 h-3.5" />
                    <span className="text-[11px] text-floodlight/40 truncate">{stat.team.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-data shrink-0">
                  <span className="text-score-amber font-bold">{stat.goals.total ?? 0}</span>
                  <span className="text-floodlight/30 text-xs">🅰️{stat.goals.assists ?? 0}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
