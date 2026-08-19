import Link from "next/link"
import { getSeasonYear } from "@/lib/season"
import { MOCK_SEASON_FIXTURES } from "@/lib/mockData"

type SeasonFixture = {
  fixture: { id: number; date: string; status: { long: string; short: string } }
  league: { round: string }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

async function getSeasonFixtures(leagueId: string, season: number): Promise<SeasonFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_SEASON_FIXTURES
  }

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      cache: "no-store",
    }
  )
  const data = await res.json()
  return data.response ?? []
}

function extractRoundNumber(round: string): number {
  const match = round.match(/(\d+)\s*$/)
  return match ? parseInt(match[1], 10) : 0
}

export default async function LeagueFixturesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const euroSeason = getSeasonYear("England")
  let fixtures = await getSeasonFixtures(id, euroSeason)
  if (fixtures.length === 0) {
    fixtures = await getSeasonFixtures(id, new Date().getFullYear())
  }

  const roundMap = new Map<string, SeasonFixture[]>()
  for (const f of fixtures) {
    const round = f.league.round
    if (!roundMap.has(round)) roundMap.set(round, [])
    roundMap.get(round)!.push(f)
  }
  const rounds = Array.from(roundMap.entries()).sort(
    (a, b) => extractRoundNumber(a[0]) - extractRoundNumber(b[0])
  )

  if (rounds.length === 0) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">일정을 찾을 수 없습니다.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex gap-4 border-b border-turf-line/60 mb-6 text-sm">
          <Link href={`/leagues/${id}`} className="pb-2 text-floodlight/50 hover:text-score-amber">
            순위
          </Link>
          <span className="pb-2 border-b-2 border-score-amber text-score-amber font-medium">일정</span>
          <Link href={`/leagues/${id}/topscorers`} className="pb-2 text-floodlight/50 hover:text-score-amber">
            득점 순위
          </Link>
        </div>

        <div className="space-y-6">
          {rounds.map(([round, matches]) => (
            <section key={round}>
              <h2 className="text-sm font-display uppercase tracking-wide text-floodlight/50 mb-2">
                {round}
              </h2>
              <div className="bg-turf/40 border-l-2 border-score-amber overflow-hidden">
                {matches.map((match) => (
                  <Link
                    key={match.fixture.id}
                    href={`/matches/${match.fixture.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/40 transition-colors border-b border-turf-line/40 last:border-b-0"
                  >
                    <span className="text-xs text-floodlight/40 w-14 shrink-0 font-data">
                      {new Date(match.fixture.date).toLocaleDateString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex-1 flex items-center justify-center gap-2 text-sm">
                      <img src={match.teams.home.logo} alt="" className="w-4 h-4" />
                      <span className="text-floodlight/80">{match.teams.home.name}</span>
                      <span className="text-floodlight/40 mx-1 font-data">
                        {match.goals.home ?? "-"} : {match.goals.away ?? "-"}
                      </span>
                      <span className="text-floodlight/80">{match.teams.away.name}</span>
                      <img src={match.teams.away.logo} alt="" className="w-4 h-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}