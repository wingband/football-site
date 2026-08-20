import type { ReactNode } from "react"

type MatchEvent = {
  time: { elapsed: number; extra: number | null }
  team: { name: string; logo: string }
  player: { name: string }
  assist: { name: string | null }
  type: string
  detail: string
}

export default function MatchEventsTimeline({
  events,
  homeTeamName,
  homeGoalsFinal,
  awayGoalsFinal,
  homeGoalsHT,
  awayGoalsHT,
  isFinished,
}: {
  events: MatchEvent[]
  homeTeamName: string
  homeGoalsFinal: number | null
  awayGoalsFinal: number | null
  homeGoalsHT: number | null
  awayGoalsHT: number | null
  isFinished: boolean
}) {
  if (events.length === 0) {
    return <p className="text-floodlight/40 text-sm py-2">타임라인 정보가 없습니다.</p>
  }

  const sorted = [...events].sort((a, b) => {
    const aTime = a.time.elapsed * 100 + (a.time.extra ?? 0)
    const bTime = b.time.elapsed * 100 + (b.time.extra ?? 0)
    return aTime - bTime
  })

  let runningHome = 0
  let runningAway = 0
  let htInserted = false

  const rows: ReactNode[] = []

  sorted.forEach((ev, idx) => {
    // 전반 종료 후 첫 후반 이벤트 앞에 HT 구분선 삽입
    if (!htInserted && ev.time.elapsed > 45) {
      rows.push(
        <div key="ht-divider" className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-turf-line/60" />
          <span className="text-xs font-medium text-floodlight/50 shrink-0">
            HT {homeGoalsHT ?? "-"} - {awayGoalsHT ?? "-"}
          </span>
          <div className="flex-1 h-px bg-turf-line/60" />
        </div>
      )
      htInserted = true
    }

    if (ev.type === "Goal") {
      if (ev.team.name === homeTeamName) runningHome += 1
      else runningAway += 1
    }

    rows.push(
      <div key={idx} className="flex items-center gap-3 text-sm">
        <span className="font-data text-floodlight/40 w-10 shrink-0 text-xs">
          {ev.time.elapsed}
          {ev.time.extra ? `+${ev.time.extra}` : ""}&apos;
        </span>
        <span>
          {ev.type === "Goal" && "⚽"}
          {ev.type === "Card" && ev.detail === "Yellow Card" && "🟨"}
          {ev.type === "Card" && ev.detail === "Red Card" && "🟥"}
          {ev.type === "subst" && "🔄"}
        </span>
        <img src={ev.team.logo} alt="" className="w-4 h-4" />
        <div className="text-floodlight/80 min-w-0">
          {ev.type === "subst" ? (
            <div className="leading-tight">
              <p className="text-green-400">{ev.player.name}</p>
              <p className="text-orange-400/80 text-xs">{ev.assist.name}</p>
            </div>
          ) : ev.type === "Goal" ? (
            <div className="leading-tight">
              <p>
                {ev.player.name}{" "}
                <span className="text-floodlight/40">
                  ({runningHome} - {runningAway})
                </span>
              </p>
              {ev.assist.name && (
                <p className="text-xs text-floodlight/40">{ev.assist.name}의 어시스트</p>
              )}
            </div>
          ) : (
            <span>{ev.player.name}</span>
          )}
        </div>
      </div>
    )
  })

  if (isFinished) {
    rows.push(
      <div key="ft-divider" className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-turf-line/60" />
        <span className="text-xs font-medium text-floodlight/50 shrink-0">
          FT {homeGoalsFinal ?? "-"} - {awayGoalsFinal ?? "-"}
        </span>
        <div className="flex-1 h-px bg-turf-line/60" />
      </div>
    )
  }

  return <div className="space-y-4">{rows}</div>
}
