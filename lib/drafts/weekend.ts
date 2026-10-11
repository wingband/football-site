import { getKoreanPlayersWeek, formatKickoffKst, koLeague, koTeam, type PlayerWeek } from "@/lib/koreanWeekly"
import { buildWeeklyContext, detailText } from "@/lib/weeklyContext"
import { getColumns, makeColumnSlug, saveColumn } from "@/lib/columns"
import { renderScheduleCard } from "@/lib/weeklyCard"
import { COMMON_RULES, DRAFT_KINDS, callOpenAI, shapeDraftText, uploadPng, cleanTags, type DraftResult } from "@/lib/draftEngine"

// 주말 해외파 경기 일정 칼럼 초안 (금요일 오전 크론, 2026-10-11).
// "이번 주말 손흥민 경기", "해외파 경기 일정" 같은 주말 직전 검색 수요를 노린다.
// 일정 목록과 카드 이미지는 코드가 만들고(틀릴 일 없게), AI는 경기별 맥락(직전 경기 기록,
// 시즌 기록)을 문장으로 정리한다.

const MARK = DRAFT_KINDS.weekend.mark
const WINDOW_DAYS = 4.5 // 금요일 아침 기준 → 화요일 새벽(한국 시간)까지

function fmtDay(d: Date) {
  return d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" })
}

export async function generateWeekendScheduleDraft({ refreshDraft = false } = {}): Promise<DraftResult> {
  const existing = (await getColumns({ includeDrafts: true, limit: 40 })).find(
    (c) => c.slug.includes(MARK) && Date.now() - new Date(c.createdAt).getTime() < 3 * 86400_000
  )
  if (existing && (!refreshDraft || existing.published)) return { ok: true, slug: existing.slug, created: false }

  const weeks = await getKoreanPlayersWeek(7)
  const now = Date.now()
  const until = now + WINDOW_DAYS * 86400_000
  const upcoming = weeks
    .filter((w) => w.next && new Date(w.next.date).getTime() >= now && new Date(w.next.date).getTime() <= until)
    .sort((a, b) => new Date(a.next!.date).getTime() - new Date(b.next!.date).getTime())
  if (upcoming.length < 2) return { ok: false, error: "이번 주말 해외파 경기가 2경기 미만이라 초안을 만들지 않았습니다 (A매치 휴식기일 수 있어요)" }

  const ctx = await buildWeeklyContext(weeks)
  const idle = weeks.filter((w) => !upcoming.includes(w))

  const lastPlayed = (w: PlayerWeek) => w.recent.find((m) => m.played) ?? null
  const dataBlock = upcoming
    .map((w) => {
      const n = w.next!
      const lines = [`- ${w.player.name} (${w.teamNameKo}, ${koLeague(w.player.league)})`,
        `  · 다음 경기: ${formatKickoffKst(n.date)} ${koLeague(n.leagueName)} vs ${koTeam(n.opponentName)} (${n.isHome ? "홈" : "원정"})`]
      const season = ctx.seasonLines.get(w.player.id)
      if (season) lines.push(`  · ${season}`)
      const lp = lastPlayed(w)
      if (lp) {
        const res = lp.result === "W" ? "승" : lp.result === "L" ? "패" : lp.result === "D" ? "무" : ""
        lines.push(`  · 직전 경기: ${koTeam(lp.homeName)} ${lp.homeScore}:${lp.awayScore} ${koTeam(lp.awayName)}(소속팀 ${res}) — ${lp.minutes}분${lp.substitute === true ? "(교체 투입)" : ""}, 평점 ${lp.rating?.toFixed(1) ?? "없음"}, ${lp.goals}골 ${lp.assists}도움${detailText(lp) ? `, ${detailText(lp)}` : ""}`)
      } else if (w.recent.length) {
        lines.push(`  · 직전 경기: 출전 기록 없음`)
      }
      return lines.join("\n")
    })
    .join("\n")

  const prompt = `너는 한국 축구 사이트 GoalLine의 칼럼 초안 작성자다. 아래 데이터로 "이번 주말 한국인 해외파 경기 일정" 칼럼 초안을 써라.

${COMMON_RULES}

[본문 구성]
- 도입 2~3문장: 이번 주말 몇 명의 해외파가 어떤 리그에서 뛰는지 (경기 시각 목록은 따로 들어가니 나열하지 마라)
- "## 경기별 체크 포인트": 데이터의 선수마다 "### 선수이름 (소속팀) vs 상대팀" 소제목과 2~4문장. 경기 시각(한국 시간)·홈/원정 → 직전 경기 기록 → 시즌 기록 순서
- 마지막 "## 이번 주말 경기가 없는 선수": 한 문장 (없으면 생략)
- 제목은 25~40자, "이번 주말"과 대표 선수 이름이 들어가게

[데이터: 이번 주말 경기가 있는 선수 (한국 시간)]
${dataBlock}

[데이터: 이번 주말 경기가 없는 선수]
${idle.map((w) => w.player.name).join(", ") || "(없음)"}`

  const raw = await callOpenAI(prompt, 3500)
  if (!raw) return { ok: false, error: "AI 응답이 비어 있습니다" }
  const first = new Date(upcoming[0].next!.date)
  const last = new Date(upcoming[upcoming.length - 1].next!.date)
  const period = `${fmtDay(first)} ~ ${fmtDay(last)}`
  const shaped = shapeDraftText(raw, { prefix: "[주말 해외파 일정]", fallbackTitle: `${period} 해외파 경기 일정` })

  // 일정표는 코드가 만들어 첫 소제목 앞에 넣는다
  const list = upcoming
    .map((w) => `- **${formatKickoffKst(w.next!.date)}** · ${w.player.name}(${w.teamNameKo}) vs ${koTeam(w.next!.opponentName)} — ${w.next!.isHome ? "홈" : "원정"}, ${koLeague(w.next!.leagueName)}`)
    .join("\n")
  let content = shaped.content
  const firstH = content.search(/\n##\s/)
  const table = `## 한눈에 보는 주말 일정 (한국 시간)\n${list}`
  content = firstH >= 0 ? `${content.slice(0, firstH)}\n\n${table}\n${content.slice(firstH)}` : `${table}\n\n${content}`

  try {
    const png = await renderScheduleCard(
      upcoming.map((w) => ({
        when: formatKickoffKst(w.next!.date).replace(/ \(/, "("),
        name: w.player.name,
        team: w.teamNameKo,
        vs: `vs ${koTeam(w.next!.opponentName)} · ${w.next!.isHome ? "홈" : "원정"}`,
      })),
      period
    )
    const url = await uploadPng("weekend-card", png)
    if (url) content = `![이번 주말 해외파 경기 일정 — GoalLine](${url})\n\n${content}`
  } catch (err) {
    console.error("주말 일정 카드 생성 실패:", err)
  }

  const tags = cleanTags([
    ...upcoming.flatMap((w) => [w.player.name, `${w.player.name} 경기 일정`, `${w.player.name} 다음 경기`, w.teamNameKo]),
    ...upcoming.map((w) => koLeague(w.next!.leagueName)),
    "해외파 경기 일정", "이번 주말 해외파", "해외축구 일정", "한국인 해외파", "주말 축구", "GoalLine",
  ])

  const slug = existing?.slug ?? makeColumnSlug(MARK)
  await saveColumn({ slug, title: shaped.title, summary: shaped.summary, content, tags, published: false })
  return { ok: true, slug, created: true }
}
