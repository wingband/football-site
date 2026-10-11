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
  // 한국 시간 기준 날짜(YYYY-MM-DD)와 시각(HH:mm), 화면용 라벨("오늘"·"어제"·"10.10 (토)")
  day: string
  time: string
  whenLabel: string
  slugSource: { fixture: { id: number; date: string }; teams: { home: { name: string }; away: { name: string } } }
}

// 메인에 올릴 리그 (탭 순서이기도 하다)
export const HOME_LEAGUE_TABS = [
  { id: 39, label: "프리미어리그" },
  { id: 140, label: "라리가" },
  { id: 78, label: "분데스리가" },
  { id: 135, label: "세리에A" },
  { id: 61, label: "리그1" },
  { id: 292, label: "K리그1" },
  { id: 2, label: "챔피언스리그" },
  { id: 3, label: "유로파리그" },
] as const
const HOME_LEAGUES: number[] = [...HOME_LEAGUE_TABS.map((l) => l.id), 848]
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"]
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

// 캐시에 "진행 중" 상태로 박제된 지난 경기를 바로잡는다 (2026-10-12, 어제·그저께 경기가 며칠째 "진행 중"으로 뜨던 문제).
// 킥오프 2시간 반이 지났는데 아직 진행 중으로 저장돼 있으면 그 날짜를 한 번 새로 받아 DB 캐시를 갱신한다.
// 서버 인스턴스마다 날짜당 15분에 한 번만 시도해서, API가 계속 "진행 중"이라고 주는 경우에도 호출이 불어나지 않는다.
const STALE_LIVE_MS = 2.5 * 3600_000
const lastForced = new Map<string, number>()

async function fixturesForDay(date: string, ttl: number): Promise<RawFixture[]> {
  const list = await fixturesByDate(date, ttl)
  const now = Date.now()
  const stale = list.some((f) => LIVE.has(f.fixture.status.short) && now - new Date(f.fixture.date).getTime() > STALE_LIVE_MS)
  if (stale && now - (lastForced.get(date) ?? 0) > 15 * 60_000) {
    lastForced.set(date, now)
    return await fixturesByDate(date, 0) // ttl 0 → 캐시를 건너뛰고 새로 받아 저장
  }
  return list
}

// 최근 3일(한국 시간) 안에 끝났거나 진행 중인 주요 리그 경기. 진행 중 → 최신순.
// 오늘·어제는 /matches와 같은 캐시 키를 쓰고, 그저께 하루만 추가로 DB 캐시에 쌓인다.
export async function getHomeResults(limit = 60): Promise<HomeResult[]> {
  const today = getTodayStr()
  const days = [today, shiftDate(today, -1), shiftDate(today, -2)]
  const lists = await Promise.all(days.map((d, i) => fixturesForDay(d, i === 0 ? 1800 : i === 1 ? 3600 : 86400)))

  const labelOf = (day: string) => {
    const i = days.indexOf(day)
    if (i === 0) return "오늘"
    if (i === 1) return "어제"
    const wd = WEEKDAY[new Date(`${day}T00:00:00Z`).getUTCDay()]
    return `${Number(day.slice(5, 7))}.${day.slice(8, 10)} (${wd})`
  }

  const seen = new Set<number>()
  const rows = lists.flat().filter((f) => {
    if (seen.has(f.fixture.id)) return false
    seen.add(f.fixture.id)
    const s = f.fixture.status.short
    return HOME_LEAGUES.includes(f.league.id) && (FINISHED.has(s) || LIVE.has(s))
  })

  rows.sort((x, y) => {
    const lx = LIVE.has(x.fixture.status.short) ? 0 : 1
    const ly = LIVE.has(y.fixture.status.short) ? 0 : 1
    if (lx !== ly) return lx - ly
    return new Date(y.fixture.date).getTime() - new Date(x.fixture.date).getTime()
  })

  return rows.slice(0, limit).map((f) => {
    const k = new Date(new Date(f.fixture.date).getTime() + 9 * 3600_000)
    const day = k.toISOString().slice(0, 10)
    return {
      fixtureId: f.fixture.id,
      date: f.fixture.date,
      leagueId: f.league.id,
      leagueName: koLeague(f.league.name),
      leagueLogo: f.league.logo,
      home: { name: koTeam(f.teams.home.name), logo: f.teams.home.logo },
      away: { name: koTeam(f.teams.away.name), logo: f.teams.away.logo },
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      // 새로 받아도 킥오프 후 3시간 반이 넘었는데 진행 중이라면 데이터 지연으로 보고 종료로 표시
      live: LIVE.has(f.fixture.status.short) && Date.now() - new Date(f.fixture.date).getTime() < 3.5 * 3600_000,
      day,
      time: `${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`,
      whenLabel: labelOf(day),
      slugSource: {
        fixture: { id: f.fixture.id, date: f.fixture.date },
        teams: { home: { name: f.teams.home.name }, away: { name: f.teams.away.name } },
      },
    }
  })
}
