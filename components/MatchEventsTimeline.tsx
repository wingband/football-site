import type { ReactNode } from "react"

type MatchEvent = {
  time: { elapsed: number; extra: number | null }
  team: { name: string; logo: string }
  player: { name: string }
  assist: { name: string | null }
  type: string
  detail: string
}

// API-Football의 골 detail 값을 한국어로 변환
function goalDetailLabel(detail: string): string | null {
  if (detail === "Penalty") return "페널티"
  if (detail === "Own Goal") return "자책골"
  if (detail === "Missed Penalty") return "페널티 실축"
  return null
}

// 분 표시 원형 배지 (추가시간은 작은 +N 뱃지로)
function MinuteBadge({ elapsed, extra }: { elapsed: number; extra: number | null }) {
  return (
    <div className="relative shrink-0">
      <div className="w-11 h-11 rounded-full bg-turf-line/50 flex items-center justify-center font-data text-sm text-floodlight/90">
        {elapsed}&apos;
      </div>
      {extra ? (
        <div className="absolute -bottom-1 -right-1 px-1 py-px rounded-full bg-turf-line text-[9px] font-data text-floodlight/70">
          +{extra}
        </div>
      ) : null}
    </div>
  )
}

// 옐로/레드 카드 아이콘
function CardIcon({ detail }: { detail: string }) {
  const color = detail === "Red Card" ? "bg-live-red" : "bg-yellow-400"
  return <span className={`inline-block w-2.5 h-3.5 rounded-[2px] ${color} shrink-0`} />
}

// 교체 화살표 아이콘 (초록 위, 주황 아래)
function SubIcon() {
  return (
    <span className="inline-flex flex-col items-center justify-center w-4 shrink-0 leading-none">
      <span className="text-green-400 text-[10px]">←</span>
      <span className="text-orange-400 text-[10px]">→</span>
    </span>
  )
}

// 이벤트 한 건의 내용 (아이콘 + 텍스트). isHome이면 우측 정렬(중앙축 쪽으로)
function EventContent({
  ev,
  isHome,
  score,
}: {
  ev: MatchEvent
  isHome: boolean
  score: { home: number; away: number } | null
}) {
  const align = isHome ? "items-end text-right" : "items-start text-left"
  const rowDir = isHome ? "flex-row-reverse" : "flex-row"

  if (ev.type === "subst") {
    return (
      <div className={`flex ${rowDir} items-center gap-2`}>
        <SubIcon />
        <div className={`flex flex-col ${align} leading-tight`}>
          <span className="text-sm text-green-400">{ev.player.name}</span>
          <span className="text-xs text-orange-400/90">{ev.assist.name}</span>
        </div>
      </div>
    )
  }

  if (ev.type === "Goal") {
    const detailLabel = goalDetailLabel(ev.detail)
    return (
      <div className={`flex ${rowDir} items-center gap-2`}>
        <span className="text-base shrink-0">⚽</span>
        <div className={`flex flex-col ${align} leading-tight`}>
          <span className="text-sm text-floodlight">
            {ev.player.name}{" "}
            {score && (
              <span className="font-data text-floodlight/60">
                (<span className={isHome ? "text-green-400" : ""}>{score.home}</span>
                {" - "}
                <span className={!isHome ? "text-green-400" : ""}>{score.away}</span>)
              </span>
            )}
          </span>
          {ev.assist.name ? (
            <span className="text-xs text-floodlight/40">{ev.assist.name}의 어시스트</span>
          ) : detailLabel ? (
            <span className="text-xs text-floodlight/40">{detailLabel}</span>
          ) : null}
        </div>
      </div>
    )
  }

  if (ev.type === "Card") {
    return (
      <div className={`flex ${rowDir} items-center gap-2`}>
        <CardIcon detail={ev.detail} />
        <span className="text-sm text-floodlight/80">{ev.player.name}</span>
      </div>
    )
  }

  // VAR 등 기타 이벤트
  return (
    <div className={`flex flex-col ${align} leading-tight`}>
      <span className="text-sm text-floodlight/80">{ev.player.name}</span>
      <span className="text-xs text-floodlight/40">{ev.detail}</span>
    </div>
  )
}

// 중앙 정렬 구분선 (HT / FT / +N분 추가됨)
function CenterDivider({ label, withLine = true }: { label: string; withLine?: boolean }) {
  if (!withLine) {
    return <p className="text-center text-xs text-floodlight/50 py-1">{label}</p>
  }
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-turf-line/60" />
      <span className="text-xs font-medium text-floodlight/60 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-turf-line/60" />
    </div>
  )
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

  // 전/후반 추가시간(이벤트에 기록된 최대 extra 값으로 추정)
  const firstHalfExtra = Math.max(
    0,
    ...sorted.filter((ev) => ev.time.elapsed === 45 && ev.time.extra).map((ev) => ev.time.extra ?? 0)
  )
  const secondHalfExtra = Math.max(
    0,
    ...sorted.filter((ev) => ev.time.elapsed === 90 && ev.time.extra).map((ev) => ev.time.extra ?? 0)
  )

  let runningHome = 0
  let runningAway = 0
  let htInserted = false
  let firstHalfExtraShown = false
  let secondHalfExtraShown = false

  const rows: ReactNode[] = []

  sorted.forEach((ev, idx) => {
    // 전반 추가시간 표시 (45+N 이벤트가 처음 나오기 직전)
    if (!firstHalfExtraShown && firstHalfExtra > 0 && ev.time.elapsed === 45 && ev.time.extra) {
      rows.push(<CenterDivider key="fh-extra" label={`+${firstHalfExtra}분 추가됨`} withLine={false} />)
      firstHalfExtraShown = true
    }

    // HT 구분선 (후반 첫 이벤트 직전)
    if (!htInserted && ev.time.elapsed > 45) {
      rows.push(
        <CenterDivider key="ht" label={`HT ${homeGoalsHT ?? "-"} - ${awayGoalsHT ?? "-"}`} />
      )
      htInserted = true
    }

    // 후반 추가시간 표시 (90+N 이벤트 직전)
    if (!secondHalfExtraShown && secondHalfExtra > 0 && ev.time.elapsed === 90 && ev.time.extra) {
      rows.push(<CenterDivider key="sh-extra" label={`+${secondHalfExtra}분 추가됨`} withLine={false} />)
      secondHalfExtraShown = true
    }

    const isHome = ev.team.name === homeTeamName
    let score: { home: number; away: number } | null = null

    if (ev.type === "Goal" && ev.detail !== "Missed Penalty") {
      // 자책골은 상대팀 득점으로 계산
      const scoredForHome = ev.detail === "Own Goal" ? !isHome : isHome
      if (scoredForHome) runningHome += 1
      else runningAway += 1
      score = { home: runningHome, away: runningAway }
    }

    rows.push(
      <div key={idx} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex justify-end min-w-0">
          {isHome && <EventContent ev={ev} isHome={true} score={score} />}
        </div>
        <MinuteBadge elapsed={ev.time.elapsed} extra={ev.time.extra} />
        <div className="flex justify-start min-w-0">
          {!isHome && <EventContent ev={ev} isHome={false} score={score} />}
        </div>
      </div>
    )
  })

  // 후반에 이벤트가 하나도 없었으면 HT 구분선이 안 들어갔을 수 있음
  if (!htInserted && isFinished) {
    rows.push(<CenterDivider key="ht-late" label={`HT ${homeGoalsHT ?? "-"} - ${awayGoalsHT ?? "-"}`} />)
  }

  if (isFinished) {
    rows.push(
      <CenterDivider key="ft" label={`FT ${homeGoalsFinal ?? "-"} - ${awayGoalsFinal ?? "-"}`} />
    )
  }

  return <div className="space-y-4">{rows}</div>
}
