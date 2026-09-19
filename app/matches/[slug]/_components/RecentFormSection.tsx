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
  // (2026-09-19) apiFetch가 실패 시 이제 던지므로, 한 팀 데이터가 일시적으로
  // 실패해도 나머지는 그대로 보여주도록 Promise.allSettled로 분리한다
  const settled = await Promise.allSettled([
    apiFetch(`/fixtures?team=${homeTeamId}&last=6`, 21600) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${awayTeamId}&last=6`, 21600) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${homeTeamId}&next=1`, 21600) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${awayTeamId}&next=1`, 21600) as Promise<TeamFixture[]>,
  ])
  const [homeRecent, awayRecent, homeNextArr, awayNextArr] = settled.map((s) =>
    s.status === "fulfilled" ? s.value : []
  ) as [TeamFixture[], TeamFixture[], TeamFixture[], TeamFixture[]]

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
