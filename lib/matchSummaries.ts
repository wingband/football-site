// 이벤트/스탯 데이터를 GPT 프롬프트용 텍스트로 가공하는 로직을 한 곳에 모아둔다.
//
// 원래 이 로직은 app/api/cron/generate-articles/route.ts 안에만 있었고,
// 경기 상세 페이지의 3문장 폴백 리뷰(lib/generateStory.ts)는 이 데이터를 전혀
// 받지 못한 채 팀명·최종 스코어만으로 GPT가 서사를 "지어내는" 구조였다.
// 그 결과 실제로는 한 번도 앞선 적 없는 팀에게 "역전골"이라는 존재하지 않는
// 장면을 붙이는 사고가 발생했다 (2026-09-20, 토트넘 2-3 아스톤 빌라 사건).
//
// lib/teamData.ts가 fetchApiFootball 공용 함수 없이 3곳에 같은 버그를 심었던 것과
// 똑같은 패턴이라, 계산 로직 자체를 이 파일 하나로 통합해서 크론과 페이지 양쪽이
// 정확히 같은 값을 쓰게 만든다.

export type RawMatchEvent = {
  time: { elapsed: number }
  type: string
  team: { name: string }
  player: { name: string }
  assist: { name: string | null }
}

export type RawTeamStats = {
  statistics: { type: string; value: unknown }[]
}

export type MatchEventSummaries = {
  eventsSummary: string
  goalsSummary: string
  playerTags: string[]
}

function formatHalfMinute(elapsed: number): string {
  return elapsed <= 45 ? `전반 ${elapsed}분` : `후반 ${elapsed - 45}분`
}

function determineLeader(homeGoals: number, awayGoals: number): "home" | "away" | "tie" {
  return homeGoals === awayGoals ? "tie" : homeGoals > awayGoals ? "home" : "away"
}

export function buildStatsSummary(stats: RawTeamStats[] | undefined): string {
  if (!stats || stats.length !== 2) return "통계 데이터 없음"
  return stats[0].statistics
    .map((s, i) => `${s.type}: ${s.value ?? 0} vs ${stats[1].statistics[i]?.value ?? 0}`)
    .join(", ")
}

export function buildMatchEventSummaries(
  events: RawMatchEvent[] | undefined,
  homeTeamName: string,
  awayTeamName: string
): MatchEventSummaries {
  if (!events?.length) {
    return {
      eventsSummary: "이벤트 데이터 없음",
      goalsSummary: "골 데이터 없음",
      playerTags: [],
    }
  }

  let homeGoals = 0
  let awayGoals = 0
  let homeFirstHalfGoals = 0
  let awayFirstHalfGoals = 0
  let homeSecondHalfGoals = 0
  let awaySecondHalfGoals = 0
  const goalLines: string[] = []

  const eventsSummary = events
    .map((e) => {
      let scoreLabel = ""
      if (e.type === "Goal") {
        const isHome = e.team.name === homeTeamName
        const scoringTeamName = isHome ? homeTeamName : awayTeamName
        const leaderBefore = determineLeader(homeGoals, awayGoals)
        const isFirstGoalOfMatch = goalLines.length === 0

        if (isHome) homeGoals++
        else if (e.team.name === awayTeamName) awayGoals++

        if (e.time.elapsed <= 45) {
          if (isHome) homeFirstHalfGoals++
          else awayFirstHalfGoals++
        } else {
          if (isHome) homeSecondHalfGoals++
          else awaySecondHalfGoals++
        }

        const leaderAfter = determineLeader(homeGoals, awayGoals)

        // 이 골이 경기 흐름을 실제로 어떻게 바꿨는지 명시적으로 계산해서 붙인다.
        // "역전골"이라는 단어는 오직 "뒤지고 있던 팀이 앞서게 될 때"에만 붙는다.
        // 동점 상태에서 다시 앞서가는 것, 이미 앞서던 팀이 점수를 더 벌리는 것은
        // 절대 "역전"이 아니므로 서로 다른 표현을 명시적으로 지정해준다.
        let stateTag: string
        if (isFirstGoalOfMatch) {
          stateTag = `선제골 (${scoringTeamName} 리드 시작)`
        } else if (leaderBefore === "tie" && leaderAfter !== "tie") {
          stateTag = `동점 상황에서 ${scoringTeamName}이(가) 다시 앞서감 — 역전 아님`
        } else if (leaderAfter === "tie") {
          stateTag = `동점골`
        } else if (leaderBefore !== "tie" && leaderAfter !== leaderBefore) {
          stateTag = `역전골 (직전까지 뒤지던 ${scoringTeamName}이(가) 앞서게 됨)`
        } else {
          stateTag = `추가골 (${scoringTeamName} 리드 유지, 격차 확대)`
        }

        scoreLabel = ` (스코어 ${homeGoals}-${awayGoals}) [${stateTag}]`
        goalLines.push(
          `${goalLines.length + 1}번째 골 — ${formatHalfMinute(e.time.elapsed)} [${e.team.name}] ${e.player.name}` +
            (e.assist?.name ? ` (도움: ${e.assist.name})` : "") +
            ` → 스코어 ${homeGoals}-${awayGoals} [${stateTag}]`
        )
      }
      return `${formatHalfMinute(e.time.elapsed)}(전체 ${e.time.elapsed}분) [${e.team.name}] ${e.type} - ${e.player.name}${scoreLabel}`
    })
    .join(", ")

  let goalsSummary = goalLines.length ? goalLines.join("\n") : "이 경기에는 골이 없었다"
  goalsSummary +=
    `\n\n[전/후반 팀별 득점 개수 — "전반에 N골" 같은 요약 문장을 쓸 때 이 숫자와 반드시 일치해야 함]\n` +
    `${homeTeamName} 전반 ${homeFirstHalfGoals}골, 후반 ${homeSecondHalfGoals}골\n` +
    `${awayTeamName} 전반 ${awayFirstHalfGoals}골, 후반 ${awaySecondHalfGoals}골`

  const seen = new Set<string>()
  const goalTags: string[] = []
  const cardTags: string[] = []
  for (const e of events) {
    if (e.type === "Goal") {
      if (e.player.name && !seen.has(e.player.name)) {
        seen.add(e.player.name)
        goalTags.push(e.player.name)
      }
      if (e.assist?.name && !seen.has(e.assist.name)) {
        seen.add(e.assist.name)
        goalTags.push(e.assist.name)
      }
    } else if (e.type === "Card") {
      if (e.player.name && !seen.has(e.player.name)) {
        seen.add(e.player.name)
        cardTags.push(e.player.name)
      }
    }
  }
  const playerTags = [...goalTags, ...cardTags].slice(0, 12)

  return { eventsSummary, goalsSummary, playerTags }
}
