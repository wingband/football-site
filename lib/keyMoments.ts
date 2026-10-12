import { koTeam } from "@/lib/koreanWeekly"
import type { KoName } from "@/lib/playerNameKo"
import { goalEventsOf, type TimelineEvent } from "@/lib/goalTimeline"

// 경기의 "핵심 장면"을 코드가 먼저 뽑아 초안 프롬프트에 넣는다 (2026-10-12).
// 득점 순서만 주면 AI가 경기의 진짜 이야기(퇴장, 페널티킥 실축, VAR 번복, 추가시간 골)를 빼먹고 평범한 기록 나열로 끝난다.
// 사실만(분·선수·팀·그 시점 스코어) 만들고, 해석은 하지 않는다.

const minute = (t: TimelineEvent["time"]) => (t.elapsed == null ? "" : t.extra ? `${t.elapsed}+${t.extra}분` : `${t.elapsed}분`)
const order = (t: TimelineEvent["time"]) => (t.elapsed ?? 0) * 100 + (t.extra ?? 0)

export function keyMoments(events: TimelineEvent[], home: { name: string }, away: { name: string }, ko: KoName): string[] {
  const goals = goalEventsOf(events)
  const homeKo = koTeam(home.name)
  const awayKo = koTeam(away.name)

  // 해당 시점 직전까지의 스코어 (자책골이 섞여 있으면 팀 귀속이 불확실해서 스코어는 생략)
  const scoreBefore = (t: TimelineEvent["time"]) => {
    let h = 0
    let a = 0
    for (const g of goals) {
      if (order(g.time) >= order(t)) continue
      if (g.detail === "Own Goal") return null
      if (g.team.name === home.name) h++
      else a++
    }
    return `${homeKo} ${h}:${a} ${awayKo}`
  }

  const out: { o: number; text: string }[] = []
  for (const e of events) {
    const m = minute(e.time)
    const team = koTeam(e.team.name)
    const who = e.player.name ? ko(e.player.name) : ""
    if (e.type === "Card" && e.detail.includes("Red")) {
      const sc = scoreBefore(e.time)
      out.push({ o: order(e.time), text: `${m} ${team} ${who} 퇴장${sc ? ` (퇴장 직전 스코어 ${sc})` : ""}` })
    } else if (e.type === "Card" && e.detail.includes("Second Yellow")) {
      const sc = scoreBefore(e.time)
      out.push({ o: order(e.time), text: `${m} ${team} ${who} 경고 누적 퇴장${sc ? ` (직전 스코어 ${sc})` : ""}` })
    } else if (e.type === "Goal" && e.detail === "Missed Penalty") {
      out.push({ o: order(e.time), text: `${m} ${team} ${who} 페널티킥 실축` })
    } else if (e.type === "Var") {
      const d = e.detail
      const label = /Goal Disallowed|Goal cancelled/i.test(d)
        ? "득점 취소"
        : /Penalty confirmed/i.test(d)
          ? "페널티킥 판정"
          : /Card upgrade/i.test(d)
            ? "카드 상향(퇴장 판정)"
            : /Card downgrade|Red card cancelled/i.test(d)
              ? "퇴장 번복"
              : /Goal confirmed/i.test(d)
                ? "득점 인정"
                : ""
      if (label) out.push({ o: order(e.time), text: `${m} VAR 확인 — ${team}${who ? ` ${who}` : ""} ${label}` })
    }
  }
  // 추가시간(90분 이후) 골은 따로 표시
  for (const g of goals) {
    if ((g.time.elapsed ?? 0) >= 90) out.push({ o: order(g.time), text: `${minute(g.time)} 추가시간 골 (${koTeam(g.team.name)} ${g.player.name ? ko(g.player.name) : ""})` })
  }
  return out.sort((a, b) => a.o - b.o).map((x) => x.text)
}

// 프롬프트에 붙이는 규칙: 핵심 장면이 있으면 그것을 이야기의 중심에 둔다
export const KEY_MOMENT_RULES = `- 데이터에 "핵심 장면"이 있으면 그것이 이 경기의 가장 중요한 이야기다. 제목과 도입 첫 두 문장 안에 반드시 반영하고(예: 퇴장, 페널티킥 실축, VAR 번복, 추가시간 골), 단순 득점 나열로 시작하지 마라.
- "경기 흐름"에서는 핵심 장면의 분(分)을 득점 순서의 분과 비교해, 그 장면 전후로 경기가 어떻게 바뀌었는지 사실로만 연결해라(예: 퇴장 이후 실점/무실점, 몇 분 뒤 득점). 인과관계를 단정하지 말고 "~한 뒤", "~가 나온 이후"처럼 시간 순서로 써라.
- 핵심 장면이 없는 경기는 득점 순서·결승골 시점·팀 기록 차이 중 데이터상 가장 두드러지는 것을 중심에 둬라.`
