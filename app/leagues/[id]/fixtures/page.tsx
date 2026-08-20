import Link from "next/link"
import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import LeagueHeader from "@/components/LeagueHeader"
import { getLeagueStandings, getSeasonFixtures, type LeagueFixture } from "@/lib/leagueData"

const FINISHED_CODES = ["FT", "AET", "PEN"]

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
    description: `${data.league.name} ${data.league.season} 시즌 전체 경기 일정과 결과를 날짜별로 확인하세요.`,
  }
}

export default async function LeagueFixturesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const euroSeason = getSeasonYear("England")
  let data = await getLeagueStandings(id, euroSeason)
  if (!data) data = await getLeagueStandings(id, new Date().getFullYear())

  if (!data) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">리그 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const { league } = data
  const fixtures = await getSeasonFixtures(id, league.season)

  // 날짜별 그룹핑 (FotMob '날짜별' 방식)
  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  )
  const groups = new Map<string, LeagueFixture[]>()
  for (const fx of sorted) {
    const key = new Date(fx.fixture.date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(fx)
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto pb-16 px-4">
        <LeagueHeader
          leagueId={id}
          name={league.name}
          country={league.country}
          logo={league.logo}
          season={league.season}
          active="fixtures"
        />

        {sorted.length === 0 && (
          <p className="text-floodlight/40 text-sm py-6">경기 일정 정보가 없습니다.</p>
        )}

        {[...groups.entries()].map(([date, list]) => (
          <div key={date} className="mb-2">
            <p className="px-4 py-2.5 bg-turf-line/30 rounded text-sm text-floodlight/70 font-medium">
              {date}
            </p>
            {list.map((fx) => {
              const finished = FINISHED_CODES.includes(fx.fixture.status.short)
              const timeText = new Date(fx.fixture.date).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })
              return (
                <Link
                  key={fx.fixture.id}
                  href={`/matches/${fx.fixture.id}`}
                  className="flex items-center justify-center gap-3 px-4 py-4 text-sm hover:bg-turf-line/20 border-b border-turf-line/20 last:border-b-0"
                >
                  <span className="flex-1 text-right truncate">{fx.teams.home.name}</span>
                  <img src={fx.teams.home.logo} alt="" className="w-5 h-5 shrink-0" />
                  <span className="font-data text-score-amber w-16 text-center shrink-0">
                    {finished ? `${fx.goals.home} - ${fx.goals.away}` : timeText}
                  </span>
                  <img src={fx.teams.away.logo} alt="" className="w-5 h-5 shrink-0" />
                  <span className="flex-1 truncate">{fx.teams.away.name}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </main>
  )
}
