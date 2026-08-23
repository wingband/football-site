// 선수 개별 프로필 페이지가 쓰는 데이터 fetcher 모음
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

const HEADERS = () => ({ "x-apisports-key": process.env.API_FOOTBALL_KEY! })

export async function getPlayerData(playerId: string, season: number): Promise<PlayerData | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_PLAYER as unknown as PlayerData

  const res = await fetch(
    `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`,
    { headers: HEADERS(), next: { revalidate: 3600 } }
  )
  const data = await res.json()
  return data.response?.[0] ?? null
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
  const res = await fetch(`https://v3.football.api-sports.io/players/profiles?player=${playerId}`, {
    headers: HEADERS(),
    next: { revalidate: 86400 },
  })
  const data = await res.json()
  const profile = data.response?.[0]?.player
  if (!profile) return null
  return { player: profile, statistics: [] }
}

export async function getPlayerTransfers(playerId: string): Promise<TransferEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_PLAYER_TRANSFERS as unknown as TransferEntry[]

  const res = await fetch(`https://v3.football.api-sports.io/transfers?player=${playerId}`, {
    headers: HEADERS(),
    next: { revalidate: 21600 },
  })
  const data = await res.json()
  return data.response ?? []
}

export async function getTrophies(playerId: string): Promise<Trophy[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TROPHIES as unknown as Trophy[]

  const res = await fetch(`https://v3.football.api-sports.io/trophies?player=${playerId}`, {
    headers: HEADERS(),
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return data.response ?? []
}

// 경력(소속팀 이력): 최근 5개 시즌을 각각 조회해서 팀별로 합침 (전용 "경력" 엔드포인트가 없어서 이렇게 재구성)
export async function getPlayerCareer(
  playerId: string,
  currentSeason: number,
  seasonsBack = 5
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
      const res = await fetch(
        `https://v3.football.api-sports.io/players?id=${playerId}&season=${year}`,
        { headers: HEADERS(), next: { revalidate: 86400 } }
      )
      const data = await res.json()
      const stats: PlayerSeasonStat[] = data.response?.[0]?.statistics ?? []
      return { year, stats }
    })
  )

  const byTeam = new Map<number, { teamName: string; teamLogo: string; seasons: Set<number>; apps: number; goals: number }>()
  for (const { year, stats } of results) {
    for (const s of stats) {
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

  const fixturesRes = await fetch(
    `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=${count}`,
    { headers: HEADERS(), next: { revalidate: 3600 } }
  )
  const fixturesData = await fixturesRes.json()
  const fixtures: { fixture: { id: number; date: string }; teams: { home: { name: string; logo: string }; away: { name: string; logo: string } }; goals: { home: number | null; away: number | null } }[] =
    fixturesData.response ?? []

  const withStats = await Promise.all(
    fixtures.map(async (fx) => {
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures/players?fixture=${fx.fixture.id}`,
        { headers: HEADERS(), next: { revalidate: 86400 } }
      )
      const data = await res.json()
      const teams: { players: { player: { id: number }; statistics: PlayerSeasonStat[] }[] }[] = data.response ?? []
      for (const team of teams) {
        const found = team.players.find((p) => p.player.id === Number(playerId))
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
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/sidelined?player=${playerId}`,
      { headers: HEADERS(), next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return (data.response ?? []).map((s: { type: string; start: string | null; end: string | null }) => ({
      type: s.type,
      start: s.start,
      end: s.end,
    }))
  } catch {
    return []
  }
}
