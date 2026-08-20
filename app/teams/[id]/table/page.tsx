import type { Metadata } from "next"
import TeamHeader from "@/components/TeamHeader"
import StandingsWithFilter from "@/components/StandingsWithFilter"
import { getTeamInfo, getTeamCurrentLeague } from "@/lib/teamData"
import { getLeagueStandings, getLeagueFixturesByMode, buildNextOpponentMap } from "@/lib/leagueData"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "순위표" }
  return { title: `${info.team.name} 순위`, description: `${info.team.name}이 속한 리그의 전체/홈/원정 순위표.` }
}

export default async function TeamTablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">팀 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const teamLeague = await getTeamCurrentLeague(id)
  const standingsData = teamLeague ? await getLeagueStandings(String(teamLeague.id), teamLeague.season) : null
  const upcoming = teamLeague ? await getLeagueFixturesByMode(String(teamLeague.id), teamLeague.season, "next", 10) : []
  const nextOpponent = buildNextOpponentMap(upcoming)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-4xl mx-auto pb-16 px-4">
        <TeamHeader teamId={id} name={info.team.name} country={info.team.country} logo={info.team.logo} active="table" />
        {standingsData && standingsData.league.standings.length > 0 ? (
          <StandingsWithFilter
            standings={standingsData.league.standings}
            highlightTeamIds={[info.team.id]}
            nextOpponent={nextOpponent}
          />
        ) : (
          <p className="text-floodlight/40 text-sm">순위표 정보가 없습니다.</p>
        )}
      </div>
    </main>
  )
}
