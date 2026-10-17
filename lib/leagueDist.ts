import { neon } from "@neondatabase/serverless"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import type { PlayerSeasonStat } from "@/lib/playerData"

// 리그 내 비교 (2026-10-17). 선수 페이지에서 "같은 리그 같은 포지션 선수 대비 상위 몇 %"를 보여주기 위해,
// 리그별 전체 선수 시즌 기록을 주 1회 받아 포지션별 90분당 수치의 분포(정렬된 배열)만 저장한다.
// - API 비용: 리그당 /players 페이지 25~40콜, 주 1회. 선수 페이지를 열 때는 API를 부르지 않고 이 표만 읽는다.
// - 저장량: 리그·시즌·포지션당 숫자 배열 10여 개(수십 KB). api_cache와 달리 매일 지워지지 않는 전용 표.

export const DIST_LEAGUES: { id: number; name: string; country: string }[] = [
  { id: 39, name: "프리미어리그", country: "England" },
  { id: 140, name: "라리가", country: "Spain" },
  { id: 78, name: "분데스리가", country: "Germany" },
  { id: 135, name: "세리에A", country: "Italy" },
  { id: 61, name: "리그1", country: "France" },
  { id: 40, name: "챔피언십", country: "England" },
  { id: 253, name: "MLS", country: "USA" },
  { id: 144, name: "벨기에 프로리그", country: "Belgium" },
]

// 저장된 분포가 며칠이나 됐는지 (크론이 오래된 리그만 다시 받기 위해)
export async function getDistAges(): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!process.env.DATABASE_URL) return out
  try {
    await ensureTable()
    const rows = await getSql()`SELECT league_id, season, EXTRACT(EPOCH FROM (now() - updated_at)) / 86400 AS days FROM league_stat_dist`
    for (const r of rows) out.set(`${r.league_id}:${r.season}`, Number(r.days))
  } catch {
    // 표가 없으면 전부 새로 만든다
  }
  return out
}

export const MIN_MINUTES = 270 // 3경기 분량 미만은 표본에서 제외 (90분당 수치가 심하게 튄다)
const MAX_PAGES = 60

export type Position = "Goalkeeper" | "Defender" | "Midfielder" | "Attacker"
export const METRIC_KEYS = [
  "goals", "assists", "shots", "shotsOn", "keyPasses", "passes", "passAccuracy",
  "dribbles", "duelsWon", "duelsPct", "tackles", "interceptions", "blocks", "defActions", "foulsDrawn", "rating",
  "saves", "conceded",
] as const
export type MetricKey = (typeof METRIC_KEYS)[number]
export type Metrics = Record<MetricKey, number | null>

// 포지션별: 지표 → 오름차순 정렬된 값 배열. n = 표본 선수 수
export type LeagueDist = {
  leagueId: number
  season: number
  updatedAt: string
  positions: Partial<Record<Position, { n: number; values: Partial<Record<MetricKey, number[]>> }>>
}

const per90 = (v: number | null | undefined, minutes: number) => (v == null ? null : (v * 90) / minutes)

// 시즌 기록 한 건 → 비교용 지표 (90분당 또는 비율)
export function metricsOf(s: PlayerSeasonStat): Metrics | null {
  const m = s.games.minutes ?? 0
  if (m <= 0) return null
  const pct = (a: number | null, b: number | null) => (a != null && b != null && b > 0 ? (a / b) * 100 : null)
  return {
    goals: per90(s.goals.total, m),
    assists: per90(s.goals.assists, m),
    shots: per90(s.shots.total, m),
    shotsOn: per90(s.shots.on, m),
    keyPasses: per90(s.passes.key, m),
    passes: per90(s.passes.total, m),
    passAccuracy: s.passes.accuracy,
    dribbles: per90(s.dribbles.success, m),
    duelsWon: per90(s.duels.won, m),
    duelsPct: pct(s.duels.won, s.duels.total),
    tackles: per90(s.tackles.total, m),
    interceptions: per90(s.tackles.interceptions, m),
    blocks: per90(s.tackles.blocks, m),
    defActions: per90((s.tackles.total ?? 0) + (s.tackles.interceptions ?? 0) + (s.tackles.blocks ?? 0), m),
    foulsDrawn: per90(s.fouls.drawn, m),
    rating: s.games.rating ? Number(s.games.rating) : null,
    saves: per90(s.goals.saves, m),
    conceded: per90(s.goals.conceded, m),
  }
}

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null
function ensureTable() {
  if (!tableReady) {
    tableReady = getSql()`
      CREATE TABLE IF NOT EXISTS league_stat_dist (
        league_id INTEGER NOT NULL,
        season INTEGER NOT NULL,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (league_id, season)
      )
    `.catch((e: unknown) => {
      tableReady = null
      throw e
    })
  }
  return tableReady
}

type RawPlayer = { player: { id: number }; statistics: PlayerSeasonStat[] }

// 리그 전체 선수 기록을 페이지로 받아 분포를 만들고 저장한다. 반환: 표본 수와 쓴 API 콜 수.
export async function buildLeagueDist(leagueId: number, season: number): Promise<{ players: number; calls: number }> {
  const buckets: Record<Position, Metrics[]> = { Goalkeeper: [], Defender: [], Midfielder: [], Attacker: [] }
  let calls = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = (await fetchApiFootball(`/players?league=${leagueId}&season=${season}&page=${page}`, { revalidate: 0 })) as RawPlayer[]
    calls++
    if (!Array.isArray(res) || res.length === 0) break
    for (const p of res) {
      // 한 선수가 시즌 중 팀을 옮기면 같은 리그 항목이 둘일 수 있다 → 분 수를 합친 뒤 가장 많이 뛴 팀의 포지션을 쓴다
      const inLeague = (p.statistics ?? []).filter((s) => s?.league?.id === leagueId && (s.games?.minutes ?? 0) > 0)
      if (inLeague.length === 0) continue
      const merged = mergeStats(inLeague)
      if ((merged.games.minutes ?? 0) < MIN_MINUTES) continue
      const pos = merged.games.position as Position
      if (!(pos in buckets)) continue
      const mt = metricsOf(merged)
      if (mt) buckets[pos].push(mt)
    }
    if (res.length < 20) break // 마지막 페이지
  }

  const positions: LeagueDist["positions"] = {}
  let total = 0
  for (const pos of Object.keys(buckets) as Position[]) {
    const list = buckets[pos]
    if (list.length < 5) continue
    total += list.length
    const values: Partial<Record<MetricKey, number[]>> = {}
    for (const k of METRIC_KEYS) {
      const arr = list.map((m) => m[k]).filter((v): v is number => v != null && Number.isFinite(v)).sort((a, b) => a - b)
      if (arr.length >= 5) values[k] = arr.map((v) => Math.round(v * 1000) / 1000)
    }
    positions[pos] = { n: list.length, values }
  }

  const data: LeagueDist = { leagueId, season, updatedAt: new Date().toISOString(), positions }
  await ensureTable()
  await getSql()`
    INSERT INTO league_stat_dist (league_id, season, data, updated_at)
    VALUES (${leagueId}, ${season}, ${JSON.stringify(data)}::jsonb, now())
    ON CONFLICT (league_id, season) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `
  distMem.delete(`${leagueId}:${season}`)
  return { players: total, calls }
}

function mergeStats(list: PlayerSeasonStat[]): PlayerSeasonStat {
  if (list.length === 1) return list[0]
  const main = [...list].sort((a, b) => (b.games.minutes ?? 0) - (a.games.minutes ?? 0))[0]
  const sum = (f: (s: PlayerSeasonStat) => number | null) => {
    const vals = list.map(f).filter((v): v is number => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null
  }
  const wAcc = (() => {
    const pairs = list.map((s) => [s.passes.accuracy, s.passes.total] as const).filter(([a, t]) => a != null && t != null && t > 0) as [number, number][]
    const tot = pairs.reduce((a, [, t]) => a + t, 0)
    return tot > 0 ? pairs.reduce((a, [acc, t]) => a + acc * t, 0) / tot : main.passes.accuracy
  })()
  return {
    ...main,
    games: { ...main.games, minutes: sum((s) => s.games.minutes), rating: main.games.rating },
    goals: { total: sum((s) => s.goals.total), assists: sum((s) => s.goals.assists), conceded: sum((s) => s.goals.conceded), saves: sum((s) => s.goals.saves) },
    shots: { total: sum((s) => s.shots.total), on: sum((s) => s.shots.on) },
    passes: { total: sum((s) => s.passes.total), key: sum((s) => s.passes.key), accuracy: wAcc },
    tackles: { total: sum((s) => s.tackles.total), blocks: sum((s) => s.tackles.blocks), interceptions: sum((s) => s.tackles.interceptions) },
    duels: { total: sum((s) => s.duels.total), won: sum((s) => s.duels.won) },
    dribbles: { attempts: sum((s) => s.dribbles.attempts), success: sum((s) => s.dribbles.success), past: sum((s) => s.dribbles.past) },
    fouls: { drawn: sum((s) => s.fouls.drawn), committed: sum((s) => s.fouls.committed) },
  }
}

const distMem = new Map<string, { at: number; data: LeagueDist | null }>()
const DIST_MEM_MS = 10 * 60_000

export async function getLeagueDist(leagueId: number, season: number): Promise<LeagueDist | null> {
  if (!process.env.DATABASE_URL) return null
  const key = `${leagueId}:${season}`
  const hit = distMem.get(key)
  if (hit && Date.now() - hit.at < DIST_MEM_MS) return hit.data
  try {
    await ensureTable()
    const rows = await getSql()`SELECT data FROM league_stat_dist WHERE league_id = ${leagueId} AND season = ${season}`
    const data = (rows[0]?.data as LeagueDist | undefined) ?? null
    distMem.set(key, { at: Date.now(), data })
    return data
  } catch (err) {
    console.error("league_stat_dist 조회 실패:", err instanceof Error ? err.message : err)
    return hit?.data ?? null
  }
}

// 값이 분포에서 몇 번째 백분위인지 (0~100, 높을수록 상위). 같은 값은 절반만 세어 중앙으로 보낸다.
export function percentileOf(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 50
  let below = 0
  let equal = 0
  for (const v of sorted) {
    if (v < value) below++
    else if (v === value) equal++
    else break
  }
  return Math.round(((below + equal / 2) / sorted.length) * 100)
}
