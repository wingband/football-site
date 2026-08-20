import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import LeagueHeader from "@/components/LeagueHeader"
import StandingsWithFilter from "@/components/StandingsWithFilter"
import { getLeagueStandings, getLeagueFixturesByMode, buildNextOpponentMap } from "@/lib/leagueData"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const euroSeason = getSeasonYear("England")
  let data = await getLeagueStandings(id, euroSeason)
  if (!data) data = await getLeagueStandings(id, new Date().getFullYear())

  if (!data) return { title: "순위표를 찾을 수 없습니다" }

  return {
    title: `${data.league.name} 순위표`,
    description: `${data.league.name}(${data.league.country}) ${data.league.season} 시즌 전체/홈/원정 순위표를 확인하세요.`,
  }
}

export default async function LeagueTablePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const euroSeason = getSeasonYear("England")
  let data = await getLeagueStandings(id, euroSeason)
  if (!data) data = await getLeagueStandings(id, new Date().getFullYear())

  if (!data || data.league.standings.length === 0) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">순위표를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const { league } = data
  const upcoming = await getLeagueFixturesByMode(id, league.season, "next", 10)
  const nextOpponent = buildNextOpponentMap(upcoming)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-4xl mx-auto pb-16 px-4">
        <LeagueHeader
          leagueId={id}
          name={league.name}
          country={league.country}
          logo={league.logo}
          season={league.season}
          active="table"
        />
        <StandingsWithFilter standings={league.standings} nextOpponent={nextOpponent} />
      </div>
    </main>
  )
}
