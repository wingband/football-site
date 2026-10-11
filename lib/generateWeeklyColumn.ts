import { getKoreanPlayersWeek, formatKickoffKst, koLeague, koTeam, type PlayerWeek, type WeeklyMatch } from "@/lib/koreanWeekly"
import { buildWeeklyContext, detailText, numbersSection } from "@/lib/weeklyContext"
import { getColumns, makeColumnSlug, saveColumn } from "@/lib/columns"
import { put } from "@vercel/blob"
import { pickTopRows, renderWeeklyCard, periodLabel } from "@/lib/weeklyCard"

// 주간 해외파 칼럼 "초안" 자동 생성 (2026-10-10 신설).
// 데이터(경기 결과·출전 시간·평점·공격포인트)로 뼈대를 AI가 쓰고, 선수별 섹션마다
// 운영자가 직접 의견을 적을 자리 2곳(최고 활약 선수, 한 줄 총평)을 남긴 채 "비공개"로 저장한다. 운영자가 의견을
// 채워 넣어야만 공개할 수 있다(app/api/columns/route.ts의 발행 검사).
// → 순수 자동 생성 글이 아니라 사람의 시각이 들어간 글이 되도록 하는 장치.

export const OPINION_PLACEHOLDER = "(여기에 직접 한두 줄 의견을 써주세요)"
export const WEEKLY_SLUG_MARK = "weekly-korean-abroad"

type Ctx = Awaited<ReturnType<typeof buildWeeklyContext>>

function matchLine(w: PlayerWeek, m: WeeklyMatch, ctx: Ctx): string {
  const score = `${koTeam(m.homeName)} ${m.homeScore}:${m.awayScore} ${koTeam(m.awayName)}`
  const res = m.result === "W" ? "승" : m.result === "L" ? "패" : m.result === "D" ? "무" : "결과 미상"
  const head = `  - ${formatKickoffKst(m.date)} ${koLeague(m.leagueName)} | ${score} (소속팀 ${res}, ${m.isHome ? "홈" : "원정"})`
  const c = ctx.matchCtx(w.player.id, m)
  const perf = `${m.minutes}분 출전${m.substitute === true ? "(교체 투입)" : ""}, 평점 ${m.rating?.toFixed(1) ?? "없음"}, ${m.goals}골 ${m.assists}도움`
  const extra = [
    c.myEvents && `이 선수의 경기 중 기록: ${c.myEvents}`,
    detailText(m) && `세부 기록: ${detailText(m)}`,
    c.goalFlow && `이 경기 득점 순서: ${c.goalFlow}`,
  ].filter(Boolean)
  return [head, `    · ${perf}`, ...extra.map((e) => `    · ${e}`)].join("\n")
}

function buildPrompt(weeks: PlayerWeek[], ctx: Ctx): string {
  const playedWeeks = weeks.filter((w) => w.recent.some((m) => m.played))
  const benched = weeks.filter((w) => w.recent.length > 0 && !w.recent.some((m) => m.played))
  const idle = weeks.filter((w) => w.recent.length === 0)
  const upcoming = weeks
    .filter((w) => w.next)
    .sort((a, b) => new Date(a.next!.date).getTime() - new Date(b.next!.date).getTime())
    .map((w) => `- ${formatKickoffKst(w.next!.date)} ${w.player.name}(${w.teamNameKo}) vs ${koTeam(w.next!.opponentName)} (${w.next!.isHome ? "홈" : "원정"}, ${koLeague(w.next!.leagueName)})`)

  const playedBlock = playedWeeks
    .map((w) => {
      const season = ctx.seasonLines.get(w.player.id)
      const matches = w.recent.filter((m) => m.played).map((m) => matchLine(w, m, ctx))
      return [`- ${w.player.name} (${w.teamNameKo}, ${koLeague(w.player.league)})`, ...(season ? [`  · ${season}`] : []), ...matches].join("\n")
    })
    .join("\n")

  const benchedBlock = benched
    .map((w) => {
      const m = w.recent[0]
      const note = m.statsAvailable ? "출전 기록 없음" : "개인 기록 미제공(출전 여부 불명 — 결장이라고 단정하지 말 것)"
      return `- ${w.player.name}(${w.teamNameKo}): 소속팀 ${koTeam(m.homeName)} ${m.homeScore}:${m.awayScore} ${koTeam(m.awayName)}, ${note}`
    })
    .join("\n")

  return `너는 한국 축구 사이트 GoalLine의 칼럼 초안 작성자다. 아래 "데이터"만 사용해서 이번 주 한국인 해외파 선수 활약 정리 칼럼의 초안을 써라.

[절대 규칙]
- 데이터에 없는 사실(부상, 이적설, 감독 발언, 데이터에 없는 경기 장면, 데이터에 없는 선수 이름 등)은 절대 지어내지 마라.
- 숫자(스코어, 시간, 평점, 골, 도움, 세부 기록)는 데이터 그대로 써라. 데이터에 있는 세부 기록과 득점 순서는 적극 활용해라.
- 데이터에 "(교체 투입)"이라고 적힌 경우에만 교체로 들어왔다고 쓰고, 그 외에는 선발/교체 여부를 언급하지 마라.
- 평점은 경기 데이터 제공처 기준의 평점이라고만 언급하고 과장하지 마라.
- 존댓말 대신 칼럼체(~했다, ~이다)로 쓴다.
- 너의 의견·평가·전망("긍정적인 영향", "기대된다", "아쉽게도" 등)은 쓰지 마라. 사실을 생생하게 정리하되 판단은 운영자 몫이다.
- "다음 경기 일정" 섹션을 빼고는 데이터 줄을 그대로 복사하지 말고 자연스러운 문장으로 풀어 써라.

[형식] 마크다운. 정확히 아래 순서를 지켜라.
1행: 제목: (25~40자 제목, 선수 이름과 핵심 활약이 드러나게) — 앞에 #이나 ** 같은 기호를 붙이지 마라
2행: 요약: (60~100자 요약) — 앞에 기호를 붙이지 마라
3행: 빈 줄
그다음 본문:
- 도입 문단 3~4문장 (이번 주 해외파 전체 흐름: 몇 명이 뛰었고, 소속팀 성적은 어땠는지, 눈에 띈 기록은 무엇인지)
- "## 이번 주 최고 활약" 섹션: 평점·공격포인트 기준 가장 돋보인 선수 1명. 경기 흐름(득점 순서)과 세부 기록, 시즌 기록까지 엮어 4~6문장
- "## 선수별 정리" 섹션: [출전 선수] 데이터에 있는 선수만, 선수마다 "### 선수이름 (소속팀)" 소제목과 3~5문장. 경기 결과와 흐름 → 본인 기록(시간, 평점, 세부 기록, 골/도움 시간) → 시즌 기록 순서로
- "## 출전하지 못한 선수" 섹션: [벤치·명단 제외] 데이터의 선수들을 한 문단(2~3문장)으로 묶어 소속팀 결과와 함께 정리 (없으면 섹션 생략)
- "## 이번 주 경기가 없었던 선수" 섹션: 한 문장으로 이름만 나열 (없으면 섹션 생략)
- "## 다음 경기 일정" 섹션: 목록(- )으로 데이터의 다음 경기를 그대로 정리하고, 이 섹션으로 글을 끝내라

[데이터: 출전 선수 — 최근 7일]
${playedBlock || "(없음)"}

[데이터: 벤치·명단 제외 — 최근 7일]
${benchedBlock || "(없음)"}

[데이터: 최근 7일 경기가 없었던 선수]
${idle.map((w) => w.player.name).join(", ") || "(없음)"}

[데이터: 다음 경기 일정, 한국 시간]
${upcoming.join("\n") || "(정보 없음)"}`
}

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 4500,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error("주간 칼럼 OpenAI 에러:", data)
    throw new Error("AI 초안 생성에 실패했습니다")
  }
  return data.choices?.[0]?.message?.content ?? ""
}

function weekLabel(now = new Date()): string {
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
  const month = kst.getMonth() + 1
  const week = Math.ceil(kst.getDate() / 7)
  return `${month}월 ${week}주차`
}

export type WeeklyDraftResult =
  | { ok: true; slug: string; created: boolean }
  | { ok: false; error: string }

// 최근 5일 안에 만든 주간 초안이 이미 있으면:
//  - refreshDraft=false(관리자 버튼): 새로 만들지 않고 그 초안을 돌려준다 (OpenAI 중복 호출 방지)
//  - refreshDraft=true(월요일 크론): 그 초안이 아직 발행 전이면 같은 주소에 최신 경기까지 넣어 다시 쓴다.
//    주말 중에 미리 버튼으로 만든 초안 때문에 일요일 밤 경기가 빠진 채로 남는 걸 막기 위함 (2026-10-11).
//    이미 발행했으면 손대지 않는다.
export async function generateWeeklyKoreanDraft({ refreshDraft = false } = {}): Promise<WeeklyDraftResult> {
  const existing = (await getColumns({ includeDrafts: true, limit: 30 })).find(
    (c) => c.slug.includes(WEEKLY_SLUG_MARK) && Date.now() - new Date(c.createdAt).getTime() < 5 * 86400_000
  )
  if (existing && (!refreshDraft || existing.published)) {
    return { ok: true, slug: existing.slug, created: false }
  }

  const weeks = await getKoreanPlayersWeek(7)
  if (!weeks.some((w) => w.recent.length > 0)) {
    return { ok: false, error: "최근 7일 동안 해외파 경기 기록이 없어 초안을 만들지 않았습니다" }
  }

  const ctx = await buildWeeklyContext(weeks)
  const raw = (await callOpenAI(buildPrompt(weeks, ctx))).trim()
  if (!raw) return { ok: false, error: "AI 응답이 비어 있습니다" }

  const shaped = shapeDraft(raw)
  const { title, summary } = shaped
  let content = shaped.content

  // "숫자로 보는 이번 주"는 코드가 계산해서 "다음 경기 일정" 앞에 넣는다
  const numbers = numbersSection(weeks)
  if (numbers) {
    const at = content.search(/\n##\s*다음\s*경기\s*일정/)
    const at2 = at >= 0 ? at : content.search(/\n##\s*한\s*줄\s*총평/)
    content = at2 >= 0 ? `${content.slice(0, at2)}\n\n${numbers}\n${content.slice(at2)}` : `${content}\n\n${numbers}`
  }

  // 글 맨 위에 "평점 TOP 5" 카드 이미지를 붙인다. 이미지 저장소가 없거나 그리기에
  // 실패해도 초안 자체는 그대로 만든다(카드는 있으면 좋은 부가 요소).
  const cardUrl = await makeWeeklyCard(weeks)
  if (cardUrl) {
    content = `![이번 주 해외파 평점 TOP 5 — GoalLine 자체 집계](${cardUrl})\n\n${content}`
  }

  const slug = existing?.slug ?? makeColumnSlug(WEEKLY_SLUG_MARK)
  await saveColumn({
    slug,
    title: title.slice(0, 120),
    summary: summary.slice(0, 200),
    content,
    tags: ["해외파", "주간정리"],
    published: false,
  })
  return { ok: true, slug, created: true }
}

// 모델 출력 → 제목/요약/본문으로 정리하고, 운영자 의견 자리 2곳을 코드로 직접 넣는다.
// (2026-10-11) 의견 자리를 모델에게 맡겼더니 모델이 그 자리에 스스로 의견을 써 넣어서
// "사람 의견 없이 발행 불가" 장치가 무력화됐다. 이제 모델이 쓴 의견 줄은 전부 지우고
// 의견 자리는 항상 코드가 넣는다. 제목/요약도 "# 제목:", "**제목:**" 같은 변형을 모두 받는다.
export function shapeDraft(raw: string): { title: string; summary: string; content: string } {
  let title = `[주간 해외파] ${weekLabel()} 해외파 활약 정리`
  let summary = ""
  const body: string[] = []
  let seenHeading = false
  for (const line of raw.split("\n")) {
    const clean = line.replace(/^[\s#>*_-]+/, "").replace(/\*\*/g, "").trim()
    const t = !seenHeading && clean.match(/^제목\s*[:：]\s*(.+)$/)
    const sm = !seenHeading && clean.match(/^요약\s*[:：]\s*(.+)$/)
    if (t) {
      title = `[주간 해외파] ${t[1].replace(/^["'\[(]+|["'\])]+$/g, "").trim()}`
      continue
    }
    if (sm) {
      summary = sm[1].trim()
      continue
    }
    if (/^#{2,3}\s/.test(line)) seenHeading = true
    if (/내\s*의견/.test(line)) continue // 모델이 쓴 의견 줄 제거
    body.push(line)
  }

  // 모델이 만든 "한 줄 총평" 섹션은 통째로 제거 (운영자 몫)
  let text = body.join("\n").replace(/\n##\s*한\s*줄\s*총평[\s\S]*?(?=\n##\s|$)/, "").trim()

  const slot = `> ✍️ 내 의견: ${OPINION_PLACEHOLDER}`
  // "이번 주 최고 활약" 섹션 끝(다음 ## 앞)에 의견 자리
  const mvp = text.match(/\n?##\s*이번\s*주\s*최고\s*활약[^\n]*\n[\s\S]*?(?=\n##\s|$)/)
  if (mvp && mvp.index !== undefined) {
    const end = mvp.index + mvp[0].length
    text = `${text.slice(0, end).trimEnd()}\n\n${slot}\n${text.slice(end)}`
  }
  text = `${text.trim()}\n\n## 한 줄 총평\n${slot}`
  return { title, summary, content: text }
}

async function makeWeeklyCard(weeks: Awaited<ReturnType<typeof getKoreanPlayersWeek>>): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null
  const rows = pickTopRows(weeks, 5)
  if (rows.length < 2) return null // 1명뿐이면 "TOP" 카드가 어색해서 생략
  try {
    const png = await renderWeeklyCard(rows, periodLabel())
    const blob = await put(`columns/weekly-card-${new Date().toISOString().slice(0, 10)}.png`, png, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/png",
    })
    return blob.url
  } catch (err) {
    console.error("주간 카드 이미지 생성 실패:", err)
    return null
  }
}
