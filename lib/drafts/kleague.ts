import { apiFetch, getStandings } from "@/lib/matchApi"
import { getSeasonYear } from "@/lib/season"
import { formatKickoffKst, koTeam } from "@/lib/koreanWeekly"
import { getColumns, makeColumnSlug, saveColumn } from "@/lib/columns"
import { getMatchPhase } from "@/lib/matchStatus"
import { COMMON_RULES, DRAFT_KINDS, callOpenAI, shapeDraftText, insertBefore, cleanTags, type DraftResult } from "@/lib/draftEngine"

// K리그1 라운드 정리 칼럼 초안 (월요일 크론, 2026-10-11).
// Search Console에서 "포항 스틸러스 경기/순위", "인천 유나이티드 fc 경기" 같은 한국어 K리그
// 검색 노출이 확인돼서 추가. 결과·득점 순서는 데이터로, 순위표는 코드가 직접 표로 넣는다.

const MARK = DRAFT_KINDS.kleague.mark
const LEAGUE_ID = 292

type RawFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  league: { round?: string }
  teams: { home: { id: number; name: string }; away: { id: number; name: string } }
  goals: { home: number | null; away: number | null }
}
type RawEvent = { time: { elapsed: number | null; extra: number | null }; team: { name: string }; player: { name: string | null }; assist: { name: string | null }; type: string; detail: string }

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
const minute = (t: RawEvent["time"]) => (t.elapsed == null ? "" : t.extra ? `${t.elapsed}+${t.extra}분` : `${t.elapsed}분`)

export async function generateKLeagueRoundDraft({ refreshDraft = false } = {}): Promise<DraftResult> {
  const existing = (await getColumns({ includeDrafts: true, limit: 40 })).find(
    (c) => c.slug.includes(MARK) && Date.now() - new Date(c.createdAt).getTime() < 5 * 86400_000
  )
  if (existing && (!refreshDraft || existing.published)) return { ok: true, slug: existing.slug, created: false }

  const season = getSeasonYear("South Korea")
  const to = new Date()
  const from = new Date(Date.now() - 7 * 86400_000)
  let fixtures: RawFixture[] = []
  try {
    fixtures = ((await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${season}&from=${ymd(from)}&to=${ymd(to)}`, 3600)) as RawFixture[]) ?? []
  } catch {
    return { ok: false, error: "K리그 경기 정보를 불러오지 못했습니다" }
  }
  const done = fixtures
    .filter((f) => getMatchPhase(f.fixture.status.short) === "finished")
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
  if (done.length < 3) return { ok: false, error: "최근 7일 동안 끝난 K리그1 경기가 3경기 미만이라 초안을 만들지 않았습니다" }

  const rounds = [...new Set(done.map((f) => f.league.round).filter(Boolean))] as string[]
  const roundLabel = rounds.map((r) => r.replace(/Regular Season - /, "").replace(/Championship Round - |Relegation Round - /, "")).join(", ")

  const matchBlocks = await Promise.all(
    done.map(async (f) => {
      let events: RawEvent[] = []
      try {
        events = ((await apiFetch(`/fixtures/events?fixture=${f.fixture.id}`, 86400)) as RawEvent[]) ?? []
      } catch {}
      const goals = events
        .filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty")
        .map((e) => `${minute(e.time)} ${e.detail === "Own Goal" ? `자책골(${koTeam(e.team.name)} 기록)` : `${e.player.name ?? "?"}(${koTeam(e.team.name)}${e.detail === "Penalty" ? ", PK" : ""}${e.assist.name ? `, 도움 ${e.assist.name}` : ""})`}`)
      const reds = events.filter((e) => e.type === "Card" && e.detail.includes("Red")).map((e) => `${minute(e.time)} ${e.player.name ?? "?"}(${koTeam(e.team.name)}) 퇴장`)
      return [
        `- ${formatKickoffKst(f.fixture.date)} | ${koTeam(f.teams.home.name)} ${f.goals.home}:${f.goals.away} ${koTeam(f.teams.away.name)}`,
        goals.length ? `  · 득점: ${goals.join(", ")}` : "  · 득점: 없음(무득점) 또는 데이터 없음",
        reds.length ? `  · ${reds.join(", ")}` : "",
      ].filter(Boolean).join("\n")
    })
  )

  const groups = await getStandings(LEAGUE_ID, season)
  const tableRows = groups.flat().sort((a, b) => a.rank - b.rank)
  const standingsData = tableRows
    .map((r) => `${r.rank}위 ${koTeam(r.team.name)} — ${r.all.played}경기 ${r.all.win}승 ${r.all.draw}무 ${r.all.lose}패, 승점 ${r.points}, 득실 ${r.goalsDiff > 0 ? "+" : ""}${r.goalsDiff}${r.group && groups.length > 1 ? ` (${r.group})` : ""}`)
    .join("\n")

  const prompt = `너는 한국 축구 사이트 GoalLine의 칼럼 초안 작성자다. 아래 데이터로 "K리그1 ${roundLabel ? `${roundLabel}라운드` : "이번 라운드"} 정리" 칼럼 초안을 써라.

${COMMON_RULES}
- 선수 이름은 데이터에 적힌 표기 그대로 써라(영문이면 영문 그대로). 한글로 옮기거나 추측하지 마라.
- 팀 이름은 데이터에 적힌 한글 표기 그대로 써라.
- 지난 라운드 순위 데이터는 없다. "순위가 올랐다/내려갔다/지켰다" 같은 순위 변동은 쓰지 말고 현재 순위와 승점만 말해라.

[본문 구성]
- 도입 2~3문장: 이번 라운드 전체 흐름(경기 수, 큰 점수 차, 현재 선두 등 데이터로 확인되는 것만)
- "## 경기별 결과": 경기마다 "### 홈팀 점수 원정팀" 소제목과 2~3문장(득점 순서, 퇴장 등)
- "## 순위 판도": 순위 데이터로 선두 경쟁과 하위권 상황 3~4문장 (순위표 자체는 따로 들어가니 전부 나열하지 마라)
- 제목은 25~40자, "K리그1"과 라운드 또는 핵심 팀 이름이 들어가게

[데이터: 최근 7일 K리그1 경기 결과]
${matchBlocks.join("\n")}

[데이터: 현재 순위]
${standingsData || "(순위 데이터 없음)"}`

  const raw = await callOpenAI(prompt, 3500)
  if (!raw) return { ok: false, error: "AI 응답이 비어 있습니다" }
  const shaped = shapeDraftText(raw, { prefix: "[K리그1]", fallbackTitle: `${roundLabel ? `${roundLabel}라운드` : "이번 라운드"} 결과와 순위 정리` })

  // 순위표는 코드가 표로 넣는다 ("순위 판도" 섹션 앞)
  let content = shaped.content
  if (tableRows.length) {
    const table = [
      "## 현재 순위표",
      "",
      ...tableRows.map((r) => `- **${r.rank}위 ${koTeam(r.team.name)}** — 승점 ${r.points} (${r.all.win}승 ${r.all.draw}무 ${r.all.lose}패, 득실 ${r.goalsDiff > 0 ? "+" : ""}${r.goalsDiff})`),
      "",
      `*${season} 시즌 · 경기 데이터 제공처 기준*`,
    ].join("\n")
    content = insertBefore(content, /\n##\s*순위\s*판도/, table)
  }

  const teams = [...new Set(done.flatMap((f) => [koTeam(f.teams.home.name), koTeam(f.teams.away.name)]))]
  const tags = cleanTags([
    "K리그", "K리그1", "K리그 순위", "K리그 결과", ...(roundLabel ? [`K리그1 ${roundLabel}라운드`] : []),
    ...teams.flatMap((t) => [t, `${t} 경기`]),
    "GoalLine",
  ])

  const slug = existing?.slug ?? makeColumnSlug(MARK)
  await saveColumn({ slug, title: shaped.title, summary: shaped.summary, content, tags, published: false })
  return { ok: true, slug, created: true }
}
