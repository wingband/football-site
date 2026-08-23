// 리그 관련 페이지들(개요/순위/경기/뉴스)이 공유하는 데이터 fetcher 모음
import { MOCK_STANDINGS, MOCK_SEASON_FIXTURES, MOCK_TOP_SCORERS, MOCK_NEWS } from "@/lib/mockData"

export type TeamSplit = {
  played: number
  win: number
  draw: number
  lose: number
  goals: { for: number; against: number }
}

export type StandingRow = {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  form?: string | null
  description?: string | null
  all: TeamSplit
  home?: TeamSplit
  away?: TeamSplit
}

export type LeagueResponse = {
  league: {
    id: number
    name: string
    country: string
    logo: string
    season: number
    standings: StandingRow[][]
  }
}

export type LeagueFixture = {
  fixture: { id: number; date: string; status: { long?: string; short: string } }
  league?: { round?: string }
  teams: {
    home: { id?: number; name: string; logo: string }
    away: { id?: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

export type ScorerEntry = {
  player: { id: number; name: string; photo: string }
  statistics: {
    team: { name: string; logo: string }
    goals: { total: number | null; assists: number | null }
    games: { appearences: number | null; rating: string | null }
  }[]
}

export type NewsArticle = {
  title: string
  link: string
  image_url: string | null
  pubDate: string
  source_name: string
  description: string | null
}

const HEADERS = () => ({ "x-apisports-key": process.env.API_FOOTBALL_KEY! })

export async function getLeagueStandings(leagueId: string, season: number): Promise<LeagueResponse | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_STANDINGS as unknown as LeagueResponse

  const res = await fetch(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    { headers: HEADERS(), next: { revalidate: 3600 } }
  )
  const data = await res.json()
  return data.response?.[0] ?? null
}

export async function getLeagueFixturesByMode(
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
    { headers: HEADERS(), next: { revalidate: 3600 } }
  )
  const data = await res.json()
  return data.response ?? []
}

export async function getSeasonFixtures(leagueId: string, season: number): Promise<LeagueFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_SEASON_FIXTURES as unknown as LeagueFixture[]

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`,
    { headers: HEADERS(), next: { revalidate: 3600 } }
  )
  const data = await res.json()
  return data.response ?? []
}

export async function getLeagueTopScorers(leagueId: string, season: number): Promise<ScorerEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TOP_SCORERS as unknown as ScorerEntry[]

  const res = await fetch(
    `https://v3.football.api-sports.io/players/topscorers?league=${leagueId}&season=${season}`,
    { headers: HEADERS(), next: { revalidate: 3600 } }
  )
  const data = await res.json()
  return data.response ?? []
}

export async function getLeagueTopAssists(leagueId: string, season: number): Promise<ScorerEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TOP_SCORERS as unknown as ScorerEntry[]

  const res = await fetch(
    `https://v3.football.api-sports.io/players/topassists?league=${leagueId}&season=${season}`,
    { headers: HEADERS(), next: { revalidate: 3600 } }
  )
  const data = await res.json()
  return data.response ?? []
}

export async function getLeagueNews(leagueName: string): Promise<NewsArticle[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_NEWS as unknown as NewsArticle[]

  // 따옴표로 정확한 구문 검색을 걸어서, 리그명과 무관한 일반 뉴스가 섞이는 것을 방지
  const query = encodeURIComponent(`"${leagueName}"`)
  const res = await fetch(
    `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${query}&language=en&category=sports`,
    { next: { revalidate: 3600 } }
  )
  const data = await res.json()
  if (!Array.isArray(data.results)) {
    console.error("NewsData.io 에러 (리그 뉴스):", data)
    return []
  }
  return data.results ?? []
}

// 예정 경기 목록에서 각 팀의 "다음 상대" 로고 맵 생성 (순위표 '다음' 컬럼용)
export function buildNextOpponentMap(upcoming: LeagueFixture[]): Record<number, string> {
  const map: Record<number, string> = {}
  const sorted = [...upcoming].sort(
    (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  )
  for (const fx of sorted) {
    const homeId = fx.teams.home.id
    const awayId = fx.teams.away.id
    if (homeId != null && map[homeId] === undefined) map[homeId] = fx.teams.away.logo
    if (awayId != null && map[awayId] === undefined) map[awayId] = fx.teams.home.logo
  }
  return map
}
