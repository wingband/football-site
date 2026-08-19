import Link from "next/link"
import { getSeasonYear } from "@/lib/season"
import { MOCK_TOP_SCORERS } from "@/lib/mockData"

type ScorerEntry = {
  player: { id: number; name: string; photo: string }
  statistics: {
    team: { name: string; logo: string }
    goals: { total: number | null; assists: number | null }
    games: { appearences: number | null }
  }[]
}

async function getTopScorers(leagueId: string, season: number): Promise<ScorerEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TOP_SCORERS

  const res = await fetch(
    `https://v3.football.api-sports.io/players/topscorers?league=${leagueId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      cache: "no-store",
    }
  )
  const data = await res.json()
  return data.response ?? []
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
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex gap-4 border-b border-turf-line/60 mb-6 text-sm">
          <Link href={`/leagues/${id}`} className="pb-2 text-floodlight/50 hover:text-score-amber">
            순위
          </Link>
          <Link href={`/leagues/${id}/fixtures`} className="pb-2 text-floodlight/50 hover:text-score-amber">
            일정
          </Link>
          <span className="pb-2 border-b-2 border-score-amber text-score-amber font-medium">
            득점 순위
          </span>
        </div>

        {scorers.length === 0 && (
          <p className="text-floodlight/40 text-sm">득점 순위 데이터를 찾을 수 없습니다.</p>
        )}

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
                <img
                  src={s.player.photo}
                  alt=""
                  className="w-9 h-9 rounded-full bg-turf-line object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.player.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <img src={stat.team.logo} alt="" className="w-3.5 h-3.5" />
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
      </div>
    </main>
  )
}