import { getKoreanPlayersWeek, formatKickoffKst, koLeague, koTeam, type PlayerWeek } from "@/lib/koreanWeekly"
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

function line(w: PlayerWeek): string {
  const rows = w.recent.map((m) => {
    const score = `${koTeam(m.homeName)} ${m.homeScore}:${m.awayScore} ${koTeam(m.awayName)}`
    const res = m.result === "W" ? "승" : m.result === "L" ? "패" : m.result === "D" ? "무" : "결과 미상"
    const perf = m.played
      ? `${m.minutes}분 출전${m.substitute ? "(교체 투입)" : "(선발)"}, 평점 ${m.rating?.toFixed(1) ?? "없음"}, ${m.goals}골 ${m.assists}도움${m.yellow ? `, 경고 ${m.yellow}` : ""}${m.red ? ", 퇴장" : ""}`
      : m.statsAvailable
        ? "출전 기록 없음(명단 제외 또는 벤치)"
        : "개인 기록 데이터 미제공(출전 여부 알 수 없음 — 출전/결장을 단정하지 말 것)"
    return `  - ${formatKickoffKst(m.date)} ${koLeague(m.leagueName)} | ${score} (소속팀 ${res}) | ${perf}`
  })
  return `- ${w.player.name} (${w.teamNameKo}, ${koLeague(w.player.league)})\n${rows.join("\n")}`
}

function buildPrompt(weeks: PlayerWeek[]): string {
  const played = weeks.filter((w) => w.recent.length > 0)
  const idle = weeks.filter((w) => w.recent.length === 0)
  const upcoming = weeks
    .filter((w) => w.next)
    .sort((a, b) => new Date(a.next!.date).getTime() - new Date(b.next!.date).getTime())
    .map((w) => `- ${formatKickoffKst(w.next!.date)} ${w.player.name}(${w.teamNameKo}) vs ${koTeam(w.next!.opponentName)} (${w.next!.isHome ? "홈" : "원정"}, ${koLeague(w.next!.leagueName)})`)

  return `너는 한국 축구 사이트 GoalLine의 칼럼 초안 작성자다. 아래 "데이터"만 사용해서 이번 주 한국인 해외파 선수 활약 정리 칼럼의 초안을 써라.

[절대 규칙]
- 데이터에 없는 사실(부상, 이적설, 감독 발언, 경기 장면 묘사, 득점 시간, 상대 선수 이름 등)은 절대 지어내지 마라.
- 숫자(스코어, 출전 시간, 평점, 골, 도움)는 데이터 그대로 써라.
- 평점은 경기 데이터 제공처 기준의 평점이라고만 언급하고 과장하지 마라.
- 존댓말 대신 칼럼체(~했다, ~이다)로 쓴다.
- 너의 의견·평가·전망("긍정적인 영향", "기대된다" 등)은 쓰지 마라. 사실만 정리한다. 의견은 운영자가 따로 쓴다.
- "다음 경기 일정" 섹션을 빼고는 데이터 줄을 그대로 복사하지 말고 자연스러운 문장으로 풀어 써라.

[형식] 마크다운. 정확히 아래 순서를 지켜라.
1행: 제목: (25~40자 제목, 선수 이름과 핵심 활약이 드러나게) — 앞에 #이나 ** 같은 기호를 붙이지 마라
2행: 요약: (60~100자 요약) — 앞에 기호를 붙이지 마라
3행: 빈 줄
그다음 본문:
- 도입 문단 2~3문장 (이번 주 해외파 전체 흐름)
- "## 이번 주 최고 활약" 섹션: 평점·공격포인트 기준 가장 돋보인 선수 1명을 데이터로 2~3문장 설명
- "## 선수별 정리" 섹션: 출전 기록이 있는 선수마다 "### 선수이름 (소속팀)" 소제목과 2~4문장 정리
- "## 이번 주 경기가 없었던 선수" 섹션: 한 문장으로 이름만 나열 (없으면 섹션 생략)
- "## 다음 경기 일정" 섹션: 목록(- )으로 데이터의 다음 경기를 그대로 정리하고, 이 섹션으로 글을 끝내라

[데이터: 최근 7일 경기 기록]
${played.length ? played.map(line).join("\n") : "(최근 7일 경기 없음)"}

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
      max_tokens: 3000,
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

  const raw = (await callOpenAI(buildPrompt(weeks))).trim()
  if (!raw) return { ok: false, error: "AI 응답이 비어 있습니다" }

  const shaped = shapeDraft(raw)
  const { title, summary } = shaped
  let content = shaped.content

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
