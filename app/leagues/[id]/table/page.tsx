import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import StandingsWithFilter from "@/components/StandingsWithFilter"
import SeasonDropdown from "@/components/SeasonDropdown"
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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { id } = await params
  const { season: seasonParam } = await searchParams

  let data: Awaited<ReturnType<typeof getLeagueStandings>> = null
  let selectedSeason: number

  if (seasonParam) {
    // 사용자가 드롭다운으로 특정 시즌을 선택한 경우, 그 시즌만 조회 (없으면 빈 순위표로 처리)
    selectedSeason = Number(seasonParam)
    data = await getLeagueStandings(id, selectedSeason)
  } else {
    const euroSeason = getSeasonYear("England")
    data = await getLeagueStandings(id, euroSeason)
    selectedSeason = euroSeason
    if (!data) {
      const calendarSeason = new Date().getFullYear()
      data = await getLeagueStandings(id, calendarSeason)
      selectedSeason = calendarSeason
    }
  }

  const displaySeason = data?.league.season ?? selectedSeason

  const upcoming =
    data && data.league.standings.length > 0
      ? await getLeagueFixturesByMode(id, displaySeason, "next", 10)
      : []
  const nextOpponent = buildNextOpponentMap(upcoming)

  return (
    <>
      <div className="flex justify-end mb-4">
        <SeasonDropdown currentSeason={displaySeason} />
      </div>
      {!data || data.league.standings.length === 0 ? (
        <p className="text-floodlight/40 pt-4">{displaySeason}/{displaySeason + 1} 시즌 순위표를 찾을 수 없습니다.</p>
      ) : (
        <StandingsWithFilter standings={data.league.standings} nextOpponent={nextOpponent} />
      )}
    </>
  )
}

