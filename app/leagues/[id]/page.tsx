import Link from "next/link"
import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import FollowButton from "@/components/FollowButton"
import StandingsTable from "@/components/StandingsTable"
import PlayerAvatar from "@/components/PlayerAvatar"
import { MOCK_STANDINGS, MOCK_SEASON_FIXTURES, MOCK_TOP_SCORERS } from "@/lib/mockData"

type StandingRow = {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  form: string | null
  description?: string | null
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: { for: number; against: number }
  }
}

type LeagueResponse = {
  league: {
    id: number
    name: string
    country: string
    logo: string
    season: number
    standings: StandingRow[][]
  }
}

type LeagueFixture = {
  fixture: { id: number; date: string; status: { long?: string; short: string } }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

type ScorerEntry = {
  player: { id: number; name: string; photo: string }
  statistics: {
    team: { name: string; logo: string }
    goals: { total: number | null; assists: number | null }
    games: { appearences: number | null }
  }[]
}

const FINISHED_CODES = ["FT", "AET", "PEN"]

async function getStandings(leagueId: string, season: number): Promise<LeagueResponse | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_STANDINGS
  }

  const res = await fetch(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response?.[0] ?? null
}

// 리그의 최근/예정 경기 (개요 상단 가로 스크롤 카드용)
async function getLeagueFixtures(
  leagueId: string,
  season: number,
  mode: "last" | "next",
  count: number
): Promise<LeagueFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_SEASON_FIXTURES.slice(0, count) as unknown as LeagueFixture[]
  }

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&${mode}=${count}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response ?? []
}

async function getTopScorers(leagueId: string, season: number): Promise<ScorerEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TOP_SCORERS

  const res = await fetch(
    `https://v3.football.api-sports.io/players/topscorers?league=${leagueId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response ?? []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const euroSeason = getSeasonYear("England")
  let data = await getStandings(id, euroSeason)
  if (!data) {
    data = await getStandings(id, new Date().getFullYear())
  }

  if (!data) {
    return { title: "리그 정보를 찾을 수 없습니다" }
  }

  return {
    title: `${data.league.name} 개요`,
    description: `${data.league.name}(${data.league.country}) ${data.league.season} 시즌 순위표, 최신 결과, 예정 경기, 득점왕을 확인하세요.`,
  }
}

// 개요 상단의 경기 카드 하나
function FixtureCard({ fx }: { fx: LeagueFixture }) {
  const finished = FINISHED_CODES.includes(fx.fixture.status.short)
  const dateText = new Date(fx.fixture.date).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  })
  const timeText = new Date(fx.fixture.date).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Link
      href={`/matches/${fx.fixture.id}`}
      className="shrink-0 w-44 bg-turf/40 border border-turf-line/40 rounded-md p-3 hover:bg-turf-line/30 transition-colors"
    >
      <p className="text-[10px] text-floodlight/40 mb-2">
        {dateText} {!finished && timeText}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <img src={fx.teams.home.logo} alt="" className="w-4 h-4 shrink-0" />
          <span className="text-xs truncate flex-1">{fx.teams.home.name}</span>
          <span className="font-data text-xs font-bold">{finished ? fx.goals.home : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <img src={fx.teams.away.logo} alt="" className="w-4 h-4 shrink-0" />
          <span className="text-xs truncate flex-1">{fx.teams.away.name}</span>
          <span className="font-data text-xs font-bold">{finished ? fx.goals.away : ""}</span>
        </div>
      </div>
      <p className="text-[10px] text-floodlight/30 mt-2">
        {finished ? "경기 종료" : "경기 예정"}
      </p>
    </Link>
  )
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const euroSeason = getSeasonYear("England")
  let data = await getStandings(id, euroSeason)
  if (!data) {
    const calendarSeason = new Date().getFullYear()
    data = await getStandings(id, calendarSeason)
  }

  if (!data || data.league.standings.length === 0) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">리그 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const { league } = data
  const season = league.season

  const [recentFixtures, upcomingFixtures, topScorers] = await Promise.all([
    getLeagueFixtures(id, season, "last", 5),
    getLeagueFixtures(id, season, "next", 5),
    getTopScorers(id, season),
  ])

  // 최근 경기(과거순 정렬) + 예정 경기를 이어서 하나의 스트립으로
  const fixtureStrip = [
    ...[...recentFixtures].sort(
      (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
    ),
    ...upcomingFixtures,
  ]

  const scorers = topScorers.slice(0, 5)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto pb-16 px-4">
        {/* 리그 헤더 */}
        <div className="flex items-center justify-between gap-3 pt-8 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={league.logo} alt="" className="w-12 h-12 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display uppercase text-xl text-floodlight truncate">
                {league.name}
              </h1>
              <p className="text-xs text-floodlight/40">
                {league.country} · {season} 시즌
              </p>
            </div>
          </div>
          <FollowButton />
        </div>

        {/* 탭 바 */}
        <div className="flex gap-1 border-b border-turf-line/60 mb-6 text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 px-4 py-3 border-b-2 border-score-amber text-score-amber font-medium">
            개요
          </span>
          <Link
            href={`/leagues/${id}/fixtures`}
            className="shrink-0 px-4 py-3 text-floodlight/40 hover:text-floodlight/70"
          >
            경기
          </Link>
          <Link
            href={`/leagues/${id}/topscorers`}
            className="shrink-0 px-4 py-3 text-floodlight/40 hover:text-floodlight/70"
          >
            득점 순위
          </Link>
        </div>

        {/* 경기 스트립 (최근 결과 + 예정 경기) */}
        {fixtureStrip.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display uppercase tracking-wide text-sm text-floodlight/70 mb-3">
              경기
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {fixtureStrip.map((fx) => (
                <FixtureCard key={fx.fixture.id} fx={fx} />
              ))}
            </div>
          </section>
        )}

        {/* 순위표 */}
        <section className="mb-8">
          <h2 className="font-display uppercase tracking-wide text-sm text-floodlight/70 mb-3">
            순위
          </h2>
          <StandingsTable standings={league.standings} />
        </section>

        {/* 득점왕 */}
        {scorers.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display uppercase tracking-wide text-sm text-floodlight/70">
                최다 득점
              </h2>
              <Link
                href={`/leagues/${id}/topscorers`}
                className="text-xs text-floodlight/40 hover:text-score-amber"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="divide-y divide-turf-line/30">
              {scorers.map((s, i) => {
                const stat = s.statistics[0]
                return (
                  <Link
                    key={s.player.id}
                    href={`/players/${s.player.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-turf-line/20 transition-colors"
                  >
                    <span className="font-data text-sm text-floodlight/40 w-5 text-center shrink-0">
                      {i + 1}
                    </span>
                    <PlayerAvatar
                      src={s.player.photo}
                      alt={s.player.name}
                      className="w-9 h-9 rounded-full object-cover bg-turf-line text-xs shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{s.player.name}</p>
                      <p className="text-[11px] text-floodlight/40 flex items-center gap-1">
                        {stat?.team.logo && (
                          <img src={stat.team.logo} alt="" className="w-3 h-3" />
                        )}
                        {stat?.team.name}
                      </p>
                    </div>
                    <span className="font-data font-bold text-score-amber shrink-0">
                      {stat?.goals.total ?? 0}골
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <Link href="/matches" className="text-sm text-floodlight/40 hover:text-score-amber">
          ← 경기 목록으로
        </Link>
      </div>
    </main>
  )
}
