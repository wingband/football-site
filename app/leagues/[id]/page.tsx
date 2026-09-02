import Link from "next/link"
import { matchHref } from "@/lib/slug"
import type { Metadata } from "next"
import PlayerAvatar from "@/components/PlayerAvatar"
import { getSeasonYear } from "@/lib/season"
import StandingsWithFilter from "@/components/StandingsWithFilter"
import {
  getLeagueStandings,
  getLeagueFixturesByMode,
  getLeagueNews,
  getLeagueTopScorers,
  getLeagueTopAssists,
  buildNextOpponentMap,
  type LeagueFixture,
  type ScorerEntry,
} from "@/lib/leagueData"
import { checkApiFootballStatus } from "@/lib/apiFootballStatus"
import Logo from "@/components/Logo"

const FINISHED_CODES = ["FT", "AET", "PEN"]

// ── 이번 주의 팀 (FotMob 우측 패널) ─────────────────────────────────────
type StarPlayer = { id: number; name: string; photo: string; teamName: string; teamLogo: string; rating: string; pos: string }

function WeekTeamPanel({ players }: { players: StarPlayer[] }) {
  if (players.length === 0) return null
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md overflow-hidden">
      <p className="text-sm font-medium px-4 py-3 border-b border-turf-line/40">이번 주의 팀</p>
      <div className="divide-y divide-turf-line/20">
        {players.map((p) => (
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/20 transition-colors group"
          >
            <PlayerAvatar src={p.photo} alt={p.name} className="w-10 h-10 rounded-full object-cover bg-turf-line text-xs shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium group-hover:text-score-amber transition-colors truncate">{p.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Logo src={p.teamLogo} alt="" className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs text-floodlight/50 truncate">{p.teamName}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              {(() => {
                const n = parseFloat(p.rating)
                const bg = n >= 8 ? "bg-green-600" : n >= 7 ? "bg-green-700" : "bg-orange-500"
                return (
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white font-data ${bg}`}>
                    {n.toFixed(2)} ★
                  </span>
                )
              })()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── 다가오는 경기 위젯 ────────────────────────────────────────────────────
function RoundFixturesWidget({ fixtures }: { fixtures: LeagueFixture[] }) {
  const sorted = [...fixtures].sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
  const groups = new Map<string, LeagueFixture[]>()
  for (const fx of sorted) {
    const key = new Date(fx.fixture.date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })
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
            const timeText = new Date(fx.fixture.date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
            return (
              <Link key={fx.fixture.id} href={matchHref(fx)}
                className="flex items-center justify-center gap-2 px-4 py-3 text-xs hover:bg-turf-line/20 border-b border-turf-line/20 last:border-b-0">
                <span className="flex-1 text-right truncate text-floodlight/80">{fx.teams.home.name}</span>
                <Logo src={fx.teams.home.logo} alt="" className="w-4 h-4 shrink-0" />
                <span className="font-data text-score-amber w-16 text-center shrink-0">
                  {finished ? `${fx.goals.home} - ${fx.goals.away}` : timeText}
                </span>
                <Logo src={fx.teams.away.logo} alt="" className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate text-floodlight/80">{fx.teams.away.name}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── 득점/도움 리더보드 ───────────────────────────────────────────────────
type LeaderRow = { id: number; name: string; photo: string; teamName: string; teamLogo: string; value: string | number }

function LeaderboardCard({ title, rows, moreHref }: { title: string; rows: LeaderRow[]; moreHref?: string }) {
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
      <p className="text-sm font-semibold mb-3 text-floodlight/90">{title}</p>
      {rows.length === 0 ? (
        <p className="text-floodlight/40 text-xs">데이터가 없습니다.</p>
      ) : (
        <div className="divide-y divide-turf-line/20">
          {rows.map((r, i) => (
            <Link key={r.id} href={`/players/${r.id}`}
              className="flex items-center gap-2.5 py-2.5 hover:bg-turf-line/20 transition-colors -mx-1 px-1">
              <span className="text-xs text-floodlight/30 w-4 text-center">{i + 1}</span>
              <PlayerAvatar src={r.photo} alt={r.name} className="w-8 h-8 rounded-full object-cover bg-turf-line text-[10px] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate text-floodlight/90">{r.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Logo src={r.teamLogo} alt="" className="w-3 h-3" />
                  <span className="text-[11px] text-floodlight/45 truncate">{r.teamName}</span>
                </div>
              </div>
              <span className="font-data font-bold bg-score-amber/15 text-score-amber px-2.5 py-0.5 rounded-full shrink-0 text-sm">
                {r.value}
              </span>
            </Link>
          ))}
        </div>
      )}
      {moreHref && (
        <Link href={moreHref} className="block text-center text-xs text-floodlight/40 hover:text-score-amber mt-3">
          더 보기 →
        </Link>
      )}
    </div>
  )
}

function toRows(entries: ScorerEntry[], key: "goals" | "assists"): LeaderRow[] {
  return entries.slice(0, 5).map((s) => ({
    id: s.player.id,
    name: s.player.name,
    photo: s.player.photo,
    teamName: s.statistics[0]?.team.name ?? "",
    teamLogo: s.statistics[0]?.team.logo ?? "",
    value: key === "goals" ? (s.statistics[0]?.goals.total ?? 0) : (s.statistics[0]?.goals.assists ?? 0),
  }))
}

function toRatingRows(scorers: ScorerEntry[], assists: ScorerEntry[]): StarPlayer[] {
  const pool = new Map<number, ScorerEntry>()
  for (const s of [...scorers, ...assists]) pool.set(s.player.id, s)
  return [...pool.values()]
    .filter((s) => s.statistics[0]?.games.rating)
    .sort((a, b) => Number(b.statistics[0].games.rating) - Number(a.statistics[0].games.rating))
    .slice(0, 8)
    .map((s) => ({
      id: s.player.id,
      name: s.player.name,
      photo: s.player.photo,
      teamName: s.statistics[0]?.team.name ?? "",
      teamLogo: s.statistics[0]?.team.logo ?? "",
      rating: s.statistics[0]?.games.rating ?? "",
      pos: "",
    }))
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const sp = await searchParams
  const euroSeason = getSeasonYear("England")
  const thisYear = new Date().getFullYear()

  let data
  if (sp.season) {
    data = await getLeagueStandings(id, parseInt(sp.season))
  } else {
    data = await getLeagueStandings(id, euroSeason)
    if (!data && thisYear !== euroSeason) data = await getLeagueStandings(id, thisYear)
    if (!data) data = await getLeagueStandings(id, euroSeason - 1)
  }
  if (!data) return { title: "리그 정보를 찾을 수 없습니다" }
  return {
    title: `${data.league.name} 팀 개요`,
    description: `${data.league.name} ${data.league.season} 시즌 순위표, 예정 경기, 득점 순위를 확인하세요.`,
  }
}

export default async function LeagueOverviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ season?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const euroSeason = getSeasonYear("England")
  const thisYear = new Date().getFullYear()

  // URL ?season= 파라미터 우선, 없으면 기본 시즌 순서로 탐색
  let season: number
  let data
  if (sp.season) {
    season = parseInt(sp.season)
    data = await getLeagueStandings(id, season)
  } else {
    data = await getLeagueStandings(id, euroSeason)
    if (!data && thisYear !== euroSeason) data = await getLeagueStandings(id, thisYear)
    if (!data) data = await getLeagueStandings(id, euroSeason - 1)
    season = data?.league.season ?? euroSeason
  }

  if (!data || data.league.standings.length === 0) {
    const apiStatus = await checkApiFootballStatus()
    return (
      <div className="pt-4">
        <p className="text-floodlight/40">리그 정보를 찾을 수 없습니다.</p>
        {!apiStatus.ok && (
          <p className="text-floodlight/25 text-xs mt-1.5">원인: {apiStatus.message}</p>
        )}
      </div>
    )
  }

  const { league } = data

  const [upcoming, news, topScorers, topAssists] = await Promise.all([
    getLeagueFixturesByMode(id, season, "next", 10),
    getLeagueNews(league.name),
    getLeagueTopScorers(id, season),
    getLeagueTopAssists(id, season),
  ])

  const nextOpponent = buildNextOpponentMap(upcoming)
  const goalRows = toRows(topScorers, "goals")
  const assistRows = toRows(topAssists, "assists")
  const starPlayers = toRatingRows(topScorers, topAssists)

  return (
    <>
      {/* ── 메인 2컬럼 (FotMob 스타일) ── */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* 좌: 순위표 */}
        <div>
          <StandingsWithFilter
            standings={league.standings}
            nextOpponent={nextOpponent}
            showFilter={true}
          />
        </div>

        {/* 우: 이번 주의 팀 + 다가오는 경기 */}
        <div className="space-y-4">
          <WeekTeamPanel players={starPlayers} />
          {upcoming.length > 0 && <RoundFixturesWidget fixtures={upcoming} />}
        </div>
      </div>

      {/* ── 득점/도움 순위 (하단 2열) ── */}
      {(goalRows.length > 0 || assistRows.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <LeaderboardCard title="득점 순위" rows={goalRows} moreHref={`/leagues/${id}/topscorers`} />
          <LeaderboardCard title="도움 순위" rows={assistRows} />
        </div>
      )}

      {/* ── 뉴스 ── */}
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
              <a key={i} href={a.link} target="_blank" rel="noopener noreferrer"
                className="flex gap-3 items-start hover:bg-turf-line/20 transition-colors p-1 -m-1">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-floodlight/90 leading-snug line-clamp-2">{a.title}</p>
                  <p className="text-xs text-floodlight/40 mt-1">
                    {a.source_name} · {new Date(a.pubDate).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                {a.image_url && <img src={a.image_url} alt="" className="w-24 h-16 object-cover shrink-0 rounded" />}
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
