// 팀 관련 페이지들(개요/순위/경기/스쿼드/이적/뉴스)이 공유하는 데이터 fetcher 모음
//
// (2026-09-20) getTeamInfo/getTeamSeasonFixtures/getTeamInjuries/getTeamCoach/
// getTeamCurrentLeague/getHistoricalRank는 res.ok만 확인하고 API-Football의
// "HTTP 200 + errors 필드" 실패를 놓쳐서 빈 응답을 정상값처럼 캐싱하는 문제가 있었고,
// getTeamSquad/getTeamTransfers/getTeamPlayerStats/getTeamSeasonStats는 그보다
// 더 근본적으로 Postgres 캐시(getCachedOrFetch) 자체를 안 쓰고 있어서 방문자 수만큼
// API를 그대로 소진하고 있었다(lib/playerData.ts에서 먼저 발견된 것과 같은 패턴).
// fetchApiFootball() 공용 함수로 통합하고, 캐시 안 쓰던 함수들에도 DB 캐시를 추가했다.
import { getCachedOrFetch } from "@/lib/apiCache"
import { fetchApiFootball, fetchApiFootballRaw } from "@/lib/apiFootballClient"
import { fetchNewsData } from "@/lib/newsData"
import {
  MOCK_TEAM_INFO,
  MOCK_TEAM_SQUAD,
  MOCK_TEAM_FIXTURES,
  MOCK_INJURIES,
  MOCK_COACH,
  MOCK_TEAM_TRANSFERS,
  MOCK_TEAM_LEAGUE,
  MOCK_TEAM_PLAYER_STATS,
  MOCK_NEWS,
} from "@/lib/mockData"

export type TeamInfo = {
  team: { id: number; name: string; country: string; founded: number; logo: string }
  venue: { name: string; city: string; capacity: number }
}

export type SquadPlayer = {
  player: { id: number; name: string; age: number; number?: number | null; photo: string }
  position: string
}

type RawSquadPlayer = {
  id: number
  name: string
  age: number
  number: number | null
  position: string
  photo: string
}

export type TeamFixture = {
  fixture: { id: number; date: string; status: { long?: string; short: string } }
  league?: { name?: string; logo?: string }
  teams: {
    home: { id?: number; name: string; logo: string }
    away: { id?: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

export type Injury = {
  player: { id: number; name: string; photo: string }
  type: string
  reason: string
}

export type Coach = {
  id: number
  name: string
  age: number | null
  nationality: string
  photo: string
  career: { team: { id: number; name: string; logo: string }; start: string; end: string | null }[]
}

export type TransferEntry = {
  player: { id: number; name: string }
  update: string
  transfers: {
    date: string
    type: string | null
    teams: {
      in: { id: number; name: string; logo: string }
      out: { id: number; name: string; logo: string }
    }
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

export async function getTeamInfo(teamId: string): Promise<TeamInfo | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_INFO as unknown as TeamInfo

  // 팀 기본 정보(이름/로고/창단연도)는 DB에 7일 이내 값이 있으면 API를 아예 안 부름.
  // (2026-09-17, 방문자/봇 수와 무관하게 API 소진량을 고정시키기 위한 DB 우선 캐시 1단계)
  try {
    return await getCachedOrFetch<TeamInfo | null>(`team-info:${teamId}`, 604800, async () => {
      const response = await fetchApiFootball(`/teams?id=${teamId}`, { revalidate: 86400 })
      return (response[0] as TeamInfo | undefined) ?? null
    })
  } catch (err) {
    console.error("getTeamInfo fetch 실패:", err instanceof Error ? err.message : err)
    return null
  }
}

export async function getTeamSquad(teamId: string): Promise<SquadPlayer[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_SQUAD as unknown as SquadPlayer[]

  try {
    // 스쿼드는 이적시장 기간 외엔 거의 안 바뀌어서 6시간으로 늘림.
    // (2026-09-20) 이전엔 이 함수가 DB 캐시를 전혀 안 써서 방문자 수만큼 API를
    // 그대로 소진했다 — 다른 팀 데이터 함수들과 동일한 패턴으로 캐싱 추가
    return await getCachedOrFetch<SquadPlayer[]>(`team-squad:${teamId}`, 21600, async () => {
      const response = await fetchApiFootball(`/players/squads?team=${teamId}`, { revalidate: 21600 })
      const rawPlayers = ((response[0] as { players?: RawSquadPlayer[] } | undefined)?.players) ?? []
      // API가 선수 정보를 평평한 구조로 주기 때문에({id, name, ...}), 우리 타입({player: {...}})에 맞게 변환
      return rawPlayers.map((p) => ({
        player: { id: p.id, name: p.name, age: p.age, number: p.number, photo: p.photo },
        position: p.position,
      }))
    })
  } catch (err) {
    console.error("getTeamSquad fetch 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

export async function getTeamSeasonFixtures(teamId: string, season: number, revalidate = 21600): Promise<TeamFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_FIXTURES as unknown as TeamFixture[]

  try {
    return await getCachedOrFetch<TeamFixture[]>(`team-fixtures:${teamId}:${season}`, revalidate, async () => {
      const response = await fetchApiFootball(`/fixtures?team=${teamId}&season=${season}`, { revalidate })
      return response as TeamFixture[]
    })
  } catch (err) {
    console.error("getTeamSeasonFixtures fetch 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

export async function getTeamInjuries(teamId: string, season: number, revalidate = 10800): Promise<Injury[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_INJURIES as unknown as Injury[]

  try {
    return await getCachedOrFetch<Injury[]>(`team-injuries:${teamId}:${season}`, revalidate, async () => {
      const response = await fetchApiFootball(`/injuries?team=${teamId}&season=${season}`, { revalidate })
      return response as Injury[]
    })
  } catch (err) {
    console.error("getTeamInjuries fetch 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

export async function getTeamCoach(teamId: string, expectedTeamId: number): Promise<Coach | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_COACH as unknown as Coach

  let coaches: Coach[] = []
  try {
    coaches = await getCachedOrFetch<Coach[]>(`team-coachs:${teamId}`, 604800, async () => {
      const response = await fetchApiFootball(`/coachs?team=${teamId}`, { revalidate: 86400 })
      return response as Coach[]
    })
  } catch (err) {
    console.error("getTeamCoach fetch 실패:", err instanceof Error ? err.message : err)
    return null
  }

  // API의 "퇴임일" 필드는 감독이 실제로 떠난 뒤에도 갱신 안 될 때가 많아서 신뢰도가 낮음.
  // 대신 "이 팀 소속으로 가장 최근에 부임한 사람"을 찾는 게 실제 현재 감독일 확률이 훨씬 높음
  let best: { coach: Coach; start: string } | null = null
  for (const c of coaches) {
    for (const car of c.career ?? []) {
      if (car.team.id !== expectedTeamId) continue
      if (!best || car.start > best.start) {
        best = { coach: c, start: car.start }
      }
    }
  }
  return best?.coach ?? null
}

export async function getTeamTransfers(teamId: string): Promise<TransferEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_TRANSFERS as unknown as TransferEntry[]

  try {
    // (2026-09-20) 이전엔 DB 캐시 없이 매번 라이브 호출했음 — 캐싱 추가
    return await getCachedOrFetch<TransferEntry[]>(`team-transfers:${teamId}`, 21600, async () => {
      const response = await fetchApiFootball(`/transfers?team=${teamId}`, { revalidate: 21600 })
      return response as TransferEntry[]
    })
  } catch (err) {
    console.error("getTeamTransfers fetch 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

// 팀이 현재 속한 리그 id/시즌 조회 (순위표 표시용)
export async function getTeamCurrentLeague(teamId: string): Promise<{ id: number; name: string; season: number } | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return { id: MOCK_TEAM_LEAGUE.league.id, name: MOCK_TEAM_LEAGUE.league.name, season: MOCK_TEAM_LEAGUE.league.season }
  }

  try {
    return await getCachedOrFetch(`team-league:${teamId}`, 86400, async () => {
      const response = await fetchApiFootball(`/leagues?team=${teamId}&current=true&type=league`, { revalidate: 86400 })
      const entry = response[0] as
        | { league: { id: number; name: string }; seasons?: { year: number; current: boolean }[] }
        | undefined
      if (!entry) return null
      const season = entry.seasons?.find((s) => s.current)?.year ?? entry.seasons?.[0]?.year
      return { id: entry.league.id, name: entry.league.name, season: season as number }
    })
  } catch (err) {
    console.error("getTeamCurrentLeague fetch 실패:", err instanceof Error ? err.message : err)
    return null
  }
}

export async function getTeamNews(teamName: string): Promise<NewsArticle[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_NEWS as unknown as NewsArticle[]

  // (2026-09-21) fetchNewsData()로 통합 — DB 캐시(6시간) 적용으로 API 소진 절감
  const query = encodeURIComponent(`"${teamName}" AND (football OR soccer OR match OR transfer OR goal)`)
  const results = await fetchNewsData(query)
  const teamLower = teamName.toLowerCase()
  return results.filter((a) => a.title?.toLowerCase().includes(teamLower))
}

// ── 플레이어 통계 탭 (시즌 개인 기록) ──────────────────────────
export type TeamPlayerSeasonStat = {
  player: { id: number; name: string; photo: string }
  statistics: {
    games: { appearences: number | null; minutes: number | null; rating: string | null }
    goals: { total: number | null; assists: number | null }
  }[]
}

export async function getTeamPlayerStats(teamId: string, season: number): Promise<TeamPlayerSeasonStat[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_TEAM_PLAYER_STATS as unknown as TeamPlayerSeasonStat[]
  }

  try {
    // (2026-09-20) 이전엔 DB 캐시 없이 매번 라이브 호출했음 — 캐싱 추가
    return await getCachedOrFetch<TeamPlayerSeasonStat[]>(`team-player-stats:${teamId}:${season}`, 10800, async () => {
      const response = await fetchApiFootball(`/players?team=${teamId}&season=${season}`, { revalidate: 10800 })
      return response as TeamPlayerSeasonStat[]
    })
  } catch (err) {
    console.error("getTeamPlayerStats fetch 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

// ── 기록 탭: 과거 시즌 순위 ──────────────────────────────────
export async function getHistoricalRank(
  leagueId: number,
  teamId: number,
  season: number
): Promise<number | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return Math.floor(Math.random() * 10) + 1
  }

  // 과거 시즌 순위는 한 번 확정되면 절대 안 바뀌는 데이터라 30일로 캐시하는데,
  // 기존엔 errors 필드를 체크 안 해서 API 실패로 받은 빈 배열이 최대 30일간
  // "이 시즌 순위 없음"으로 박제될 위험이 있었다 (가장 오래 캐싱되는 함수라 가장 위험)
  const path = `/standings?league=${leagueId}&season=${season}`
  try {
    const groups = await getCachedOrFetch<any[]>(path, 2592000, async () => {
      const response = await fetchApiFootball(path, { revalidate: 86400 })
      return (response[0] as { league?: { standings?: any[] } } | undefined)?.league?.standings ?? []
    })
    for (const group of groups) {
      const row = group.find((r: { team: { id: number } }) => r.team.id === teamId)
      if (row) return row.rank
    }
    return null
  } catch (err) {
    console.error("getHistoricalRank fetch 실패:", err instanceof Error ? err.message : err)
    return null
  }
}

// ── 팀 시즌 종합 통계 (/teams/statistics) ─────────────────────
export type TeamSeasonStats = {
  league: { name: string; logo: string }
  form: string | null
  fixtures: {
    played: { home: number; away: number; total: number }
    wins: { home: number; away: number; total: number }
    draws: { home: number; away: number; total: number }
    loses: { home: number; away: number; total: number }
  }
  goals: {
    for: { total: { home: number; away: number; total: number }; average: { home: string; away: string; total: string } }
    against: { total: { home: number; away: number; total: number }; average: { home: string; away: string; total: string } }
  }
  biggest: {
    streak: { wins: number; draws: number; loses: number }
    wins: { home: string | null; away: string | null }
    loses: { home: string | null; away: string | null }
    goals: { for: { home: number; away: number }; against: { home: number; away: number } }
  }
  clean_sheet: { home: number; away: number; total: number }
  failed_to_score: { home: number; away: number; total: number }
  penalty: { scored: { total: number; percentage: string }; missed: { total: number; percentage: string }; total: number }
}

export async function getTeamSeasonStats(teamId: string, leagueId: number, season: number): Promise<TeamSeasonStats | null> {
  if (process.env.USE_MOCK_DATA === "true") return null

  try {
    // (2026-09-20) /teams/statistics는 API-Football의 다른 엔드포인트와 달리 response가
    // 배열이 아니라 객체 하나로 온다 — fetchApiFootball은 "배열이어야 한다"를 강제하므로
    // 여기 쓰면 항상 실패한다. 배열 검증만 생략하는 fetchApiFootballRaw를 대신 쓴다
    // (errors 체크/재시도는 동일하게 적용됨). 이전엔 DB 캐시도 없이 매번 라이브 호출했음.
    return await getCachedOrFetch<TeamSeasonStats | null>(
      `team-season-stats:${teamId}:${leagueId}:${season}`,
      10800,
      async () => {
        const response = await fetchApiFootballRaw(
          `/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
          { revalidate: 10800 }
        )
        return (response as TeamSeasonStats) ?? null
      }
    )
  } catch (err) {
    console.error("getTeamSeasonStats fetch 실패:", err instanceof Error ? err.message : err)
    return null
  }
}
