import Link from "next/link"
import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import LeagueHeader from "@/components/LeagueHeader"
import StandingsWithFilter from "@/components/StandingsWithFilter"
import {
  getLeagueStandings,
  getLeagueFixturesByMode,
  getLeagueNews,
  buildNextOpponentMap,
  type LeagueFixture,
} from "@/lib/leagueData"

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

  if (!data) return { title: "리그 정보를 찾을 수 없습니다" }

  return {
    title: `${data.league.name} 팀 개요`,
    description: `${data.league.name}(${data.league.country}) ${data.league.season} 시즌 순위표, 예정 경기, 리그 뉴스를 확인하세요.`,
  }
}

// 날짜별로 경기를 묶어서 표시하는 경기 위젯 (개요 우측)
function RoundFixturesWidget({ fixtures }: { fixtures: LeagueFixture[] }) {
  const groups = new Map<string, LeagueFixture[]>()
  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  )
  for (const fx of sorted) {
    const key = new Date(fx.fixture.date).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "long",
    })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(fx)
  }

  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md overflow-hidden">
      <p className="text-center text-sm font-medium py-3 border-b border-turf-line/40">
        {sorted[0]?.league?.round ?? "다가오는 경기"}
      </p>
      {[...groups.entries()].map(([date, list]) => (
        <div key={date}>
          <p className="px-4 py-2 bg-turf-line/30 text-xs text-floodlight/60">{date}</p>
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
                className="flex items-center justify-center gap-2 px-4 py-3 text-xs hover:bg-turf-line/20 border-b border-turf-line/20 last:border-b-0"
              >
                <span className="flex-1 text-right truncate">{fx.teams.home.name}</span>
                <img src={fx.teams.home.logo} alt="" className="w-4 h-4 shrink-0" />
                <span className="font-data text-score-amber w-14 text-center shrink-0">
                  {finished ? `${fx.goals.home} - ${fx.goals.away}` : timeText}
                </span>
                <img src={fx.teams.away.logo} alt="" className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{fx.teams.away.name}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default async function LeagueOverviewPage({
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
        <p className="text-floodlight/40">리그 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const { league } = data
  const season = league.season

  const [upcoming, news] = await Promise.all([
    getLeagueFixturesByMode(id, season, "next", 10),
    getLeagueNews(league.name),
  ])

  const nextOpponent = buildNextOpponentMap(upcoming)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-5xl mx-auto pb-16 px-4">
        <LeagueHeader
          leagueId={id}
          name={league.name}
          country={league.country}
          logo={league.logo}
          season={season}
          active="overview"
        />

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* 순위표 (다음 상대 컬럼 포함) */}
          <div>
            <StandingsWithFilter
              standings={league.standings}
              nextOpponent={nextOpponent}
              showFilter={false}
            />
          </div>

          {/* 다가오는 경기 위젯 */}
          {upcoming.length > 0 && <RoundFixturesWidget fixtures={upcoming} />}
        </div>

        {/* 뉴스 */}
        {news.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display uppercase tracking-wide text-sm text-floodlight/70">뉴스</h2>
              <Link href={`/leagues/${id}/news`} className="text-xs text-floodlight/40 hover:text-score-amber">
                전체 보기 →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {news.slice(0, 4).map((a, i) => (
                <a
                  key={i}
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 items-start hover:bg-turf-line/20 transition-colors p-1 -m-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-floodlight/90 leading-snug line-clamp-2">{a.title}</p>
                    <p className="text-xs text-floodlight/40 mt-1">
                      {a.source_name} · {new Date(a.pubDate).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  {a.image_url && (
                    <img src={a.image_url} alt="" className="w-24 h-16 object-cover shrink-0 rounded" />
                  )}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
