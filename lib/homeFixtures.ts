import { getCachedOrFetch } from "@/lib/apiCache"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import { getTodayStr, shiftDate } from "@/lib/dateUtils"
import { koLeague, koTeam } from "@/lib/koreanWeekly"

// 메인 화면 "최근 경기 결과" 박스용 (2026-10-11 메인 개편).
// /matches 페이지와 같은 DB 캐시 키(/fixtures?date=X)를 써서, 메인이 생겨도 API 호출이 늘지 않는다.

type RawFixture = {
  fixture: { id: number; date: string; status: { short: string; elapsed: number | null } }
  league: { id: number; name: string; logo: string }
  teams: { home: { id: number; name: string; logo: string }; away: { id: number; name: string; logo: string } }
  goals: { home: number | null; away: number | null }
}

export type HomeResult = {
  fixtureId: number
  date: string
  leagueId: number
  leagueName: string
  leagueLogo: string
  home: { name: string; logo: string }
  away: { name: string; logo: string }
  homeScore: number | null
  awayScore: number | null
  live: boolean
  elapsed: number | null
  slugSource: { fixture: { id: number; date: string }; teams: { home: { name: string }; away: { name: string } } }
}

// 메인에 올릴 리그 (노출 순서 = 우선순위)
const HOME_LEAGUES = [39, 2, 140, 78, 135, 61, 292, 3, 848]
const FINISHED = new Set(["FT", "AET", "PEN"])
const LIVE = new Set(["1H", "2H", "HT", "ET", "BT", "P", "INT", "LIVE"])

async function fixturesByDate(date: string, ttl: number): Promise<RawFixture[]> {
  const path = `/fixtures?date=${date}`
  try {
    const data = await getCachedOrFetch<RawFixture[]>(path, ttl, async () =>
      (await fetchApiFootball(path, { revalidate: ttl, tags: [`fixtures-${date}`] })) as RawFixture[]
    )
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error("메인: 경기 목록 조회 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

// 오늘·어제(한국 시간) 끝났거나 진행 중인 주요 리그 경기, 최신순 최대 limit개
export async function getHomeResults(limit = 8): Promise<HomeResult[]> {
  const today = getTodayStr()
  const yesterday = shiftDate(today, -1)
  const [a, b] = await Promise.all([fixturesByDate(today, 1800), fixturesByDate(yesterday, 3600)])

  const seen = new Set<number>()
  const rows = [...a, ...b].filter((f) => {
    if (seen.has(f.fixture.id)) return false
    seen.add(f.fixture.id)
    const s = f.fixture.status.short
    return HOME_LEAGUES.includes(f.league.id) && (FINISHED.has(s) || LIVE.has(s))
  })

  rows.sort((x, y) => {
    // 진행 중 경기 먼저, 그다음 리그 우선순위, 그다음 최신순
    const lx = LIVE.has(x.fixture.status.short) ? 0 : 1
    const ly = LIVE.has(y.fixture.status.short) ? 0 : 1
    if (lx !== ly) return lx - ly
    const px = HOME_LEAGUES.indexOf(x.league.id)
    const py = HOME_LEAGUES.indexOf(y.league.id)
    if (px !== py) return px - py
    return new Date(y.fixture.date).getTime() - new Date(x.fixture.date).getTime()
  })

  return rows.slice(0, limit).map((f) => ({
    fixtureId: f.fixture.id,
    date: f.fixture.date,
    leagueId: f.league.id,
    leagueName: koLeague(f.league.name),
    leagueLogo: f.league.logo,
    home: { name: koTeam(f.teams.home.name), logo: f.teams.home.logo },
    away: { name: koTeam(f.teams.away.name), logo: f.teams.away.logo },
    homeScore: f.goals.home,
    awayScore: f.goals.away,
    live: LIVE.has(f.fixture.status.short),
    elapsed: f.fixture.status.elapsed,
    slugSource: {
      fixture: { id: f.fixture.id, date: f.fixture.date },
      teams: { home: { name: f.teams.home.name }, away: { name: f.teams.away.name } },
    },
  }))
}
