import { apiFetch } from "@/lib/matchApi"
import type { TeamFixture } from "@/lib/matchApi"
import Section from "@/components/Section"
import TeamRecentForm from "@/components/TeamRecentForm"
import NextMatchCard from "@/components/NextMatchCard"

export default async function RecentFormSection({
  homeTeamId,
  awayTeamId,
  currentFixtureId,
}: {
  homeTeamId: number
  awayTeamId: number
  currentFixtureId: number
}) {
  const [homeRecent, awayRecent, homeNextArr, awayNextArr] = await Promise.all([
    apiFetch(`/fixtures?team=${homeTeamId}&last=6`, 21600) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${awayTeamId}&last=6`, 21600) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${homeTeamId}&next=1`, 21600) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${awayTeamId}&next=1`, 21600) as Promise<TeamFixture[]>,
  ])

  return (
    <>
      <Section title="팀 기록">
        <TeamRecentForm
          homeTeamId={homeTeamId}
          awayTeamId={awayTeamId}
          homeFixtures={homeRecent ?? []}
          awayFixtures={awayRecent ?? []}
          currentFixtureId={currentFixtureId}
        />
      </Section>
      <Section title="다음 경기">
        <NextMatchCard
          homeTeamId={homeTeamId}
          awayTeamId={awayTeamId}
          homeNextFixture={homeNextArr?.[0] ?? null}
          awayNextFixture={awayNextArr?.[0] ?? null}
        />
      </Section>
    </>
  )
}
