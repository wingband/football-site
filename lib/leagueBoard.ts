import { getCachedOrFetch } from "@/lib/apiCache"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import { getStandings, type StandingRow } from "@/lib/matchApi"
import { getSeasonYear } from "@/lib/season"
import { koTeam } from "@/lib/koreanWeekly"
import { koPlayerNames } from "@/lib/playerNameKo"

// 메인 화면 "리그 순위" 허브 (2026-10-12): 리그 탭 + 전체 순위표 + 득점·도움 순위.
// 모두 DB 캐시(getCachedOrFetch)를 거쳐서 방문자가 늘어도 API 호출은 리그당 몇 시간에 한 번.

export const BOARD_LEAGUES = [
  { id: 39, label: "프리미어리그", country: "England" },
  { id: 140, label: "라리가", country: "Spain" },
  { id: 78, label: "분데스리가", country: "Germany" },
  { id: 135, label: "세리에A", country: "Italy" },
  { id: 61, label: "리그1", country: "France" },
  { id: 292, label: "K리그1", country: "South Korea" },
] as const

export type BoardTeamRow = {
  rank: number
  teamId: number
  name: string
  logo: string
  played: number
  win: number
  draw: number
  lose: number
  gd: number
  points: number
  zone: "ucl" | "uel" | "conf" | "releg" | null
}

export type BoardPlayerRow = {
  id: number
  name: string
  photo: string
  teamLogo: string
  value: number
}

export type LeagueBoardData = {
  leagueId: number
  table: BoardTeamRow[]
  scorers: BoardPlayerRow[]
  assists: BoardPlayerRow[]
}

type ScorerEntry = {
  player: { id: number; name: string; photo: string }
  statistics: { team: { name: string; logo: string }; goals: { total: number | null; assists: number | null } }[]
}

function zoneOf(desc: string | null | undefined, leagueId?: number, rank?: number): BoardTeamRow["zone"] {
  // K리그1은 33라운드 뒤 상·하위 스플릿으로 갈려서 API가 7~12위를 전부 "Relegation Round"로 준다.
  // 실제 강등권은 11위(승강 PO)·12위(자동 강등)뿐이라 순위로 직접 정한다.
  if (leagueId === 292) return rank !== undefined && rank >= 11 ? "releg" : null
  if (!desc) return null
  const d = desc.toLowerCase()
  if (d.includes("relegation")) return "releg"
  if (d.includes("champions league") || d.includes("afc champions")) return "ucl"
  if (d.includes("conference")) return "conf"
  if (d.includes("europa") || d.includes("afc")) return "uel"
  return null
}

async function topList(kind: "topscorers" | "topassists", leagueId: number, season: number): Promise<ScorerEntry[]> {
  const path = `/players/${kind}?league=${leagueId}&season=${season}`
  try {
    const data = await getCachedOrFetch<ScorerEntry[]>(path, 21600, async () =>
      (await fetchApiFootball(path, { revalidate: 21600 })) as ScorerEntry[]
    )
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error(`리그 허브: ${kind} 실패:`, err instanceof Error ? err.message : err)
    return []
  }
}

export async function getLeagueBoard(leagueId: number): Promise<LeagueBoardData | null> {
  const league = BOARD_LEAGUES.find((l) => l.id === leagueId)
  if (!league) return null
  const season = getSeasonYear(league.country)

  const [standings, scorersRaw, assistsRaw] = await Promise.all([
    getStandings(leagueId, season).catch(() => [] as StandingRow[][]),
    topList("topscorers", leagueId, season),
    topList("topassists", leagueId, season),
  ])

  const scorersTop = scorersRaw.slice(0, 10)
  const assistsTop = assistsRaw.slice(0, 10)
  const ko = await koPlayerNames(
    [...scorersTop, ...assistsTop].map((e) => ({ name: e.player.name, team: e.statistics[0]?.team.name }))
  ).catch(() => (n: string | null | undefined) => n ?? "?")

  const toRow = (e: ScorerEntry, key: "total" | "assists"): BoardPlayerRow => ({
    id: e.player.id,
    name: ko(e.player.name),
    photo: e.player.photo,
    teamLogo: e.statistics[0]?.team.logo ?? "",
    value: e.statistics[0]?.goals[key] ?? 0,
  })

  return {
    leagueId,
    table: (standings[0] ?? []).map((r) => ({
      rank: r.rank,
      teamId: r.team.id,
      name: koTeam(r.team.name),
      logo: r.team.logo,
      played: r.all.played,
      win: r.all.win,
      draw: r.all.draw,
      lose: r.all.lose,
      gd: r.goalsDiff,
      points: r.points,
      zone: zoneOf(r.description, leagueId, r.rank),
    })),
    scorers: scorersTop.map((e) => toRow(e, "total")),
    assists: assistsTop.map((e) => toRow(e, "assists")),
  }
}
