import { apiFetch } from "@/lib/matchApi"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { formatKickoffKst, koLeague, koTeam, type WeeklyMatch } from "@/lib/koreanWeekly"
import { detailText, seasonLineFor } from "@/lib/weeklyContext"
import { getColumnBySlug, saveColumn } from "@/lib/columns"
import { getMatchPhase } from "@/lib/matchStatus"
import { renderPlayerCard } from "@/lib/weeklyCard"
import { goalTimeline, nameHintsOf } from "@/lib/goalTimeline"
import { koPlayerNames } from "@/lib/playerNameKo"
import { withJosa } from "@/lib/josa"
import { COMMON_RULES, DRAFT_KINDS, callOpenAI, shapeDraftText, uploadPng, cleanTags } from "@/lib/draftEngine"

// 경기 직후 해외파 선수 리포트 초안 (3시간마다 크론, 2026-10-11).
// "이강인 평점", "김민재 경기 결과"는 경기 직후 몇 시간 동안 검색이 몰리므로 빨리 만드는 게 핵심.
//  - 팀별 최근 경기는 30분 캐시로 따로 조회해(주간 데이터의 3시간 캐시보다 신선하게) 늦어도 3~4시간 안에 잡는다
//  - 30분 이상 뛰었거나 공격포인트가 있는 경우만 만든다 (짧은 교체 출전은 글이 빈약해져 품질 정책상 오히려 손해)
//  - 선수·경기 조합마다 주소를 고정(slug)해 중복 생성하지 않는다

const MARK = DRAFT_KINDS.report.mark
const LOOKBACK_MS = 48 * 3600_000
const MAX_PER_RUN = 6
const MIN_MINUTES = 30

type RawFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  league: { id: number; name: string; round?: string }
  teams: { home: { id: number; name: string; winner: boolean | null }; away: { id: number; name: string; winner: boolean | null } }
  goals: { home: number | null; away: number | null }
}
type RawStat = {
  games?: { minutes: number | null; rating: string | null; substitute?: boolean | null; position?: string | null; captain?: boolean | null }
  goals?: { total: number | null; assists: number | null; saves?: number | null; conceded?: number | null }
  cards?: { yellow: number | null; red: number | null }
  shots?: { total: number | null; on: number | null }
  passes?: { total: number | null; key: number | null }
  dribbles?: { attempts: number | null; success: number | null }
  tackles?: { total: number | null; interceptions: number | null; blocks: number | null }
  duels?: { total: number | null; won: number | null }
  fouls?: { drawn: number | null; committed: number | null }
}
type RawFixturePlayers = { team: { id: number }; players: { player: { id: number }; statistics: RawStat[] }[] }[]
type RawTeamStats = { team: { id: number }; statistics: { type: string; value: number | string | null }[] }[]
type RawEvent = {
  time: { elapsed: number | null; extra: number | null }
  team: { id: number; name: string }
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type: string
  detail: string
}

async function safe<T>(path: string, ttl: number): Promise<T | null> {
  try {
    return (await apiFetch(path, ttl)) as T
  } catch {
    return null
  }
}

const minute = (t: RawEvent["time"]) => (t.elapsed == null ? "" : t.extra ? `${t.elapsed}+${t.extra}분` : `${t.elapsed}분`)

export function reportSlug(fixture: RawFixture, playerId: number) {
  const day = new Date(fixture.fixture.date).toISOString().slice(0, 10)
  return `${day}-${MARK}-${playerId}-${fixture.fixture.id}`
}

export async function generateMatchReportDrafts(): Promise<{ ok: true; created: string[]; skipped: number }> {
  const created: string[] = []
  let skipped = 0
  const teamIds = [...new Set(KOREAN_PLAYERS_ABROAD.map((p) => p.teamId).filter(Boolean))]
  const now = Date.now()

  for (const teamId of teamIds) {
    if (created.length >= MAX_PER_RUN) break
    const fixtures = (await safe<RawFixture[]>(`/fixtures?team=${teamId}&last=2`, 1800)) ?? []
    for (const fx of fixtures) {
      if (created.length >= MAX_PER_RUN) break
      if (/friendl/i.test(fx.league.name)) continue
      if (getMatchPhase(fx.fixture.status.short) !== "finished") continue
      if (now - new Date(fx.fixture.date).getTime() > LOOKBACK_MS) continue

      const players = KOREAN_PLAYERS_ABROAD.filter((p) => p.teamId === teamId)
      const pending = []
      for (const p of players) if (!(await getColumnBySlug(reportSlug(fx, p.id)))) pending.push(p)
      if (!pending.length) continue

      const fxPlayers = (await safe<RawFixturePlayers>(`/fixtures/players?fixture=${fx.fixture.id}`, 3600)) ?? []
      const events = (await safe<RawEvent[]>(`/fixtures/events?fixture=${fx.fixture.id}`, 3600)) ?? []
      const teamStats = (await safe<RawTeamStats>(`/fixtures/statistics?fixture=${fx.fixture.id}`, 3600)) ?? []
      const nextFx = (await safe<RawFixture[]>(`/fixtures?team=${teamId}&next=1`, 10800))?.[0] ?? null

      for (const p of pending) {
        if (created.length >= MAX_PER_RUN) break
        let stat: RawStat | null = null
        for (const t of fxPlayers) {
          const f = (t.players ?? []).find((x) => x.player.id === p.id)
          if (f) stat = f.statistics?.[0] ?? null
        }
        const minutes = stat?.games?.minutes ?? 0
        const goals = stat?.goals?.total ?? 0
        const assists = stat?.goals?.assists ?? 0
        if (minutes < MIN_MINUTES && goals + assists === 0) {
          skipped++
          continue
        }
        const slug = await makeReport(p, fx, stat!, events, nextFx, teamStats)
        if (slug) created.push(slug)
      }
    }
  }
  return { ok: true, created, skipped }
}

async function makeReport(
  p: (typeof KOREAN_PLAYERS_ABROAD)[number],
  fx: RawFixture,
  stat: RawStat,
  events: RawEvent[],
  nextFx: RawFixture | null,
  teamStats: RawTeamStats = []
): Promise<string | null> {
  const isHome = fx.teams.home.id === p.teamId
  const my = isHome ? fx.teams.home : fx.teams.away
  const opp = isHome ? fx.teams.away : fx.teams.home
  const result = my.winner === true ? "승" : opp.winner === true ? "패" : "무"
  const teamKo = koTeam(my.name)
  const oppKo = koTeam(opp.name)
  const leagueKo = koLeague(fx.league.name)
  const rating = stat.games?.rating ? Number(stat.games.rating) : null
  const minutes = stat.games?.minutes ?? 0
  const goals = stat.goals?.total ?? 0
  const assists = stat.goals?.assists ?? 0

  const detail = detailText({
    detail: {
      position: stat.games?.position ?? null,
      captain: stat.games?.captain === true,
      shots: stat.shots?.total ?? null,
      shotsOn: stat.shots?.on ?? null,
      passes: stat.passes?.total ?? null,
      keyPasses: stat.passes?.key ?? null,
      dribbleAttempts: stat.dribbles?.attempts ?? null,
      dribbleSuccess: stat.dribbles?.success ?? null,
      tackles: stat.tackles?.total ?? null,
      interceptions: stat.tackles?.interceptions ?? null,
      blocks: stat.tackles?.blocks ?? null,
      duels: stat.duels?.total ?? null,
      duelsWon: stat.duels?.won ?? null,
      foulsDrawn: stat.fouls?.drawn ?? null,
      foulsCommitted: stat.fouls?.committed ?? null,
      saves: stat.goals?.saves ?? null,
      conceded: stat.goals?.conceded ?? null,
    },
  } as WeeklyMatch)

  const ko = await koPlayerNames(nameHintsOf(events))
  const goalFlow = goalTimeline(events, fx.teams.home, fx.teams.away, fx.goals, ko).join(" / ")
  const mine: string[] = []
  for (const e of events) {
    if (e.type === "Goal" && e.detail !== "Missed Penalty" && e.detail !== "Own Goal" && e.player.id === p.id) mine.push(`${minute(e.time)} 골`)
    if (e.type === "Goal" && e.assist.id === p.id) mine.push(`${minute(e.time)} 도움`)
    if (e.type === "Card" && e.player.id === p.id) mine.push(`${minute(e.time)} ${e.detail.includes("Red") ? "퇴장" : "경고"}`)
  }
  const season = await seasonLineFor(p.id)

  // 팀 기록 비교 (점유율·슈팅·유효슈팅·코너킥·파울·패스 성공률) — 데이터가 있는 항목만
  const statOf = (teamId: number, type: string) => teamStats.find((t) => t.team.id === teamId)?.statistics?.find((x) => x.type === type)?.value ?? null
  const teamLine = (() => {
    const items: [string, string][] = [
      ["점유율", "Ball Possession"], ["슈팅", "Total Shots"], ["유효슈팅", "Shots on Goal"],
      ["코너킥", "Corner Kicks"], ["파울", "Fouls"], ["패스 성공률", "Passes %"],
    ]
    const parts: string[] = []
    for (const [label, type] of items) {
      const a = statOf(my.id, type), b = statOf(opp.id, type)
      if (a != null && b != null) parts.push(`${label} ${teamKo} ${a} 대 ${oppKo} ${b}`)
    }
    return parts.join(", ")
  })()
  // 경기 중 교체·경고 (선수 본인 교체 + 양 팀 경고/퇴장)
  const subs = events
    .filter((e) => e.type === "subst" || e.type === "Subst")
    .filter((e) => e.player.id === p.id || e.assist.id === p.id)
    .map((e) => (e.player.id === p.id ? `${minute(e.time)} 교체 아웃` : `${minute(e.time)} 교체 투입`))
  const cards = events
    .filter((e) => e.type === "Card")
    .map((e) => `${minute(e.time)} ${e.team.id === p.teamId ? teamKo : oppKo} ${e.detail.includes("Red") ? "퇴장" : "경고"}`)

  const data = [
    `- 선수: ${p.name} (${teamKo}, ${leagueKo})`,
    `- 경기: ${formatKickoffKst(fx.fixture.date)} ${leagueKo}${fx.league.round ? ` ${fx.league.round}` : ""} | ${koTeam(fx.teams.home.name)} ${fx.goals.home}:${fx.goals.away} ${koTeam(fx.teams.away.name)} (${teamKo} ${isHome ? "홈" : "원정"} ${result})`,
    goalFlow ? `- 득점 순서: ${goalFlow}` : "- 득점 순서: (데이터 없음 또는 무득점)",
    `- ${p.name} 기록: ${minutes}분 출전${stat.games?.substitute === true ? "(교체 투입)" : ""}, 평점 ${rating?.toFixed(1) ?? "없음"}, ${goals}골 ${assists}도움`,
    mine.length ? `- ${p.name}의 경기 중 기록: ${mine.join(", ")}` : "",
    detail ? `- 세부 기록: ${detail}` : "",
    subs.length ? `- ${p.name} 교체: ${subs.join(", ")}` : "",
    teamLine ? `- 팀 기록 비교: ${teamLine}` : "",
    cards.length ? `- 경고·퇴장: ${cards.slice(0, 8).join(", ")}` : "",
    season ? `- ${season}` : "",
    nextFx && getMatchPhase(nextFx.fixture.status.short) !== "finished"
      ? `- 다음 경기: ${formatKickoffKst(nextFx.fixture.date)} vs ${koTeam((nextFx.teams.home.id === p.teamId ? nextFx.teams.away : nextFx.teams.home).name)} (${nextFx.teams.home.id === p.teamId ? "홈" : "원정"}, ${koLeague(nextFx.league.name)})`
      : "",
  ].filter(Boolean).join("\n")

  const prompt = `너는 한국 축구 사이트 GoalLine의 칼럼 초안 작성자다. 아래 데이터로 "${p.name} ${oppKo}전 경기 리포트" 초안을 써라.

${COMMON_RULES}
- 선수 이름은 데이터에 적힌 한글 표기 그대로 써라.
- 득점 순서의 "→ 스코어"가 그 골 직후 스코어다. 선제골·동점골·역전골은 이 스코어로 판단해라. "골 A, 도움 B"에서 득점자는 A다.

[본문 구성] — 전체 분량은 공백 포함 1,400~2,000자 정도로 충실하게 쓴다. 데이터에 없는 사실은 절대 만들어내지 말고, 데이터가 있는 항목만 풀어 써라.
- 도입 3문장: 경기 결과, ${p.name}의 핵심 기록(출전 시간, 평점, 공격포인트), 이 경기가 팀과 선수에게 갖는 의미(데이터로 확인되는 범위에서)
- "## 경기 개요": 대회·라운드, 킥오프 시각(한국 시간), 홈/원정, 최종 스코어를 2~3문장
- "## 경기 흐름": 득점 순서 데이터를 시간 순서대로 3~5문장. 경고·퇴장 데이터가 있으면 흐름에 영향을 준 부분만 덧붙인다
- "## 팀 기록으로 본 경기": 팀 기록 비교 데이터가 있을 때만, 점유율·슈팅·패스 등을 2~4문장으로 해석한다. 데이터가 없으면 이 섹션은 통째로 생략
- "## ${p.name}의 기록": 세부 기록, 경기 중 기록(골·도움·카드 시간), 교체 정보를 4~6문장. 수치는 정확히 옮기고 기록이 없는 항목은 언급하지 마라
- "## 시즌 흐름과 다음 경기": 시즌 기록과 다음 경기 일정 3~4문장 (데이터 없으면 있는 것만)
- 제목은 20~40자, "${p.name}"과 상대팀, 평점 또는 공격포인트가 들어가게

[데이터]
${data}`

  try {
    const raw = await callOpenAI(prompt, 3500)
    if (!raw) return null
    const shaped = shapeDraftText(raw, { prefix: "[경기 리포트]", fallbackTitle: `${p.name}, ${oppKo}전 ${minutes}분 평점 ${rating?.toFixed(1) ?? "-"}` })
    let content = shaped.content

    try {
      const kstDay = new Date(fx.fixture.date).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" })
      const png = await renderPlayerCard({
        name: p.name,
        photo: `https://media.api-sports.io/football/players/${p.id}.png`,
        team: teamKo,
        scoreLine: `${koTeam(fx.teams.home.name)} ${fx.goals.home} : ${fx.goals.away} ${koTeam(fx.teams.away.name)}`,
        meta: `${kstDay} · ${leagueKo} · ${isHome ? "홈" : "원정"} ${result}`,
        rating: rating !== null && Number.isFinite(rating) ? rating : null,
        stats: [
          { label: "출전", value: `${minutes}분` },
          { label: "공격포인트", value: goals + assists ? [goals ? `${goals}골` : "", assists ? `${assists}도움` : ""].filter(Boolean).join(" ") : "-" },
          { label: "슈팅(유효)", value: stat.shots?.total ? `${stat.shots.total} (${stat.shots.on ?? 0})` : "0" },
          { label: "키패스", value: String(stat.passes?.key ?? 0) },
          { label: "드리블 성공", value: stat.dribbles?.attempts ? `${stat.dribbles.success ?? 0}/${stat.dribbles.attempts}` : "0" },
          { label: "경합 승리", value: stat.duels?.total ? `${stat.duels.won ?? 0}/${stat.duels.total}` : "0" },
        ],
      })
      const url = await uploadPng("report-card", png)
      if (url) content = `![${p.name} ${oppKo}전 기록 카드 — GoalLine](${url})\n\n${content}`
    } catch (err) {
      console.error("리포트 카드 생성 실패:", err)
    }

    const slug = reportSlug(fx, p.id)
    await saveColumn({
      slug,
      title: shaped.title,
      summary: shaped.summary || `${withJosa(p.name, "이", "가")} ${oppKo}전에서 ${minutes}분 뛰며 평점 ${rating?.toFixed(1) ?? "-"}를 기록했다.`.slice(0, 200),
      content,
      tags: cleanTags([p.name, `${p.name} 평점`, `${p.name} 경기 결과`, `${p.name} 오늘 경기`, teamKo, oppKo, `${teamKo} ${oppKo}`, leagueKo, "해외파 평점", "해외파 경기 결과", "한국인 해외파", "GoalLine"]),
      published: false,
    })
    return slug
  } catch (err) {
    console.error(`리포트 생성 실패 (${p.name}, ${fx.fixture.id}):`, err)
    return null
  }
}
