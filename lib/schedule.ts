import { getCachedOrFetch } from "@/lib/apiCache"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import { getSeasonYear } from "@/lib/season"
import { koLeague, koTeam } from "@/lib/koreanWeekly"
import { matchLinkHref } from "@/lib/slug"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"

// 일정 달력 (/schedule, 2026-10-12). 리그별·해외파 팀별로 "한 달치"를 한 번에 받아 DB에 캐시한다.
// 지난 달은 결과가 바뀌지 않으니 7일, 이번 달·다음 달은 6시간 캐시.

export const SCHEDULE_LEAGUES = [
  { id: 39, short: "EPL", label: "프리미어리그", country: "England" },
  { id: 140, short: "라리가", label: "라리가", country: "Spain" },
  { id: 78, short: "분데스", label: "분데스리가", country: "Germany" },
  { id: 135, short: "세리에", label: "세리에A", country: "Italy" },
  { id: 61, short: "리그1", label: "리그1", country: "France" },
  { id: 2, short: "UCL", label: "챔피언스리그", country: "World" },
  { id: 3, short: "UEL", label: "유로파리그", country: "World" },
  { id: 292, short: "K리그", label: "K리그1", country: "South Korea" },
] as const

export type ScheduleMatch = {
  id: number
  date: string // ISO
  day: string // 한국 날짜 YYYY-MM-DD
  time: string // 한국 시각 HH:mm
  leagueId: number
  leagueShort: string
  home: string
  away: string
  homeLogo: string
  awayLogo: string
  homeScore: number | null
  awayScore: number | null
  status: "scheduled" | "live" | "finished" | "postponed"
  korean: string[] // 이 경기에 뛸 수 있는 해외파 이름
  href: string
}

type RawFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  league: { id: number; name: string }
  teams: { home: { id: number; name: string; logo: string }; away: { id: number; name: string; logo: string } }
  goals: { home: number | null; away: number | null }
}

const LIVE = new Set(["1H", "2H", "HT", "ET", "BT", "P", "INT", "LIVE"])
const FINISHED = new Set(["FT", "AET", "PEN", "AWD", "WO"])
const POSTPONED = new Set(["PST", "CANC", "ABD", "SUSP"])

// "2026-10" 형식 검증 + 크롤러가 몇 년 전/후 달을 마구 부르지 않도록 오늘 기준 ±2개월만 허용
export function normalizeMonth(input: string | undefined, now = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 3600_000)
  const cur = kst.getUTCFullYear() * 12 + kst.getUTCMonth()
  const fmt = (n: number) => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`
  const m = input?.match(/^(\d{4})-(\d{2})$/)
  if (!m) return fmt(cur)
  const n = Number(m[1]) * 12 + Number(m[2]) - 1
  return fmt(Math.min(cur + 2, Math.max(cur - 2, n)))
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const n = y * 12 + m - 1 + delta
  return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`
}

function kst(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000)
  return {
    day: d.toISOString().slice(0, 10),
    time: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
  }
}

async function fetchMonth(query: string, ttl: number): Promise<RawFixture[]> {
  const path = `/fixtures?${query}`
  try {
    const data = await getCachedOrFetch<RawFixture[]>(path, ttl, async () =>
      (await fetchApiFootball(path, { revalidate: ttl })) as RawFixture[]
    )
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error("일정 달력: 조회 실패", path, err instanceof Error ? err.message : err)
    return []
  }
}

export async function getMonthSchedule(month: string, now = new Date()): Promise<ScheduleMatch[]> {
  const [y, m] = month.split("-").map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  // 한국 시간 기준 달 경계라 UTC로는 전날 밤 경기까지 포함되게 하루 앞에서 시작
  const from = new Date(Date.UTC(y, m - 1, 1) - 86400_000).toISOString().slice(0, 10)
  const to = `${month}-${String(lastDay).padStart(2, "0")}`
  const mid = new Date(Date.UTC(y, m - 1, 15))
  const kstNow = new Date(now.getTime() + 9 * 3600_000)
  const isPast = y * 12 + m < kstNow.getUTCFullYear() * 12 + kstNow.getUTCMonth() + 1
  const ttl = isPast ? 7 * 86400 : 6 * 3600

  const teamSeasons = new Map<number, number>()
  for (const p of KOREAN_PLAYERS_ABROAD) {
    if (!p.teamId) continue
    teamSeasons.set(p.teamId, getSeasonYear(p.league === "MLS" ? "USA" : "Europe", mid))
  }

  const lists = await Promise.all([
    ...SCHEDULE_LEAGUES.map((l) =>
      fetchMonth(`league=${l.id}&season=${getSeasonYear(l.country, mid)}&from=${from}&to=${to}`, ttl)
    ),
    ...[...teamSeasons].map(([teamId, season]) => fetchMonth(`team=${teamId}&season=${season}&from=${from}&to=${to}`, ttl)),
  ])

  const koreanByTeam = new Map<number, string[]>()
  for (const p of KOREAN_PLAYERS_ABROAD) {
    if (!p.teamId) continue
    koreanByTeam.set(p.teamId, [...(koreanByTeam.get(p.teamId) ?? []), p.name])
  }
  const shortOf = new Map<number, string>(SCHEDULE_LEAGUES.map((l) => [l.id, l.short]))

  const seen = new Set<number>()
  const out: ScheduleMatch[] = []
  for (const f of lists.flat()) {
    if (seen.has(f.fixture.id)) continue
    seen.add(f.fixture.id)
    const t = kst(f.fixture.date)
    if (!t.day.startsWith(month)) continue
    if (/friendl/i.test(f.league.name)) continue
    const s = f.fixture.status.short
    out.push({
      id: f.fixture.id,
      date: f.fixture.date,
      day: t.day,
      time: t.time,
      leagueId: f.league.id,
      leagueShort: shortOf.get(f.league.id) ?? koLeague(f.league.name),
      home: koTeam(f.teams.home.name),
      away: koTeam(f.teams.away.name),
      homeLogo: f.teams.home.logo,
      awayLogo: f.teams.away.logo,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      status: LIVE.has(s) ? "live" : FINISHED.has(s) ? "finished" : POSTPONED.has(s) ? "postponed" : "scheduled",
      korean: [...(koreanByTeam.get(f.teams.home.id) ?? []), ...(koreanByTeam.get(f.teams.away.id) ?? [])],
      href: matchLinkHref({
        fixture: { id: f.fixture.id, date: f.fixture.date },
        teams: { home: { name: f.teams.home.name }, away: { name: f.teams.away.name } },
      }),
    })
  }
  out.sort((a, b) => a.date.localeCompare(b.date))
  return out
}
