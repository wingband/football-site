import { koTeam } from "@/lib/koreanWeekly"
import type { KoName } from "@/lib/playerNameKo"

// 득점 순서를 "코드가" 스코어까지 계산해서 만든다 (2026-10-11).
// AI에게 득점 목록만 주면 선제골/동점골/역전골을 거꾸로 쓰거나 도움 선수를 득점자로 쓰는 일이 있었다.
// 각 줄에 그 골 직후 스코어를 붙여서 AI가 흐름을 지어낼 여지를 없앤다.

export type TimelineEvent = {
  time: { elapsed: number | null; extra: number | null }
  team: { id?: number; name: string }
  player: { id?: number | null; name: string | null }
  assist: { id?: number | null; name: string | null }
  type: string
  detail: string
}

const minute = (t: TimelineEvent["time"]) => (t.elapsed == null ? "" : t.extra ? `${t.elapsed}+${t.extra}분` : `${t.elapsed}분`)

export function goalEventsOf(events: TimelineEvent[]) {
  return events.filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty")
}

// 자책골 이벤트의 team이 "득점 인정 팀"인지 "자책한 선수의 팀"인지 확실치 않아서,
// 두 해석 중 최종 스코어와 맞는 쪽을 쓴다. 둘 다 안 맞으면(이벤트 누락) 스코어 없이 순서만.
export function goalTimeline(
  events: TimelineEvent[],
  home: { name: string },
  away: { name: string },
  final: { home: number | null; away: number | null },
  ko: KoName
): string[] {
  const goals = goalEventsOf(events)
  const homeKo = koTeam(home.name)
  const awayKo = koTeam(away.name)

  const run = (ownGoalTeamIsBeneficiary: boolean) => {
    let h = 0
    let a = 0
    const scores: string[] = []
    for (const e of goals) {
      const isHomeTeam = e.team.name === home.name
      const homeScores = e.detail === "Own Goal" ? (ownGoalTeamIsBeneficiary ? isHomeTeam : !isHomeTeam) : isHomeTeam
      if (homeScores) h++
      else a++
      scores.push(`${homeKo} ${h}:${a} ${awayKo}`)
    }
    return { scores, ok: h === final.home && a === final.away }
  }
  const viaA = run(true)
  const viaB = run(false)
  const scores = viaA.ok ? viaA.scores : viaB.ok ? viaB.scores : null

  return goals.map((e, i) => {
    const who =
      e.detail === "Own Goal"
        ? `자책골 ${ko(e.player.name)}`
        : `골 ${ko(e.player.name)}(${koTeam(e.team.name)})${e.detail === "Penalty" ? " PK" : ""}${e.assist.name ? `, 도움 ${ko(e.assist.name)}` : ""}`
    return `${minute(e.time)} ${who}${scores ? ` → ${scores[i]}` : ""}`
  })
}

export function nameHintsOf(events: TimelineEvent[]) {
  return events.flatMap((e) => [
    { name: e.player.name, team: koTeam(e.team.name) },
    { name: e.assist.name, team: koTeam(e.team.name) },
  ])
}
