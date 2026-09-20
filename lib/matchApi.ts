import { getCachedOrFetch } from "@/lib/apiCache"
import { fetchApiFootball } from "@/lib/apiFootballClient"
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

// API-Football/외부 API가 쿼터 소진·혼잡 등으로 응답을 늦게 주거나 안 줄 때
// 기본 fetch는 타임아웃이 없어 함수가 몇 분씩 붙잡혀 있게 된다 (Vercel 함수 지속시간
// 낭비 + 동시성 점유의 핵심 원인으로 확인됨, 2026-09-07). AbortController로 강제 컷오프.
const API_TIMEOUT_MS = 8000

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
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

  // path 자체가 파라미터까지 포함한 고유 식별자라 캐시 키로 그대로 쓸 수 있다.
  // DB에 신선한 값이 있으면 API를 아예 안 부름 — 같은 경기를 몇 명이 몇 번을 다시 봐도
  // ttl 안에서는 실시간 호출이 0번. (2026-09-17, 방문자 수와 API 소진량을 분리하는
  // 2단계 — 팀 데이터에 이어 경기 페이지가 담당하는 대부분의 콜을 여기서 한 번에 처리)
  //
  // (2026-09-19) 예전엔 여기서 catch로 []를 반환했는데, getCachedOrFetch가 그 []를
  // "정상 성공한 값"으로 착각해서 그대로 DB에 영구 저장해버리는 버그가 있었다 —
  // 타임아웃/일시적 API 오류 한 번이 캐시 TTL이 끝날 때까지 "경기 정보 없음"으로
  // 영구 박제됐다 (Bayern München vs Union Berlin 경기에서 실제 확인됨: API는
  // 정상 데이터를 갖고 있는데 우리 DB엔 빈 배열이 저장돼 있었음). 실패는 절대
  // 캐시하면 안 되므로, 여기선 에러를 그대로 던지고 빈 배열 폴백은 호출부 쪽
  // (fetchFixture 등, 이미 DB 폴백 로직이 있는 곳)에서만 하도록 바꾼다.
  // (2026-09-20) 실제 fetch/재시도/에러판별 로직은 lib/apiFootballClient.ts로
  // 통합했다. 여기선 그 결과를 DB 우선 캐시(getCachedOrFetch)로 감싸는 역할만 한다.
  const ttl = revalidate ?? 60
  return await getCachedOrFetch(path, ttl, () => fetchApiFootball(path, { revalidate: ttl }))
}

export async function getStandings(leagueId: number, season: number): Promise<StandingRow[][]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_STANDINGS.league.standings
  }
  try {
    return await getCachedOrFetch(`standings:${leagueId}:${season}`, 10800, async () => {
      const response = await fetchApiFootball(`/standings?league=${leagueId}&season=${season}`, { revalidate: 10800 })
      return (response[0] as { league?: { standings?: StandingRow[][] } })?.league?.standings ?? []
    })
  } catch (err) {
    console.error("getStandings fetch 실패/타임아웃:", err instanceof Error ? err.message : err)
    return []
  }
}

export async function getMatchNews(homeTeam: string, awayTeam: string): Promise<NewsArticle[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_NEWS

  const query = encodeURIComponent(`"${homeTeam}" AND "${awayTeam}"`)
  try {
    const res = await fetchWithTimeout(
      `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${query}&language=en&category=sports`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()

    if (!Array.isArray(data.results)) {
      console.error("NewsData.io 에러 (경기 관련 뉴스):", data)
      return []
    }
    return data.results ?? []
  } catch (err) {
    console.error("getMatchNews fetch 실패/타임아웃:", err instanceof Error ? err.message : err)
    return []
  }
}

export async function getVenueInfo(
  venueId: number | null | undefined,
  fallbackName: string,
  fallbackCity: string
): Promise<VenueInfo> {
  if (!venueId || process.env.USE_MOCK_DATA === "true") {
    return { name: fallbackName, city: fallbackCity, capacity: null, surface: null, image: null }
  }
  const fallback = { name: fallbackName, city: fallbackCity, capacity: null, surface: null, image: null }
  try {
    const response = await fetchApiFootball(`/venues?id=${venueId}`, { revalidate: 86400 })
    const v = response[0] as { name?: string; city?: string; capacity?: number; surface?: string; image?: string } | undefined
    if (!v) return fallback
    return {
      name: v.name ?? fallbackName,
      city: v.city ?? fallbackCity,
      capacity: v.capacity ?? null,
      surface: v.surface ?? null,
      image: v.image ?? null,
    }
  } catch (err) {
    console.error("getVenueInfo fetch 실패/타임아웃:", err instanceof Error ? err.message : err)
    return fallback
  }
}

export async function getRoundFixtures(
  leagueId: number,
  season: number,
  round: string,
  revalidate = 10800
): Promise<TeamFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_RECENT_FIXTURES as TeamFixture[]
  try {
    return await getCachedOrFetch(`round-fixtures:${leagueId}:${season}:${round}`, revalidate, () =>
      fetchApiFootball(`/fixtures?league=${leagueId}&season=${season}&round=${encodeURIComponent(round)}`, { revalidate }) as Promise<TeamFixture[]>
    )
  } catch (err) {
    console.error("getRoundFixtures fetch 실패/타임아웃:", err instanceof Error ? err.message : err)
    return []
  }
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
