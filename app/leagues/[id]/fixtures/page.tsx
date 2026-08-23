import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import SeasonDropdown from "@/components/SeasonDropdown"
import FixturesView from "@/components/FixturesView"
import { getLeagueStandings, getSeasonFixtures } from "@/lib/leagueData"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const euroSeason = getSeasonYear("England")
  let data = await getLeagueStandings(id, euroSeason)
  if (!data) data = await getLeagueStandings(id, new Date().getFullYear())

  if (!data) return { title: "경기 일정" }

  return {
    title: `${data.league.name} 경기 일정`,
    description: `${data.league.name} ${data.league.season} 시즌 전체 경기 일정과 결과를 날짜별/라운드별/팀별로 확인하세요.`,
  }
}

export default async function LeagueFixturesPage({
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
  const fixtures = data ? await getSeasonFixtures(id, displaySeason) : []

  return (
    <>
      <div className="flex justify-end mb-4">
        <SeasonDropdown currentSeason={displaySeason} />
      </div>
      <FixturesView fixtures={fixtures} />
    </>
  )
}

