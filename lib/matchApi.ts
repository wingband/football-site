import {
  MOCK_MATCH_DETAIL,
  MOCK_STANDINGS,
  MOCK_TEAM_RECENT_FIXTURES,
  MOCK_NEXT_FIXTURE,
  MOCK_NEWS,
} from "@/lib/mockData"

export type VenueInfo = {
  name: string
  city: string | null
  capacity: number | null
  surface: string | null
  image: string | null
} | null

export type TeamFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
  league: { name: string; logo: string }
}

export type H2HMatch = {
  fixture: { id: number; date: string }
  teams: {
    home: { name: string; logo?: string; winner: boolean | null }
    away: { name: string; logo?: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  league?: { name: string; logo?: string }
}

export type StandingRow = {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  description?: string | null
  all: { played: number; win: number; draw: number; lose: number }
}

export type NewsArticle = {
  title: string
  link: string
  image_url: string | null
  pubDate: string
  source_name: string
  description: string | null
}

export async function apiFetch(path: string, revalidate?: number): Promise<unknown> {
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

  // revalidate를 안 넘기면 예전엔 /fixtures?id= 호출을 cache:"no-store"로 보내서
  // 캐시를 완전히 우회했다. /matches/[slug]가 사이트 최고 트래픽 페이지라
  // 방문마다 무조건 실시간 API 호출이 나가는 셈이었다 — 60초 캐시로 바꿔서
  // (라이브 경기 갱신에는 충분히 짧고, 나머지 경우엔 캐시가 대부분 흡수한다)
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: revalidate ?? 60 },
  })
  const data = await res.json()
  return data.response
}

export async function getStandings(leagueId: number, season: number): Promise<StandingRow[][]> {
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

export async function getMatchNews(homeTeam: string, awayTeam: string): Promise<NewsArticle[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_NEWS

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

export async function getVenueInfo(
  venueId: number | null | undefined,
  fallbackName: string,
  fallbackCity: string
): Promise<VenueInfo> {
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

export async function getRoundFixtures(
  leagueId: number,
  season: number,
  round: string
): Promise<TeamFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_RECENT_FIXTURES as TeamFixture[]
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

export function buildInsights(
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
