import { apiFetch } from "@/lib/matchApi"
import { formatKickoffKst, koLeague, koTeam } from "@/lib/koreanWeekly"
import { getColumnBySlug, saveColumn } from "@/lib/columns"
import { getMatchPhase } from "@/lib/matchStatus"
import { goalTimeline, nameHintsOf } from "@/lib/goalTimeline"
import { koPlayerNames } from "@/lib/playerNameKo"
import { BIG_CLUBS, BIG_CLUB_IDS } from "@/lib/bigClubs"
import { COMMON_RULES, DRAFT_KINDS, callOpenAI, shapeDraftText, cleanTags } from "@/lib/draftEngine"

// 유럽 빅클럽 경기 리포트 초안 (2026-10-12). 한국 선수 리포트(matchReports.ts)와 같은 원칙:
//  - 데이터(스코어·득점 순서·팀 기록·활약 선수)만으로 사실을 정리하고 의견은 운영자 몫
//  - 경기마다 주소(slug)를 고정해 중복 생성하지 않는다. 두 팀이 모두 빅클럽이면 글 하나로 합친다
//  - 끝난 지 48시간 안의 경기만 (경기 직후 검색이 몰리는 시간대)

const MARK = DRAFT_KINDS.club.mark
const LOOKBACK_MS = 48 * 3600_000
const MAX_PER_RUN = 4

type RawFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  league: { id: number; name: string; round?: string }
  teams: { home: { id: number; name: string; winner: boolean | null }; away: { id: number; name: string; winner: boolean | null } }
  goals: { home: number | null; away: number | null }
}
type RawStat = {
  games?: { minutes: number | null; rating: string | null }
  goals?: { total: number | null; assists: number | null }
}
type RawFixturePlayers = { team: { id: number; name: string }; players: { player: { id: number; name: string }; statistics: RawStat[] }[] }[]
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

// slug에 대표 클럽 ID를 넣어 두면 카드 로고를 따로 조회하지 않아도 된다
// "Regular Season - 6" 같은 영문 라운드 표기를 "6라운드"로. 숫자가 없으면(결승·조별 등) 표기하지 않는다.
function roundKo(r?: string | null): string {
  const n = r?.match(/(\d+)\s*$/)?.[1]
  return n ? ` ${n}라운드` : ""
}

export function clubReportSlug(fx: RawFixture, teamId: number) {
  const day = new Date(fx.fixture.date).toISOString().slice(0, 10)
  return `${day}-${MARK}-${teamId}-${fx.fixture.id}`
}

export async function generateClubReportDrafts(): Promise<{ ok: true; created: string[]; skipped: number }> {
  const created: string[] = []
  let skipped = 0
  const seen = new Set<number>()
  const now = Date.now()

  for (const club of BIG_CLUBS) {
    if (created.length >= MAX_PER_RUN) break
    const fixtures = (await safe<RawFixture[]>(`/fixtures?team=${club.id}&last=2`, 1800)) ?? []
    for (const fx of fixtures) {
      if (created.length >= MAX_PER_RUN) break
      if (seen.has(fx.fixture.id)) continue
      seen.add(fx.fixture.id)
      if (/friendl/i.test(fx.league.name)) continue
      if (getMatchPhase(fx.fixture.status.short) !== "finished") continue
      if (now - new Date(fx.fixture.date).getTime() > LOOKBACK_MS) continue

      // 대표 클럽: 홈팀이 빅클럽이면 홈, 아니면 원정
      const mainId = BIG_CLUB_IDS.has(fx.teams.home.id) ? fx.teams.home.id : fx.teams.away.id
      if (await getColumnBySlug(clubReportSlug(fx, mainId))) {
        skipped++
        continue
      }
      const slug = await makeClubReport(fx, mainId)
      if (slug) created.push(slug)
    }
  }
  return { ok: true, created, skipped }
}

async function makeClubReport(fx: RawFixture, mainId: number): Promise<string | null> {
  const homeKo = koTeam(fx.teams.home.name)
  const awayKo = koTeam(fx.teams.away.name)
  const leagueKo = koLeague(fx.league.name)
  const main = fx.teams.home.id === mainId ? fx.teams.home : fx.teams.away
  const mainKo = koTeam(main.name)
  const other = fx.teams.home.id === mainId ? fx.teams.away : fx.teams.home
  const otherKo = koTeam(other.name)
  const mainHome = fx.teams.home.id === mainId

  const events = (await safe<RawEvent[]>(`/fixtures/events?fixture=${fx.fixture.id}`, 3600)) ?? []
  const teamStats = (await safe<RawTeamStats>(`/fixtures/statistics?fixture=${fx.fixture.id}`, 3600)) ?? []
  const fxPlayers = (await safe<RawFixturePlayers>(`/fixtures/players?fixture=${fx.fixture.id}`, 3600)) ?? []
  const next = async (teamId: number) => (await safe<RawFixture[]>(`/fixtures?team=${teamId}&next=1`, 10800))?.[0] ?? null

  const ko = await koPlayerNames(nameHintsOf(events))
  const goalFlow = goalTimeline(events, fx.teams.home, fx.teams.away, fx.goals, ko).join(" / ")

  const statOf = (teamId: number, type: string) => teamStats.find((t) => t.team.id === teamId)?.statistics?.find((x) => x.type === type)?.value ?? null
  const items: [string, string][] = [
    ["점유율", "Ball Possession"], ["슈팅", "Total Shots"], ["유효슈팅", "Shots on Goal"],
    ["코너킥", "Corner Kicks"], ["파울", "Fouls"], ["패스 성공률", "Passes %"], ["기대 득점(xG)", "expected_goals"],
  ]
  const teamLine = items
    .map(([label, type]) => {
      const a = statOf(fx.teams.home.id, type), b = statOf(fx.teams.away.id, type)
      return a != null && b != null ? `${label} ${homeKo} ${a} 대 ${awayKo} ${b}` : ""
    })
    .filter(Boolean)
    .join(", ")

  // 팀별 평점 상위 선수 (골·도움 포함) — 이름은 데이터에 적힌 영문 표기를 그대로 쓴다
  const top = fxPlayers
    .map((t) => {
      const best = [...(t.players ?? [])]
        .map((p) => ({ name: p.player.name, rating: Number(p.statistics?.[0]?.games?.rating ?? 0), g: p.statistics?.[0]?.goals?.total ?? 0, a: p.statistics?.[0]?.goals?.assists ?? 0 }))
        .filter((p) => p.rating > 0)
        .sort((x, y) => y.rating - x.rating)
        .slice(0, 2)
      return best.length ? `${koTeam(t.team.name)}: ${best.map((p) => `${p.name} 평점 ${p.rating.toFixed(1)}${p.g ? ` ${p.g}골` : ""}${p.a ? ` ${p.a}도움` : ""}`).join(", ")}` : ""
    })
    .filter(Boolean)
    .join(" | ")

  const cards = events
    .filter((e) => e.type === "Card")
    .map((e) => `${minute(e.time)} ${koTeam(e.team.name)} ${e.detail.includes("Red") ? "퇴장" : "경고"}`)
    .slice(0, 8)
    .join(", ")

  const nextMain = await next(mainId)
  const nextOther = BIG_CLUB_IDS.has(other.id) ? await next(other.id) : null
  const nextLine = (name: string, f: RawFixture | null, teamId: number) =>
    f && getMatchPhase(f.fixture.status.short) !== "finished"
      ? `- ${name} 다음 경기: ${formatKickoffKst(f.fixture.date)} vs ${koTeam((f.teams.home.id === teamId ? f.teams.away : f.teams.home).name)} (${f.teams.home.id === teamId ? "홈" : "원정"}, ${koLeague(f.league.name)})`
      : ""

  const resultMain = main.winner === true ? "승" : other.winner === true ? "패" : "무"
  const data = [
    `- 경기: ${formatKickoffKst(fx.fixture.date)} ${leagueKo}${roundKo(fx.league.round)} | ${homeKo} ${fx.goals.home}:${fx.goals.away} ${awayKo}`,
    `- 중심 팀: ${mainKo} (${mainHome ? "홈" : "원정"} ${resultMain})`,
    goalFlow ? `- 득점 순서: ${goalFlow}` : "- 득점 순서: (데이터 없음 또는 무득점)",
    teamLine ? `- 팀 기록 비교: ${teamLine}` : "",
    top ? `- 팀별 평점 상위 선수: ${top}` : "",
    cards ? `- 경고·퇴장: ${cards}` : "",
    nextLine(mainKo, nextMain, mainId),
    nextLine(otherKo, nextOther, other.id),
  ].filter(Boolean).join("\n")

  const prompt = `너는 한국 축구 사이트 GoalLine의 칼럼 초안 작성자다. 아래 데이터로 "${homeKo} 대 ${awayKo}" 경기 리포트 초안을 써라.

${COMMON_RULES}
- 팀 이름은 데이터에 적힌 한글 표기 그대로 써라. 선수 이름은 데이터의 득점 순서에 적힌 한글 표기를 쓰고, "팀별 평점 상위 선수"의 영문 이름은 영문 그대로 써라.
- 득점 순서의 "→ 스코어"가 그 골 직후 스코어다. 선제골·동점골·역전골은 이 스코어로 판단해라. "골 A, 도움 B"에서 득점자는 A다.
- 데이터에 득점 순서가 스코어보다 적게(골이 빠져) 있으면, 확인되는 골만 쓰고 빠진 골을 지어내지 마라.
- 영어 표현(Regular Season, Round 등)은 쓰지 마라. 라운드는 데이터에 적힌 "N라운드" 한글 표기만 쓴다.
- 평가·감상 표현("아쉬운", "인상적인", "압도적인", "시즌 초반 상승세", "굴욕", "대승의 의미" 등)과 데이터에 없는 맥락(연승·연패, 순위 변동, "역전승" 등 득점 순서로 확인되지 않는 것)은 쓰지 마라.
- 퇴장(레드카드)이 데이터에 있으면 반드시 "경기 흐름"에 언급해라. "오픈플레이" 같은 데이터에 없는 용어도 쓰지 마라.
- 도입 첫 문장은 80자 이내의 완결된 문장 하나로, "[날짜] [팀A]는 [팀B]를 상대로 [스코어]로 [승리/패배/무승부]했다." 형태로 써라. 중간에 끊기는 문장이나 "~를."로 끝나는 문장을 쓰지 마라.

[본문 구성] — 전체 분량은 공백 포함 1,400~2,000자 정도로 충실하게 쓴다. 데이터가 있는 항목만 풀어 써라.
- 도입 3문장: 경기 결과, 눈에 띄는 기록(스코어·득점 순서·팀 기록 중 데이터로 확인되는 것), 두 팀에 갖는 의미(데이터 범위에서)
- "## 경기 개요": 대회·라운드, 킥오프 시각(한국 시간), 홈/원정, 최종 스코어를 2~3문장
- "## 경기 흐름": 득점 순서를 시간 순서대로 3~5문장. 경고·퇴장이 있으면 흐름에 영향을 준 부분만 덧붙인다
- "## 팀 기록으로 본 경기": 팀 기록 비교 데이터가 있을 때만 점유율·슈팅·유효슈팅·xG 등을 2~4문장으로 해석. 없으면 섹션 통째로 생략
- "## 활약한 선수들": 팀별 평점 상위 선수 데이터가 있을 때만 2~4문장. 없으면 생략
- "## 다음 경기": 두 팀의 다음 일정 2~3문장 (데이터 없으면 있는 것만)
- 제목은 20~40자, 두 팀 이름과 스코어가 들어가게

[데이터]
${data}`

  try {
    const raw = await callOpenAI(prompt, 3500)
    if (!raw) return null
    const shaped = shapeDraftText(raw, { prefix: "[빅클럽]", fallbackTitle: `${homeKo} ${fx.goals.home}:${fx.goals.away} ${awayKo}` })
    const slug = clubReportSlug(fx, mainId)
    await saveColumn({
      slug,
      title: shaped.title,
      summary: shaped.summary || `${leagueKo}에서 ${homeKo}와 ${awayKo}가 ${fx.goals.home}:${fx.goals.away}로 끝났다.`.slice(0, 200),
      content: shaped.content,
      tags: cleanTags([homeKo, awayKo, `${homeKo} ${awayKo}`, `${homeKo} 경기 결과`, `${awayKo} 경기 결과`, leagueKo, "유럽 축구", "빅클럽 경기 결과", "GoalLine"]),
      published: false,
    })
    return slug
  } catch (err) {
    console.error(`빅클럽 리포트 생성 실패 (${fx.fixture.id}):`, err)
    return null
  }
}
