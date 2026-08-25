// 리그 관련 페이지들(개요/순위/경기/뉴스)이 공유하는 데이터 fetcher 모음
import { cache } from "react"
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

// 순위표/득점왕 등은 하루에도 몇 번씩 안 바뀌는 데이터라, 너무 짧게 잡으면
// 방문자가 늘 때마다 API 호출이 반복돼서 일일 요청 한도를 금방 먹는다
const DEFAULT_REVALIDATE = 10800 // 3시간

// API-Football은 파라미터가 잘못돼도 HTTP 200을 주고 response는 비워둔 채
// errors 필드에만 원인을 담는 경우가 많아서, res.ok만 보면 실패를 놓친다.
// 이 헬퍼가 상태코드/errors를 모두 확인해서 실패 원인을 로그로 남긴다
async function apiFootballFetch(path: string, revalidate = DEFAULT_REVALIDATE): Promise<unknown> {
  const url = `https://v3.football.api-sports.io${path}`
  const res = await fetch(url, { headers: HEADERS(), next: { revalidate } })
  const data = await res.json()

  const errors = data?.errors
  const hasErrors = errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0)

  if (!res.ok || hasErrors) {
    console.error(`API-Football 에러 [${path}]:`, {
      status: res.status,
      statusText: res.statusText,
      errors,
    })
  }

  return data
}

// layout.tsx와 page.tsx가 같은 리그의 순위표를 각자 다시 요청하는 경우가 많아서
// React cache()로 감싸둔다 — 같은 요청(한 페이지 방문) 안에서는 leagueId+season이
// 같으면 실제 fetch 없이 이전 결과를 그대로 재사용한다
export const getLeagueStandings = cache(async function getLeagueStandings(
  leagueId: string,
  season: number
): Promise<LeagueResponse | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_STANDINGS as unknown as LeagueResponse

  const data = await apiFootballFetch(`/standings?league=${leagueId}&season=${season}`) as { response?: LeagueResponse[] }
  return data.response?.[0] ?? null
})

export async function getLeagueFixturesByMode(
  leagueId: string,
  season: number,
  mode: "last" | "next",
  count: number
): Promise<LeagueFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_SEASON_FIXTURES.slice(0, count) as unknown as LeagueFixture[]
  }

  const data = await apiFootballFetch(`/fixtures?league=${leagueId}&season=${season}&${mode}=${count}`) as { response?: LeagueFixture[] }
  return data.response ?? []
}

export async function getSeasonFixtures(leagueId: string, season: number): Promise<LeagueFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_SEASON_FIXTURES as unknown as LeagueFixture[]

  const data = await apiFootballFetch(`/fixtures?league=${leagueId}&season=${season}`) as { response?: LeagueFixture[] }
  return data.response ?? []
}

export async function getLeagueTopScorers(leagueId: string, season: number): Promise<ScorerEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TOP_SCORERS as unknown as ScorerEntry[]

  const data = await apiFootballFetch(`/players/topscorers?league=${leagueId}&season=${season}`) as { response?: ScorerEntry[] }
  return data.response ?? []
}

export async function getLeagueTopAssists(leagueId: string, season: number): Promise<ScorerEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TOP_SCORERS as unknown as ScorerEntry[]

  const data = await apiFootballFetch(`/players/topassists?league=${leagueId}&season=${season}`) as { response?: ScorerEntry[] }
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
