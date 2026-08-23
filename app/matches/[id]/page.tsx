import Link from "next/link"
import { generateMatchStory } from "@/lib/generateStory"
import PlayerAvatar from "@/components/PlayerAvatar"
import FotmobLineup from "@/components/FotmobLineup"
import Section from "@/components/Section"
import FollowButton from "@/components/FollowButton"
import MatchTabs from "@/components/MatchTabs"
import StandingsTable from "@/components/StandingsTable"
import MatchReviewCard from "@/components/MatchReviewCard"
import KeyStatsPanel from "@/components/KeyStatsPanel"
import MatchStatsPanel from "@/components/MatchStatsPanel"
import MatchEventsTimeline from "@/components/MatchEventsTimeline"
import TeamRecentForm from "@/components/TeamRecentForm"
import NextMatchCard from "@/components/NextMatchCard"
import MatchNewsCard from "@/components/MatchNewsCard"
import H2HPanel from "@/components/H2HPanel"
import MatchSidebar from "@/components/MatchSidebar"
import AdSlot from "@/components/AdSlot"
import { getSeasonYear } from "@/lib/season"
import {
  MOCK_MATCH_DETAIL,
  MOCK_STANDINGS,
  MOCK_TEAM_RECENT_FIXTURES,
  MOCK_NEXT_FIXTURE,
  MOCK_NEWS,
} from "@/lib/mockData"
import type { Metadata } from "next"


type FixtureDetail = {
  fixture: {
    id: number
    date: string
    status: { long: string; short?: string; elapsed?: number | null }
    venue: { id?: number | null; name: string; city: string }
    referee: string | null
  }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: { home: number | null; away: number | null }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    round?: string
  }
}

type Statistic = {
  team: { name: string }
  statistics: { type: string; value: number | string | null }[]
}

type MatchEvent = {
  time: { elapsed: number; extra: number | null }
  team: { name: string; logo: string }
  player: { name: string }
  assist: { name: string | null }
  type: string
  detail: string
}

type PlayerStat = {
  team: { name: string; logo: string }
  players: {
    player: { id?: number; name: string; photo: string }
    statistics: {
      games: { rating: string | null; position: string }
      goals: { total: number | null; assists: number | null }
    }[]
  }[]
}

type Lineup = {
  team: { name: string; logo: string }
  formation: string
  startXI: { player: { id: number; name: string; number: number; pos: string; grid: string | null } }[]
  substitutes?: { player: { id: number; name: string; number: number; pos: string; grid: string | null } }[]
  coach: { name: string; photo?: string }
}

type H2HMatch = {
  fixture: { id: number; date: string }
  teams: {
    home: { name: string; logo?: string; winner: boolean | null }
    away: { name: string; logo?: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  league?: { name: string; logo?: string }
}

type Prediction = {
  predictions: {
    winner: { name: string | null; comment: string | null }
    percent: { home: string; draw: string; away: string }
  }
}

type StandingRow = {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  description?: string | null
  all: { played: number; win: number; draw: number; lose: number }
}

type TeamFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
  league: { name: string; logo: string }
}

type NewsArticle = {
  title: string
  link: string
  image_url: string | null
  pubDate: string
  source_name: string
  description: string | null
}

const LIVE_CODES = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]
const FINISHED_CODES = ["FT", "AET", "PEN"]

async function apiFetch(path: string) {
  if (process.env.USE_MOCK_DATA === "true") {
    if (path.startsWith("/fixtures?id=")) return MOCK_MATCH_DETAIL.fixture
    if (path.startsWith("/fixtures/statistics")) return MOCK_MATCH_DETAIL.statistics
    if (path.startsWith("/fixtures/events")) return MOCK_MATCH_DETAIL.events
    if (path.startsWith("/fixtures/players")) return MOCK_MATCH_DETAIL.players
    if (path.startsWith("/fixtures/lineups")) return MOCK_MATCH_DETAIL.lineups
    if (path.startsWith("/fixtures/headtohead")) return MOCK_MATCH_DETAIL.headtohead
    if (path.startsWith("/predictions")) return MOCK_MATCH_DETAIL.predictions
    if (path.startsWith("/fixtures?team=") && path.includes("next=")) return MOCK_NEXT_FIXTURE
    if (path.startsWith("/fixtures?team=") && path.includes("last=")) return MOCK_TEAM_RECENT_FIXTURES
    return []
  }

  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return data.response
}

// 순위 탭 전용 — 리그 페이지와 별도 호출 (리그 id 기준으로 시즌 순위표를 가져옴)
async function getStandings(leagueId: number, season: number): Promise<StandingRow[][]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_STANDINGS.league.standings
  }

  const res = await fetch(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response?.[0]?.league?.standings ?? []
}

// 경기 관련 뉴스 — NewsData.io에서 두 팀 이름으로 검색 (news 페이지와 별개 호출)
async function getMatchNews(homeTeam: string, awayTeam: string): Promise<NewsArticle[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_NEWS
  }

  // 두 팀 이름이 모두 정확히 들어간 기사만 (경기 자체와 무관한 일반 팀 뉴스 배제)
  const query = encodeURIComponent(`"${homeTeam}" AND "${awayTeam}"`)
  const res = await fetch(
    `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${query}&language=en&category=sports`,
    { next: { revalidate: 3600 } }
  )
  const data = await res.json()

  if (!Array.isArray(data.results)) {
    console.error("NewsData.io 에러 (경기 관련 뉴스):", data)
    return []
  }

  return data.results ?? []
}

type VenueInfo = {
  name: string
  city: string | null
  capacity: number | null
  surface: string | null
  image: string | null
} | null

// 경기장 상세 정보 (수용 능력, 표면 등)
async function getVenueInfo(venueId: number | null | undefined, fallbackName: string, fallbackCity: string): Promise<VenueInfo> {
  if (!venueId || process.env.USE_MOCK_DATA === "true") {
    return { name: fallbackName, city: fallbackCity, capacity: null, surface: null, image: null }
  }

  const res = await fetch(`https://v3.football.api-sports.io/venues?id=${venueId}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 86400 },
  })
  const data = await res.json()
  const v = data.response?.[0]
  if (!v) return { name: fallbackName, city: fallbackCity, capacity: null, surface: null, image: null }
  return {
    name: v.name ?? fallbackName,
    city: v.city ?? fallbackCity,
    capacity: v.capacity ?? null,
    surface: v.surface ?? null,
    image: v.image ?? null,
  }
}

// 같은 라운드의 다른 경기들 (사이드바 위젯용)
async function getRoundFixtures(leagueId: number, season: number, round: string): Promise<TeamFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_RECENT_FIXTURES

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&round=${encodeURIComponent(round)}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response ?? []
}

// 이미 가져온 상대전적/최근 폼 데이터로 인사이트 문장 생성 (실데이터 기반, AI 아님)
function buildInsights(
  h2h: H2HMatch[],
  homeName: string,
  awayName: string,
  homeId: number,
  awayId: number,
  homeRecent: TeamFixture[],
  awayRecent: TeamFixture[],
  currentFixtureId: number
): { side: "home" | "away"; text: string }[] {
  const insights: { side: "home" | "away"; text: string }[] = []

  // 상대전적 요약 (홈팀 관점)
  let hWins = 0, aWins = 0, draws = 0
  for (const m of h2h) {
    if (m.fixture.id === currentFixtureId) continue
    if (m.goals.home === null || m.goals.away === null) continue
    if (m.goals.home === m.goals.away) { draws++; continue }
    const winner = m.goals.home > m.goals.away ? m.teams.home.name : m.teams.away.name
    if (winner === homeName) hWins++
    else if (winner === awayName) aWins++
  }
  const h2hTotal = hWins + aWins + draws
  if (h2hTotal > 0) {
    insights.push({
      side: "home",
      text: `${homeName}은(는) ${awayName}과(와)의 최근 상대전적 ${h2hTotal}경기에서 ${hWins}승 ${draws}무 ${aWins}패를 기록 중입니다.`,
    })
  }

  // 팀별 최근 폼 (현재 경기 제외 최근 5경기)
  const formOf = (teamId: number, fixtures: TeamFixture[]) => {
    const rows = fixtures.filter((f) => f.fixture.id !== currentFixtureId).slice(0, 5)
    let w = 0, d = 0, l = 0, goals = 0
    for (const f of rows) {
      if (f.goals.home === null || f.goals.away === null) continue
      const isHome = f.teams.home.id === teamId
      const own = isHome ? f.goals.home : f.goals.away
      const opp = isHome ? f.goals.away : f.goals.home
      goals += own
      if (own > opp) w++
      else if (own < opp) l++
      else d++
    }
    return { n: rows.length, w, d, l, goals }
  }

  const hf = formOf(homeId, homeRecent)
  if (hf.n > 0) {
    insights.push({
      side: "home",
      text: `${homeName}은(는) 최근 ${hf.n}경기에서 ${hf.w}승 ${hf.d}무 ${hf.l}패, ${hf.goals}골을 기록했습니다.`,
    })
  }
  const af = formOf(awayId, awayRecent)
  if (af.n > 0) {
    insights.push({
      side: "away",
      text: `${awayName}은(는) 최근 ${af.n}경기에서 ${af.w}승 ${af.d}무 ${af.l}패, ${af.goals}골을 기록했습니다.`,
    })
  }

  return insights
}

function getTopRatedPlayers(playerStats: PlayerStat[], count: number) {
  const all = playerStats.flatMap((team) =>
    team.players.map((p) => ({
      name: p.player.name,
      photo: p.player.photo,
      rating: p.statistics[0]?.games?.rating,
      position: p.statistics[0]?.games?.position,
      goals: p.statistics[0]?.goals?.total ?? 0,
      assists: p.statistics[0]?.goals?.assists ?? 0,
    }))
  )
  return all
    .filter((p) => p.rating)
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, count)
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const matchArr: FixtureDetail[] = await apiFetch(`/fixtures?id=${id}`)
  const match = matchArr?.[0] ?? null

  if (!match) {
    return { title: "경기 정보를 찾을 수 없습니다" }
  }

  const scoreText =
    match.goals.home !== null && match.goals.away !== null
      ? `${match.goals.home}:${match.goals.away}`
      : "경기 정보"

  return {
    title: `${match.teams.home.name} vs ${match.teams.away.name} (${scoreText})`,
    description: `${match.league.name} - ${match.teams.home.name}와 ${match.teams.away.name}의 경기 스코어, 라인업, 통계, AI 분석을 확인하세요.`,
  }
}


export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const matchArr: FixtureDetail[] = await apiFetch(`/fixtures?id=${id}`)
  const match = matchArr?.[0] ?? null

  if (!match) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/50">경기 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const season = getSeasonYear(match.league.country)

  const [
    stats,
    events,
    playerStats,
    lineups,
    h2h,
    predictions,
    standings,
    homeRecentFixtures,
    awayRecentFixtures,
    homeNextFixtureArr,
    awayNextFixtureArr,
    newsArticles,
    venueInfo,
    roundFixtures,
  ] = await Promise.all([
    apiFetch(`/fixtures/statistics?fixture=${id}`) as Promise<Statistic[]>,
    apiFetch(`/fixtures/events?fixture=${id}`) as Promise<MatchEvent[]>,
    apiFetch(`/fixtures/players?fixture=${id}`) as Promise<PlayerStat[]>,
    apiFetch(`/fixtures/lineups?fixture=${id}`) as Promise<Lineup[]>,
    apiFetch(`/fixtures/headtohead?h2h=${match.teams.home.id}-${match.teams.away.id}&last=20`) as Promise<H2HMatch[]>,
    apiFetch(`/predictions?fixture=${id}`) as Promise<Prediction[]>,
    getStandings(match.league.id, season),
    apiFetch(`/fixtures?team=${match.teams.home.id}&last=6`) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${match.teams.away.id}&last=6`) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${match.teams.home.id}&next=1`) as Promise<TeamFixture[]>,
    apiFetch(`/fixtures?team=${match.teams.away.id}&next=1`) as Promise<TeamFixture[]>,
    getMatchNews(match.teams.home.name, match.teams.away.name),
    getVenueInfo(match.fixture.venue?.id, match.fixture.venue?.name ?? "", match.fixture.venue?.city ?? ""),
    match.league.round
      ? getRoundFixtures(match.league.id, season, match.league.round)
      : Promise.resolve([] as TeamFixture[]),
  ])

  const statsSummary = stats.length === 2
    ? stats[0].statistics
        .map((s, i) => `${s.type}: ${s.value ?? 0} vs ${stats[1].statistics[i]?.value ?? 0}`)
        .join(", ")
    : "통계 데이터 없음"

  const isFinished = FINISHED_CODES.includes(match.fixture.status.short ?? "")

  // 경기가 끝난 경우에만 AI 리뷰를 생성. 시작 전/진행 중 경기에 결과 요약을 요청하면
  // AI가 없는 사실을 지어낼 수 있어서(할루시네이션) 반드시 이 조건이 필요함
  const story = isFinished
    ? await generateMatchStory({
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeScore: match.goals.home,
        awayScore: match.goals.away,
        leagueName: match.league.name,
        statsSummary,
      })
    : null

  const topPlayers = getTopRatedPlayers(playerStats, 3)
  const prediction = predictions?.[0]?.predictions
  const isLive = LIVE_CODES.includes(match.fixture.status.short ?? "")

  const insights = buildInsights(
    h2h,
    match.teams.home.name,
    match.teams.away.name,
    match.teams.home.id,
    match.teams.away.id,
    homeRecentFixtures,
    awayRecentFixtures,
    match.fixture.id
  )

  const dateText = new Date(match.fixture.date).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  const reviewHeadline = isFinished
    ? `${match.teams.home.name} ${match.goals.home}-${match.goals.away} ${match.teams.away.name}`
    : `${match.teams.home.name} vs ${match.teams.away.name}`

  const reviewSummary = story ?? "경기 예정 — AI 리뷰는 경기 종료 후 제공됩니다."

  const aboutText = `${match.teams.home.name}이(가) ${match.fixture.venue?.name ?? "미정 구장"}에서 ${match.teams.away.name}를(을) 상대합니다. 이 경기는 ${match.league.name}의 일부입니다. GoalLine에서 ${match.teams.home.name} vs ${match.teams.away.name} 실시간 스코어와 함께 라인업, 통계, 순위 등 경기 정보를 확인하실 수 있습니다.`

  // ── 탭별 콘텐츠 ──────────────────────────────────────────

  const factsContent = (
    <>
      <div className="mt-5">
        <MatchReviewCard
          headline={reviewHeadline}
          summary={reviewSummary}
          homeLogo={match.teams.home.logo}
          awayLogo={match.teams.away.logo}
        />
      </div>

      {stats.length === 2 && (
        <Section title="주요 통계">
          <KeyStatsPanel stats={stats} />
        </Section>
      )}

      <Section title="이벤트">
        <MatchEventsTimeline
          events={events}
          homeTeamName={match.teams.home.name}
          homeGoalsFinal={match.goals.home}
          awayGoalsFinal={match.goals.away}
          homeGoalsHT={match.score?.halftime?.home ?? null}
          awayGoalsHT={match.score?.halftime?.away ?? null}
          isFinished={isFinished}
        />
      </Section>

      <Section title="팀 기록">
        <TeamRecentForm
          homeTeamId={match.teams.home.id}
          awayTeamId={match.teams.away.id}
          homeFixtures={homeRecentFixtures}
          awayFixtures={awayRecentFixtures}
          currentFixtureId={match.fixture.id}
        />
      </Section>

      <Section title="다음 경기">
        <NextMatchCard
          homeTeamId={match.teams.home.id}
          awayTeamId={match.teams.away.id}
          homeNextFixture={homeNextFixtureArr?.[0] ?? null}
          awayNextFixture={awayNextFixtureArr?.[0] ?? null}
        />
      </Section>

      <Section title="뉴스">
        <MatchNewsCard articles={newsArticles} />
      </Section>

      <Section title="경기에 대하여">
        <p className="text-sm text-floodlight/60 leading-relaxed">{aboutText}</p>
      </Section>

      {prediction && (
        <Section title="승부 예측">
          <div className="flex h-2 overflow-hidden">
            <div className="bg-score-amber" style={{ width: `${prediction.percent.home}` }} />
            <div className="bg-floodlight/25" style={{ width: `${prediction.percent.draw}` }} />
            <div className="bg-floodlight/60" style={{ width: `${prediction.percent.away}` }} />
          </div>
          <div className="flex justify-between text-xs text-floodlight/50 mt-3 font-data">
            <span>{match.teams.home.name} {prediction.percent.home}</span>
            <span>무 {prediction.percent.draw}</span>
            <span>{match.teams.away.name} {prediction.percent.away}</span>
          </div>
          {prediction.winner.comment && (
            <p className="text-xs text-floodlight/40 mt-4">{prediction.winner.comment}</p>
          )}
        </Section>
      )}

      {topPlayers.length > 0 && (
        <Section title="이 경기 최고 평점">
          <div className="grid grid-cols-3 gap-4">
            {topPlayers.map((p) => (
              <div key={p.name} className="flex flex-col items-center text-center">
                <PlayerAvatar
                  src={p.photo}
                  alt={p.name}
                  className="w-16 h-16 rounded-full object-cover text-lg"
                />
                <span className="text-sm font-medium mt-1">{p.name}</span>
                <span className="text-xs text-floodlight/40">{p.position}</span>
                <span className="mt-1 font-display text-score-amber font-bold">{p.rating}</span>
                {(p.goals > 0 || p.assists > 0) && (
                  <span className="text-xs text-floodlight/40">
                    {p.goals > 0 && `⚽${p.goals}`} {p.assists > 0 && `🅰️${p.assists}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  )

  const tickerContent = (
    <Section title="경기 타임라인">
      <MatchEventsTimeline
        events={events}
        homeTeamName={match.teams.home.name}
        homeGoalsFinal={match.goals.home}
        awayGoalsFinal={match.goals.away}
        homeGoalsHT={match.score?.halftime?.home ?? null}
        awayGoalsHT={match.score?.halftime?.away ?? null}
        isFinished={isFinished}
      />
    </Section>
  )

  const lineupContent =
    lineups.length === 2 ? (
      <Section title="라인업">
        <FotmobLineup lineups={lineups} playerStats={playerStats} events={events} />
      </Section>
    ) : (
      <p className="text-floodlight/40 text-sm py-6 text-center">라인업 정보가 없습니다.</p>
    )

  const standingsContent = (
    <Section title="순위">
      <StandingsTable
        standings={standings}
        highlightTeamIds={[match.teams.home.id, match.teams.away.id]}
      />
    </Section>
  )

  const statsContent =
    stats.length === 2 ? (
      <Section title="통계">
        <MatchStatsPanel stats={stats} />
      </Section>
    ) : (
      <p className="text-floodlight/40 text-sm py-6 text-center">통계 정보가 없습니다.</p>
    )

  const h2hContent =
    h2h.length > 0 ? (
      <Section title="역대 전적">
        <H2HPanel
          matches={h2h}
          currentFixtureId={match.fixture.id}
          homeTeamName={match.teams.home.name}
          awayTeamName={match.teams.away.name}
          homeTeamLogo={match.teams.home.logo}
          awayTeamLogo={match.teams.away.logo}
        />
      </Section>
    ) : (
      <p className="text-floodlight/40 text-sm py-6 text-center">상대전적 정보가 없습니다.</p>
    )

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-5xl mx-auto pb-16 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start lg:px-4">
      <div className="max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
        {/* 상단 바: 뒤로가기 / 리그명+라운드 / 팔로우 */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-turf-line/60">
          <Link href="/matches" className="flex items-center gap-1.5 text-floodlight/70 hover:text-floodlight shrink-0">
            <span className="text-lg leading-none">‹</span>
            <span className="text-sm">경기</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-floodlight/80 min-w-0">
            <img src={match.league.logo} alt="" className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {match.league.name}
              {match.league.round ? ` ${match.league.round}` : ""}
            </span>
          </div>
          <FollowButton />
        </div>

        {/* 경기 메타 정보: 날짜 / 구장 / 심판 */}
        <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-floodlight/40 px-4 py-3 border-b border-turf-line/40">
          <span className="flex items-center gap-1.5">📅 {dateText}</span>
          {match.fixture.venue?.name && (
            <span className="flex items-center gap-1.5">🏟️ {match.fixture.venue.name}</span>
          )}
          {match.fixture.referee && (
            <span className="flex items-center gap-1.5">🎙️ {match.fixture.referee}</span>
          )}
        </div>

        {/* 스코어보드 */}
        <div className="relative overflow-hidden px-6 pt-8 pb-6">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 90% at 50% -10%, rgba(245,185,66,0.14), transparent 60%), radial-gradient(80% 60% at 50% 0%, rgba(36,73,46,0.5), transparent 70%)",
            }}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="font-display uppercase text-sm tracking-wide text-right leading-tight truncate">
                {match.teams.home.name}
              </span>
              <img src={match.teams.home.logo} alt="" className="w-9 h-9 shrink-0" />
            </div>

            <div className="flex flex-col items-center px-2 shrink-0">
              {isLive && (
                <span className="flex items-center gap-1.5 mb-1 text-live-red text-[11px] font-display uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-live-red animate-pulse" />
                  {match.fixture.status.elapsed}&apos; LIVE
                </span>
              )}
              <div className="font-display text-4xl text-score-amber tabular-nums leading-none [text-shadow:0_0_24px_rgba(245,185,66,0.35)]">
                {match.goals.home ?? "-"}
                <span className="text-floodlight/30 mx-1.5">-</span>
                {match.goals.away ?? "-"}
              </div>
              <span className="text-[11px] text-floodlight/40 mt-1.5">{match.fixture.status.long}</span>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={match.teams.away.logo} alt="" className="w-9 h-9 shrink-0" />
              <span className="font-display uppercase text-sm tracking-wide text-left leading-tight truncate">
                {match.teams.away.name}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4">
          <AdSlot label="경기 상세 배너 광고 (예: 728x90)" className="w-full h-16 mb-2" />
        </div>

        {/* 탭: 팩트 / 티커 / 라인업 / 순위 / 통계 / 역대전적 */}
        <MatchTabs
          facts={factsContent}
          ticker={tickerContent}
          lineup={lineupContent}
          standings={standingsContent}
          stats={statsContent}
          h2h={h2hContent}
        />
      </div>

      {/* 우측 사이드바 (모바일에서는 본문 아래로) */}
      <aside className="max-w-2xl mx-auto lg:mx-0 lg:max-w-none px-4 lg:px-0 mt-6 lg:mt-8">
        <MatchSidebar
          homeTeamName={match.teams.home.name}
          awayTeamName={match.teams.away.name}
          homeTeamLogo={match.teams.home.logo}
          awayTeamLogo={match.teams.away.logo}
          venue={venueInfo}
          leagueName={match.league.name}
          leagueLogo={match.league.logo}
          round={match.league.round}
          roundFixtures={roundFixtures}
          currentFixtureId={match.fixture.id}
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
        />
      </aside>
      </div>
    </main>
  )
}
