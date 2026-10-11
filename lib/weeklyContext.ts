import { apiFetch } from "@/lib/matchApi"
import { getCachedPlayerStat } from "@/lib/playerStatCache"
import { koTeam, type PlayerWeek, type WeeklyMatch } from "@/lib/koreanWeekly"
import { goalTimeline, nameHintsOf } from "@/lib/goalTimeline"
import { koPlayerNames } from "@/lib/playerNameKo"

// 주간 해외파 칼럼 초안에 넣을 "추가 재료" (2026-10-11).
// 출전 시간·평점만으로는 글이 빈약해서, 실제 데이터로 확인되는 것만 더 모은다:
//   - 경기 득점 흐름(몇 분에 누가 넣었는지)과 해외파 선수의 골/도움/카드 시간
//   - 시즌 누적 기록(DB 캐시된 값만 사용 — 추가 API 호출 없음)
// 모두 DB 캐시(apiFetch)를 거친다. 실패하면 해당 재료만 빠지고 초안은 그대로 만든다.

type RawEvent = {
  time: { elapsed: number | null; extra: number | null }
  team: { id: number; name: string }
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type: string
  detail: string
}

const NATIONAL_KW = ["World Cup", "AFC", "Asian", "Olympic", "Friendlies", "Qualification", "Nations", "Copa", "EURO"]

function minuteText(t: RawEvent["time"]) {
  if (t.elapsed == null) return ""
  return t.extra ? `${t.elapsed}+${t.extra}분` : `${t.elapsed}분`
}

async function getEvents(fixtureId: number): Promise<RawEvent[]> {
  try {
    const data = await apiFetch(`/fixtures/events?fixture=${fixtureId}`, 86400)
    return Array.isArray(data) ? (data as RawEvent[]) : []
  } catch {
    return []
  }
}

export type MatchContext = {
  goalFlow: string // "23분 골 케인(바이에른 뮌헨) → 바이에른 뮌헨 1:0 아우크스부르크 / …" 또는 ""
  myEvents: string // "54분 골, 81분 도움, 30분 경고" 또는 ""
}

export type SeasonLine = string // "이번 시즌 분데스리가 7경기 2골 1도움, 평균 평점 7.0" 또는 ""

// 시즌 누적 기록 한 줄 (player_stat_cache DB 값만 사용 — 추가 API 호출 없음)
export async function seasonLineFor(playerId: number): Promise<SeasonLine> {
  try {
    const cached = await getCachedPlayerStat(playerId)
    const club = (cached?.statistics ?? []).filter((s) => !NATIONAL_KW.some((kw) => (s.league?.name ?? "").includes(kw)))
    if (!club.length) return ""
    const best = club.reduce((a, b) => ((b.games?.minutes ?? 0) > (a.games?.minutes ?? 0) ? b : a))
    const apps = best.games?.appearences ?? 0
    if (!apps) return ""
    const rating = best.games?.rating ? Number(best.games.rating) : null
    return (
      `이번 시즌 ${best.league.name} ${apps}경기 ${best.goals?.total ?? 0}골 ${best.goals?.assists ?? 0}도움` +
      (rating && Number.isFinite(rating) ? `, 평균 평점 ${rating.toFixed(1)}` : "") +
      " (사이트 저장 기준, 최근 경기가 아직 반영 안 됐을 수 있음)"
    )
  } catch {
    return ""
  }
}

export async function buildWeeklyContext(weeks: PlayerWeek[]) {
  // 해외파가 실제로 뛴 경기만 이벤트를 받아온다
  const fixtureIds = new Set<number>()
  for (const w of weeks) for (const m of w.recent) if (m.played) fixtureIds.add(m.fixtureId)

  const events = new Map<number, RawEvent[]>()
  await Promise.all([...fixtureIds].map(async (id) => events.set(id, await getEvents(id))))
  // 상대·동료 선수의 영문 이름은 한글로 (DB 저장, 다음 주에도 같은 표기)
  const ko = await koPlayerNames([...events.values()].flatMap(nameHintsOf))

  const matchCtx = (playerId: number, m: WeeklyMatch): MatchContext => {
    const evs = events.get(m.fixtureId) ?? []
    const goalFlow = goalTimeline(evs, { name: m.homeName }, { name: m.awayName }, { home: m.homeScore, away: m.awayScore }, ko).join(" / ")
    const mine: string[] = []
    for (const e of evs) {
      if (e.type === "Goal" && e.detail !== "Missed Penalty" && e.detail !== "Own Goal" && e.player.id === playerId) mine.push(`${minuteText(e.time)} 골${e.detail === "Penalty" ? "(PK)" : ""}`)
      if (e.type === "Goal" && e.assist.id === playerId) mine.push(`${minuteText(e.time)} 도움`)
      if (e.type === "Card" && e.player.id === playerId) mine.push(`${minuteText(e.time)} ${e.detail.includes("Red") ? "퇴장" : "경고"}`)
    }
    return { goalFlow, myEvents: mine.join(", ") }
  }

  const seasonLines = new Map<number, SeasonLine>()
  await Promise.all(
    weeks.map(async (w) => {
      const line = await seasonLineFor(w.player.id)
      if (line) seasonLines.set(w.player.id, line)
    })
  )

  return { matchCtx, seasonLines }
}

function detailText(m: WeeklyMatch): string {
  const d = m.detail
  if (!d) return ""
  const parts: string[] = []
  if (d.position) parts.push(`포지션 ${({ G: "골키퍼", D: "수비수", M: "미드필더", F: "공격수" } as Record<string, string>)[d.position] ?? d.position}`)
  if (d.captain) parts.push("주장 완장")
  if (d.shots) parts.push(`슈팅 ${d.shots}회(유효 ${d.shotsOn ?? 0})`)
  if (d.passes) parts.push(`패스 ${d.passes}회`)
  if (d.keyPasses) parts.push(`키패스 ${d.keyPasses}회`)
  if (d.dribbleAttempts) parts.push(`드리블 ${d.dribbleAttempts}회 시도 ${d.dribbleSuccess ?? 0}회 성공`)
  if (d.tackles) parts.push(`태클 ${d.tackles}회`)
  if (d.interceptions) parts.push(`가로채기 ${d.interceptions}회`)
  if (d.blocks) parts.push(`블록 ${d.blocks}회`)
  if (d.duels) parts.push(`경합 ${d.duels}회 중 ${d.duelsWon ?? 0}회 승리`)
  if (d.foulsDrawn) parts.push(`파울 유도 ${d.foulsDrawn}회`)
  if (d.foulsCommitted) parts.push(`파울 ${d.foulsCommitted}회`)
  if (d.saves) parts.push(`선방 ${d.saves}회`)
  return parts.join(", ")
}

export { detailText }

// "숫자로 보는 이번 주" — AI가 아니라 코드가 직접 계산해서 넣는 항목 (틀릴 일이 없게)
export function numbersSection(weeks: PlayerWeek[]): string {
  type Item = { name: string; opp: string; v: number }
  const all: { name: string; m: WeeklyMatch }[] = []
  for (const w of weeks) for (const m of w.recent) if (m.played) all.push({ name: w.player.name, m })
  if (!all.length) return ""

  const top = (pick: (m: WeeklyMatch) => number | null | undefined): Item | null => {
    let best: Item | null = null
    for (const { name, m } of all) {
      const v = pick(m) ?? 0
      if (v > 0 && (!best || v > best.v)) best = { name, opp: koTeam(m.opponentName), v }
    }
    return best
  }

  const totalMinutes = new Map<string, number>()
  for (const { name, m } of all) totalMinutes.set(name, (totalMinutes.get(name) ?? 0) + (m.minutes ?? 0))
  const iron = [...totalMinutes.entries()].sort((a, b) => b[1] - a[1])[0]

  const lines: string[] = []
  if (iron) lines.push(`- **최다 출전 시간**: ${iron[0]} ${iron[1]}분`)
  const rows: [string, Item | null, string][] = [
    ["최다 슈팅", top((m) => m.detail?.shots), "회"],
    ["최다 키패스", top((m) => m.detail?.keyPasses), "회"],
    ["최다 드리블 성공", top((m) => m.detail?.dribbleSuccess), "회"],
    ["최다 수비 기여(태클+가로채기+블록)", top((m) => (m.detail ? (m.detail.tackles ?? 0) + (m.detail.interceptions ?? 0) + (m.detail.blocks ?? 0) : 0)), "회"],
    ["최다 경합 승리", top((m) => m.detail?.duelsWon), "회"],
  ]
  for (const [label, it, unit] of rows) if (it) lines.push(`- **${label}**: ${it.name} ${it.v}${unit} (vs ${it.opp})`)
  const played = new Set(all.map((a) => a.name)).size
  const pts = all.reduce((s, a) => s + a.m.goals + a.m.assists, 0)
  lines.push(`- **출전 선수 / 공격포인트 합계**: ${played}명 출전, 공격포인트 ${pts}개`)
  if (lines.length < 3) return ""
  return `## 숫자로 보는 이번 주\n${lines.join("\n")}\n\n*경기 데이터 제공처 기록 기준, GoalLine 자체 집계*`
}
