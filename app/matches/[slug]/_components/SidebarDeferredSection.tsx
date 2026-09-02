import { apiFetch, getVenueInfo, getRoundFixtures, buildInsights } from "@/lib/matchApi"
import type { TeamFixture } from "@/lib/matchApi"
import MatchSidebar from "@/components/MatchSidebar"
import MatchVote from "@/components/MatchVote"
import MatchComments from "@/components/MatchComments"

type Prediction = {
  predictions: {
    winner: { name: string | null; comment: string | null }
    percent: { home: string; draw: string; away: string }
  }
}

export default async function SidebarDeferredSection({
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  homeTeamLogo,
  awayTeamLogo,
  leagueId,
  leagueName,
  leagueLogo,
  season,
  round,
  fixtureId,
  venueId,
  venueName,
  venueCity,
  isFinished,
}: {
  homeTeamId: number
  awayTeamId: number
  homeTeamName: string
  awayTeamName: string
  homeTeamLogo: string
  awayTeamLogo: string
  leagueId: number
  leagueName: string
  leagueLogo: string
  season: number
  round?: string
  fixtureId: number
  venueId: number | null | undefined
  venueName: string
  venueCity: string
  isFinished: boolean
}) {
  const [venueInfo, roundFixtures, predictions, homeRecent, awayRecent] = await Promise.all([
    getVenueInfo(venueId, venueName, venueCity),
    round
      ? getRoundFixtures(leagueId, season, round)
      : Promise.resolve([] as TeamFixture[]),
    apiFetch(`/predictions?fixture=${fixtureId}`, 86400) as Promise<Prediction[]>,
    apiFetch(`/fixtures?team=${homeTeamId}&last=6`, 21600) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${awayTeamId}&last=6`, 21600) as Promise<TeamFixture[]>,
  ])

  const prediction = predictions?.[0]?.predictions
  // h2h 기반 인사이트 한 줄은 뺐다 — 역대전적 탭에서 탭 클릭 시에만 따로 불러오도록
  // 옮겼는데, 정작 여기서 매번 무조건 다시 불러오면 그 절감 효과가 없어지기 때문
  const insights = buildInsights(
    [],
    homeTeamName,
    awayTeamName,
    homeTeamId,
    awayTeamId,
    homeRecent ?? [],
    awayRecent ?? [],
    fixtureId
  )

  return (
    <MatchSidebar
      homeTeamName={homeTeamName}
      awayTeamName={awayTeamName}
      homeTeamLogo={homeTeamLogo}
      awayTeamLogo={awayTeamLogo}
      venue={venueInfo}
      leagueName={leagueName}
      leagueLogo={leagueLogo}
      round={round}
      roundFixtures={roundFixtures ?? []}
      currentFixtureId={fixtureId}
      insights={insights}
      prediction={
        prediction
          ? {
              home: prediction.percent.home,
              draw: prediction.percent.draw,
              away: prediction.percent.away,
            }
          : null
      }
    >
      {isFinished && <MatchVote matchId={fixtureId} />}
      <MatchComments
        matchId={fixtureId}
        homeTeam={homeTeamName}
        awayTeam={awayTeamName}
      />
    </MatchSidebar>
  )
}
