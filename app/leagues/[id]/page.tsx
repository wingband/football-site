import Link from "next/link"
import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import { MOCK_STANDINGS } from "@/lib/mockData"

type StandingRow = {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  form: string | null
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: { for: number; against: number }
  }
  description: string | null
}

type LeagueResponse = {
  league: {
    id: number
    name: string
    country: string
    logo: string
    season: number
    standings: StandingRow[][]
  }
}

async function getStandings(leagueId: string, season: number): Promise<LeagueResponse | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_STANDINGS
  }

  const res = await fetch(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      cache: "no-store",
    }
  )
  const data = await res.json()

  // 디버깅용 — 터미널(npm run dev 켜져있는 창)에서 확인
  console.log(`=== 순위표 요청: league=${leagueId}, season=${season} ===`)
  console.log("errors:", data.errors)
  console.log("results:", data.results)

  return data.response?.[0] ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const euroSeason = getSeasonYear("England")
  let data = await getStandings(id, euroSeason)
  if (!data) {
    data = await getStandings(id, new Date().getFullYear())
  }

  if (!data) {
    return { title: "순위표를 찾을 수 없습니다" }
  }

  return {
    title: `${data.league.name} 순위표`,
    description: `${data.league.name}(${data.league.country}) ${data.league.season} 시즌 순위표, 승점, 득실차를 확인하세요.`,
  }
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const euroSeason = getSeasonYear("England")
  let data = await getStandings(id, euroSeason)
  if (!data) {
    const calendarSeason = new Date().getFullYear()
    data = await getStandings(id, calendarSeason)
  }

  if (!data || data.league.standings.length === 0) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">순위표를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const { league } = data
  const groups = league.standings

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <img src={league.logo} alt="" className="w-10 h-10" />
          <div>
            <h1 className="font-display uppercase text-xl text-floodlight">{league.name}</h1>
            <p className="text-xs text-floodlight/40">{league.country} · {league.season} 시즌</p>
          </div>
        </div>

        <div className="flex gap-4 border-b border-turf-line/60 mt-6 mb-6 text-sm">
          <span className="pb-2 border-b-2 border-score-amber text-score-amber font-medium">순위</span>
          <Link href={`/leagues/${id}/fixtures`} className="pb-2 text-floodlight/50 hover:text-score-amber">
            일정
          </Link>
          <Link href={`/leagues/${id}/topscorers`} className="pb-2 text-floodlight/50 hover:text-score-amber">
            득점 순위
          </Link>
        </div>

        {groups.map((group, gi) => (
          <div key={gi} className="bg-turf/40 border-l-2 border-score-amber overflow-hidden mb-6">
            {groups.length > 1 && (
              <div className="px-4 py-2 bg-turf-line/30 text-sm font-medium border-b border-turf-line/60">
                {group[0]?.group}
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-floodlight/40 text-xs border-b border-turf-line/60">
                  <th className="text-left px-3 py-2 w-8">#</th>
                  <th className="text-left px-2 py-2">팀</th>
                  <th className="px-2 py-2 w-10">경기</th>
                  <th className="px-2 py-2 w-10">승</th>
                  <th className="px-2 py-2 w-10">무</th>
                  <th className="px-2 py-2 w-10">패</th>
                  <th className="px-2 py-2 w-14">득실</th>
                  <th className="px-2 py-2 w-12 text-score-amber font-data">승점</th>
                </tr>
              </thead>
              <tbody className="font-data">
                {group.map((row) => (
                  <tr
                    key={row.team.id}
                    className="border-b border-turf-line/40 last:border-b-0 hover:bg-turf-line/30"
                  >
                    <td className="px-3 py-2 text-floodlight/40">{row.rank}</td>
                    <td className="px-2 py-2 font-sans">
                      <div className="flex items-center gap-2">
                        <img src={row.team.logo} alt="" className="w-5 h-5" />
                        <Link
                          href={`/teams/${row.team.id}`}
                          className="truncate hover:text-score-amber hover:underline"
                        >
                          {row.team.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center text-floodlight/70">{row.all.played}</td>
                    <td className="px-2 py-2 text-center text-floodlight/70">{row.all.win}</td>
                    <td className="px-2 py-2 text-center text-floodlight/70">{row.all.draw}</td>
                    <td className="px-2 py-2 text-center text-floodlight/70">{row.all.lose}</td>
                    <td className="px-2 py-2 text-center text-floodlight/50">
                      {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-floodlight">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <Link href="/matches" className="text-sm text-floodlight/40 hover:text-score-amber">
          ← 경기 목록으로
        </Link>
      </div>
    </main>
  )
}