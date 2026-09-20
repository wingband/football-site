// 선수 개별 프로필 페이지가 쓰는 데이터 fetcher 모음
//
// (2026-09-20) 기존에는 이 파일의 모든 fetcher가 res.ok만 확인하고 API-Football이
// "HTTP 200 + errors 필드"로 알리는 실패(레이트리밋/쿼터초과 등)를 체크하지 않아서,
// 일시적 API 오류로 받은 빈 응답이 "이 선수는 존재하지 않는다"는 성공값처럼
// getCachedOrFetch에 최대 24시간 동안 영구 캐시되는 사고가 있었다 (양민혁 등
// 최근 이적한 선수의 페이지가 간헐적으로 "선수 정보를 찾을 수 없습니다"로 막힘).
// lib/matchApi.ts 등에 이미 적용된 공용 fetchApiFootball()로 통합해서
// errors 체크와 실패 시 throw(=캐시 안 됨)를 모든 fetcher에 일괄 적용한다.
import { getCachedOrFetch } from "@/lib/apiCache"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import {
  MOCK_PLAYER,
  MOCK_PLAYER_TRANSFERS,
  MOCK_PLAYER_RECENT_MATCHES,
  MOCK_TROPHIES,
} from "@/lib/mockData"

export type PlayerBio = {
  id: number
  name: string
  age: number
  birth: { date: string | null; country: string | null }
  nationality: string
  height: string | null
  weight: string | null
  photo: string
}

export type PlayerSeasonStat = {
  team: { id: number; name: string; logo: string }
  league: { id: number; name: string; logo: string; country: string }
  games: {
    appearences: number | null
    lineups: number | null
    minutes: number | null
    number: number | null
    position: string
    rating: string | null
    captain: boolean
  }
  substitutes: { in: number | null; out: number | null; bench: number | null }
  goals: { total: number | null; assists: number | null; conceded: number | null; saves: number | null }
  shots: { total: number | null; on: number | null }
  passes: { total: number | null; key: number | null; accuracy: number | null }
  tackles: { total: number | null; blocks: number | null; interceptions: number | null }
  duels: { total: number | null; won: number | null }
  dribbles: { attempts: number | null; success: number | null; past: number | null }
  fouls: { drawn: number | null; committed: number | null }
  cards: { yellow: number | null; yellowred: number | null; red: number | null }
  penalty: { won: number | null; committed: number | null; scored: number | null; missed: number | null; saved: number | null }
}

export type PlayerData = { player: PlayerBio; statistics: PlayerSeasonStat[] }

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

export type PlayerRecentMatch = {
  fixture: { id: number; date: string }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
  stat: {
    games: { minutes: number | null; rating: string | null }
    goals: { total: number | null; assists: number | null }
    cards: { yellow: number | null; red: number | null }
  }
}

export type Trophy = { league: string; country: string; season: string; place: string }

// 캐시 키는 API 경로 문자열 그대로 쓴다 — matchApi.ts의 apiFetch와 동일한 관례라,
// 같은 리소스(예: /fixtures/players?fixture=X)를 경기 페이지 쪽에서 이미 캐시해뒀으면
// 여기서도 API를 안 부르고 바로 재사용된다. (2026-09-17, DB 우선 캐시 3단계 — 선수 페이지)

export async function getPlayerData(playerId: string, season: number): Promise<PlayerData | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_PLAYER as unknown as PlayerData

  const path = `/players?id=${playerId}&season=${season}`
  try {
    return await getCachedOrFetch<PlayerData | null>(path, 10800, async () => {
      const response = await fetchApiFootball(path, { revalidate: 10800 })
      return (response[0] as PlayerData | undefined) ?? null
    })
  } catch (err) {
    console.error("getPlayerData fetch 실패:", err instanceof Error ? err.message : err)
    return null
  }
}

// 최근 이적 선수처럼 새 시즌 통계가 아직 안 잡힌 경우를 위한 폴백.
// 여러 시즌을 순서대로 시도하고, 그래도 없으면 통계 없이 기본 프로필만이라도 반환
export async function getPlayerDataWithFallback(
  playerId: string,
  primarySeason: number
): Promise<PlayerData | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_PLAYER as unknown as PlayerData

  const candidateSeasons = [
    primarySeason,
    new Date().getFullYear(),
    primarySeason - 1,
    primarySeason - 2,
  ]

  for (const season of candidateSeasons) {
    const data = await getPlayerData(playerId, season)
    if (data && data.statistics.length > 0) return data
  }

  // 시즌 통계를 어디서도 못 찾으면 프로필(기본 정보)만이라도 조회
  const path = `/players/profiles?player=${playerId}`
  try {
    const profile = await getCachedOrFetch<PlayerBio | null>(path, 86400, async () => {
      const response = await fetchApiFootball(path, { revalidate: 86400 })
      return (response[0] as { player: PlayerBio } | undefined)?.player ?? null
    })
    if (!profile) return null
    return { player: profile, statistics: [] }
  } catch (err) {
    console.error("getPlayerDataWithFallback fetch 실패:", err instanceof Error ? err.message : err)
    return null
  }
}

export async function getPlayerTransfers(playerId: string): Promise<TransferEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_PLAYER_TRANSFERS as unknown as TransferEntry[]

  const path = `/transfers?player=${playerId}`
  try {
    return await getCachedOrFetch<TransferEntry[]>(path, 21600, async () => {
      const response = await fetchApiFootball(path, { revalidate: 21600 })
      return response as TransferEntry[]
    })
  } catch (err) {
    console.error("getPlayerTransfers fetch 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

export async function getTrophies(playerId: string): Promise<Trophy[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TROPHIES as unknown as Trophy[]

  const path = `/trophies?player=${playerId}`
  try {
    // 트로피 목록은 사실상 거의 안 바뀌어서 24시간으로 늘림
    return await getCachedOrFetch<Trophy[]>(path, 86400, async () => {
      const response = await fetchApiFootball(path, { revalidate: 86400 })
      return response as Trophy[]
    })
  } catch (err) {
    console.error("getTrophies fetch 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

// 경력(소속팀 이력): 최근 3개 시즌을 각각 조회해서 팀별로 합침 (전용 "경력" 엔드포인트가 없어서 이렇게 재구성)
// 원래 5시즌이었는데, ?season= 파라미터를 돌며 스크래핑당할 때 시즌당 5콜씩 나가던
// 비용을 줄이려고 3으로 낮춤 (2026-09-07) — "최근 경력" 표시 목적엔 3개로도 충분.
// 각 시즌 fetch는 getPlayerData와 똑같은 경로(/players?id=X&season=Y)를 쓰기 때문에
// 캐시 키가 자동으로 겹쳐서, 선수 페이지에서 이미 조회한 시즌은 여기서 또 안 부른다
export async function getPlayerCareer(
  playerId: string,
  currentSeason: number,
  seasonsBack = 3
): Promise<{ teamId: number; teamName: string; teamLogo: string; seasons: number[]; apps: number; goals: number }[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return [
      { teamId: 165, teamName: "Borussia Dortmund", teamLogo: "https://media.api-sports.io/football/teams/165.png", seasons: [2020, 2021], apps: 89, goals: 86 },
      { teamId: 50, teamName: "Manchester City", teamLogo: "https://media.api-sports.io/football/teams/50.png", seasons: [2022, 2023, 2024, 2025, 2026], apps: 150, goals: 140 },
    ]
  }

  const years = Array.from({ length: seasonsBack }, (_, i) => currentSeason - (seasonsBack - 1 - i))
  const results = await Promise.all(
    years.map(async (year) => {
      const path = `/players?id=${playerId}&season=${year}`
      try {
        const stats = await getCachedOrFetch<PlayerSeasonStat[]>(path, 86400, async () => {
          const response = await fetchApiFootball(path, { revalidate: 86400 })
          const s = (response[0] as { statistics?: PlayerSeasonStat[] } | undefined)?.statistics
          return Array.isArray(s) ? s : []
        })
        return { year, stats: Array.isArray(stats) ? stats : [] }
      } catch (err) {
        console.error("getPlayerCareer fetch 실패:", err instanceof Error ? err.message : err)
        return { year, stats: [] as PlayerSeasonStat[] }
      }
    })
  )

  const byTeam = new Map<number, { teamName: string; teamLogo: string; seasons: Set<number>; apps: number; goals: number }>()
  for (const { year, stats } of results) {
    for (const s of Array.isArray(stats) ? stats : []) {
      if (!s.team?.id) continue
      if (!byTeam.has(s.team.id)) {
        byTeam.set(s.team.id, { teamName: s.team.name, teamLogo: s.team.logo, seasons: new Set(), apps: 0, goals: 0 })
      }
      const entry = byTeam.get(s.team.id)!
      entry.seasons.add(year)
      entry.apps += s.games.appearences ?? 0
      entry.goals += s.goals.total ?? 0
    }
  }

  return [...byTeam.entries()]
    .map(([teamId, v]) => ({
      teamId,
      teamName: v.teamName,
      teamLogo: v.teamLogo,
      seasons: [...v.seasons].sort((a, b) => a - b),
      apps: v.apps,
      goals: v.goals,
    }))
    .sort((a, b) => Math.min(...a.seasons) - Math.min(...b.seasons))
}

// 최근 경기 리스트: 이 선수 소속팀의 최근 경기를 가져온 뒤, 경기별로 이 선수의 개인 기록을 조회
export async function getPlayerRecentMatches(
  playerId: string,
  teamId: number,
  season: number,
  count = 8
): Promise<PlayerRecentMatch[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_PLAYER_RECENT_MATCHES as unknown as PlayerRecentMatch[]

  type FixtureEntry = {
    fixture: { id: number; date: string }
    teams: { home: { name: string; logo: string }; away: { name: string; logo: string } }
    goals: { home: number | null; away: number | null }
  }

  const fixturesPath = `/fixtures?team=${teamId}&last=${count}`
  let fixtures: FixtureEntry[] = []
  try {
    fixtures = await getCachedOrFetch<FixtureEntry[]>(fixturesPath, 10800, async () => {
      const response = await fetchApiFootball(fixturesPath, { revalidate: 10800 })
      return response as FixtureEntry[]
    })
    if (!Array.isArray(fixtures)) fixtures = []
  } catch (err) {
    console.error("getPlayerRecentMatches fixtures fetch 실패:", err instanceof Error ? err.message : err)
  }

  type FixturePlayersTeam = { players: { player: { id: number }; statistics: PlayerSeasonStat[] }[] }

  const withStats = await Promise.all(
    fixtures.map(async (fx) => {
      const path = `/fixtures/players?fixture=${fx.fixture.id}`
      let teams: FixturePlayersTeam[] = []
      try {
        teams = await getCachedOrFetch<FixturePlayersTeam[]>(path, 86400, async () => {
          const response = await fetchApiFootball(path, { revalidate: 86400 })
          return response as FixturePlayersTeam[]
        })
      } catch (err) {
        console.error("getPlayerRecentMatches fixture players fetch 실패:", err instanceof Error ? err.message : err)
        return null
      }

      for (const team of Array.isArray(teams) ? teams : []) {
        const found = (Array.isArray(team.players) ? team.players : []).find((p) => p.player.id === Number(playerId))
        if (found) {
          const s = found.statistics[0]
          return {
            fixture: fx.fixture,
            teams: fx.teams,
            goals: fx.goals,
            stat: {
              games: { minutes: s?.games?.minutes ?? null, rating: s?.games?.rating ?? null },
              goals: { total: s?.goals?.total ?? null, assists: s?.goals?.assists ?? null },
              cards: { yellow: s?.cards?.yellow ?? null, red: s?.cards?.red ?? null },
            },
          }
        }
      }
      return null
    })
  )

  return withStats.filter((m): m is PlayerRecentMatch => m !== null)
}

export type SidelinedEntry = {
  type: string
  start: string | null
  end: string | null
}

export async function getSidelined(playerId: string): Promise<SidelinedEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return []

  const path = `/sidelined?player=${playerId}`
  try {
    return await getCachedOrFetch<SidelinedEntry[]>(path, 10800, async () => {
      const response = await fetchApiFootball(path, { revalidate: 10800 })
      return (response as { type: string; start: string | null; end: string | null }[]).map((s) => ({
        type: s.type,
        start: s.start,
        end: s.end,
      }))
    })
  } catch {
    return []
  }
}
