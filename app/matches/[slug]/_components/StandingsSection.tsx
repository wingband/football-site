import { getStandings } from "@/lib/matchApi"
import Section from "@/components/Section"
import StandingsTable from "@/components/StandingsTable"

export default async function StandingsSection({
  leagueId,
  season,
  homeTeamId,
  awayTeamId,
}: {
  leagueId: number
  season: number
  homeTeamId: number
  awayTeamId: number
}) {
  const standings = await getStandings(leagueId, season)
  return (
    <Section title="순위">
      <StandingsTable standings={standings} highlightTeamIds={[homeTeamId, awayTeamId]} />
    </Section>
  )
}
