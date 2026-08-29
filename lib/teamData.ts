// 팀 관련 페이지들(개요/순위/경기/스쿼드/이적/뉴스)이 공유하는 데이터 fetcher 모음
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

const HEADERS = () => ({ "x-apisports-key": process.env.API_FOOTBALL_KEY! })

export async function getTeamInfo(teamId: string): Promise<TeamInfo | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_INFO as unknown as TeamInfo

  const res = await fetch(`https://v3.football.api-sports.io/teams?id=${teamId}`, {
    headers: HEADERS(),
    // 팀 이름/로고/창단연도 같은 기본 정보는 사실상 안 바뀌어서 24시간으로 크게 늘림
    next: { revalidate: 86400 },
  })
  const data = await res.json()
  return data.response?.[0] ?? null
}

export async function getTeamSquad(teamId: string): Promise<SquadPlayer[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_SQUAD as unknown as SquadPlayer[]

  const res = await fetch(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, {
    headers: HEADERS(),
    // 스쿼드는 이적시장 기간 외엔 거의 안 바뀌어서 6시간으로 늘림
    next: { revalidate: 21600 },
  })
  const data = await res.json()
  const rawPlayers: {
    id: number
    name: string
    age: number
    number: number | null
    position: string
    photo: string
  }[] = data.response?.[0]?.players ?? []

  // API가 선수 정보를 평평한 구조로 주기 때문에({id, name, ...}), 우리 타입({player: {...}})에 맞게 변환
  return rawPlayers.map((p) => ({
    player: { id: p.id, name: p.name, age: p.age, number: p.number, photo: p.photo },
    position: p.position,
  }))
}

export async function getTeamSeasonFixtures(teamId: string, season: number): Promise<TeamFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_FIXTURES as unknown as TeamFixture[]

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?team=${teamId}&season=${season}`,
    // 시즌 전체 일정은 자주 안 바뀌어서 6시간으로 늘림
    { headers: HEADERS(), next: { revalidate: 21600 } }
  )
  const data = await res.json()
  return data.response ?? []
}

export async function getTeamInjuries(teamId: string, season: number): Promise<Injury[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_INJURIES as unknown as Injury[]

  const res = await fetch(
    `https://v3.football.api-sports.io/injuries?team=${teamId}&season=${season}`,
    // 부상자 명단은 하루에도 여러 번 안 바뀌어서 3시간으로 늘림
    { headers: HEADERS(), next: { revalidate: 10800 } }
  )
  const data = await res.json()
  return data.response ?? []
}

export async function getTeamCoach(teamId: string, expectedTeamId: number): Promise<Coach | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_COACH as unknown as Coach

  const res = await fetch(`https://v3.football.api-sports.io/coachs?team=${teamId}`, {
    headers: HEADERS(),
    // 감독 교체는 자주 있는 일이 아니라서 24시간으로 늘림
    next: { revalidate: 86400 },
  })
  const data = await res.json()
  const coaches: Coach[] = data.response ?? []

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

  const res = await fetch(`https://v3.football.api-sports.io/transfers?team=${teamId}`, {
    headers: HEADERS(),
    next: { revalidate: 21600 },
  })
  const data = await res.json()
  return data.response ?? []
}

// 팀이 현재 속한 리그 id/시즌 조회 (순위표 표시용)
export async function getTeamCurrentLeague(teamId: string): Promise<{ id: number; name: string; season: number } | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return { id: MOCK_TEAM_LEAGUE.league.id, name: MOCK_TEAM_LEAGUE.league.name, season: MOCK_TEAM_LEAGUE.league.season }
  }

  const res = await fetch(
    `https://v3.football.api-sports.io/leagues?team=${teamId}&current=true&type=league`,
    { headers: HEADERS(), next: { revalidate: 86400 } }
  )
  const data = await res.json()
  const entry = data.response?.[0]
  if (!entry) return null
  const season = entry.seasons?.find((s: { current: boolean }) => s.current)?.year ?? entry.seasons?.[0]?.year
  return { id: entry.league.id, name: entry.league.name, season }
}

export async function getTeamNews(teamName: string): Promise<NewsArticle[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_NEWS as unknown as NewsArticle[]

  // 팀명을 정확한 구문 검색 + football 키워드 AND 조건으로 관련 기사만 추출
  // 예: "Arsenal" AND (football OR soccer OR match OR transfer OR goal OR Premier League)
  const query = encodeURIComponent(`"${teamName}" AND (football OR soccer OR match OR transfer OR goal)`)
  const res = await fetch(
    `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${query}&language=en&category=sports`,
    { next: { revalidate: 3600 } }
  )
  const data = await res.json()
  if (!Array.isArray(data.results)) {
    console.error("NewsData.io 에러 (팀 뉴스):", data)
    return []
  }
  // 팀명이 제목에 포함된 기사만 필터링 (2차 필터)
  const teamLower = teamName.toLowerCase()
  return (data.results as NewsArticle[]).filter(
    (a) => a.title?.toLowerCase().includes(teamLower)
  )
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

  // API-Football players 엔드포인트는 페이지당 20명까지만 반환 (1페이지만 조회 — 대부분 주전급은 커버됨)
  const res = await fetch(
    `https://v3.football.api-sports.io/players?team=${teamId}&season=${season}`,
    // 시즌 통계는 경기 하나 끝난다고 바로바로 볼 필요는 없어서 3시간으로 늘림
    { headers: HEADERS(), next: { revalidate: 10800 } }
  )
  const data = await res.json()
  return data.response ?? []
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

  const res = await fetch(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    { headers: HEADERS(), next: { revalidate: 86400 } }
  )
  const data = await res.json()
  const groups = data.response?.[0]?.league?.standings ?? []
  for (const group of groups) {
    const row = group.find((r: { team: { id: number } }) => r.team.id === teamId)
    if (row) return row.rank
  }
  return null
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
    const res = await fetch(
      `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
      // 팀 시즌 종합 통계도 3시간으로 늘림
      { headers: HEADERS(), next: { revalidate: 10800 } }
    )
    const data = await res.json()
    return data.response ?? null
  } catch {
    return null
  }
}
