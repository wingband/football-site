import { put } from "@vercel/blob"

// 자동 칼럼 초안 공통 엔진 (2026-10-11).
// 주간 해외파 정리 / 주말 해외파 일정 / 경기 직후 선수 리포트 / K리그 라운드 정리가
// 모두 같은 원칙을 따른다:
//   1) AI는 "데이터"만으로 사실을 정리한다 (지어내기 금지, 의견 금지)
//   2) 운영자 의견 자리 1곳(한 줄 총평)을 코드가 직접 넣고, 비공개로 저장한다
//   3) 운영자가 그 자리를 채워야만 공개된다 (app/api/columns/route.ts)

export { OPINION_PLACEHOLDER, DRAFT_KINDS, draftKindOf, type DraftKind } from "@/lib/draftKinds"
import { OPINION_PLACEHOLDER } from "@/lib/draftKinds"

// 모든 초안 프롬프트에 공통으로 붙는 규칙
export const COMMON_RULES = `[절대 규칙]
- 아래 "데이터"에 없는 사실(부상, 이적설, 감독·선수 발언, 데이터에 없는 경기 장면, 데이터에 없는 선수 이름 등)은 절대 지어내지 마라.
- 숫자(스코어, 시간, 평점, 골, 도움, 세부 기록, 순위, 승점)는 데이터 그대로 써라.
- 데이터에 "(교체 투입)"이라고 적힌 경우에만 교체로 들어왔다고 쓰고, 그 외에는 선발/교체 여부를 언급하지 마라.
- 평점은 경기 데이터 제공처 기준의 평점이라고만 다루고 과장하지 마라.
- 존댓말 대신 칼럼체(~했다, ~이다)로 쓴다.
- 너의 의견·평가·전망("긍정적인 영향", "기대된다", "아쉽게도", "주목해야 한다" 등)은 쓰지 마라. 사실을 생생하게 정리하되 판단은 운영자 몫이다.
- 목록이 필요한 섹션이 아니면 데이터 줄을 그대로 복사하지 말고 자연스러운 문장으로 풀어 써라.

[형식] 마크다운.
1행: 제목: (제목) — 앞에 #이나 ** 같은 기호를 붙이지 마라
2행: 요약: (60~100자 요약) — 앞에 기호를 붙이지 마라
3행: 빈 줄
그다음 본문 (소제목은 ## / ###). "한 줄 총평"이나 "내 의견" 섹션은 만들지 마라.`

export async function callOpenAI(prompt: string, maxTokens = 3000): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error("초안 OpenAI 에러:", data)
    throw new Error("AI 초안 생성에 실패했습니다")
  }
  return (data.choices?.[0]?.message?.content ?? "").trim()
}

// 모델 출력 → 제목/요약/본문. 모델이 쓴 의견 줄·총평 섹션은 지우고 의견 자리는 코드가 넣는다.
// (모델에게 의견 자리를 맡겼더니 스스로 의견을 채워 넣어 "사람 의견 없이 발행 불가" 장치가 무력화됐던 문제)
// 제목/요약은 "# 제목:", "**제목:**" 같은 변형도 받는다.
export function shapeDraftText(raw: string, opts: { prefix: string; fallbackTitle: string }) {
  let title = `${opts.prefix} ${opts.fallbackTitle}`
  let summary = ""
  const body: string[] = []
  let seenHeading = false
  for (const line of raw.split("\n")) {
    const clean = line.replace(/^[\s#>*_-]+/, "").replace(/\*\*/g, "").trim()
    const t = !seenHeading && clean.match(/^제목\s*[:：]\s*(.+)$/)
    const sm = !seenHeading && clean.match(/^요약\s*[:：]\s*(.+)$/)
    if (t) {
      title = `${opts.prefix} ${t[1].replace(/^["'\[(]+|["'\])]+$/g, "").trim()}`
      continue
    }
    if (sm) {
      summary = sm[1].trim()
      continue
    }
    if (/^#{2,3}\s/.test(line)) seenHeading = true
    if (/내\s*의견/.test(line)) continue
    body.push(line)
  }
  let text = body.join("\n").replace(/\n?##\s*한\s*줄\s*총평[\s\S]*?(?=\n##\s|$)/, "").trim()
  text = `${text}\n\n## 한 줄 총평\n> ✍️ 내 의견: ${OPINION_PLACEHOLDER}`
  return { title: title.slice(0, 120), summary: summary.slice(0, 200), content: text }
}

// "## 다음 경기 일정" 같은 소제목 앞(없으면 총평 앞)에 코드가 만든 섹션을 끼워 넣는다
export function insertBefore(content: string, headingPattern: RegExp, section: string): string {
  if (!section) return content
  let at = content.search(headingPattern)
  if (at < 0) at = content.search(/\n##\s*한\s*줄\s*총평/)
  return at >= 0 ? `${content.slice(0, at)}\n\n${section}\n${content.slice(at)}` : `${content}\n\n${section}`
}

export async function uploadPng(name: string, png: ArrayBuffer): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null
  try {
    const blob = await put(`columns/${name}-${new Date().toISOString().slice(0, 10)}.png`, png, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/png",
    })
    return blob.url
  } catch (err) {
    console.error("초안 카드 업로드 실패:", err)
    return null
  }
}

export function cleanTags(tags: string[], max = 30): string[] {
  return [...new Set(tags.map((t) => t.replace(/[#,]/g, "").trim()).filter((t) => t && t.length <= 30))].slice(0, max)
}

// "10월 2주차"
export function weekLabel(now = new Date()): string {
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
  return `${kst.getMonth() + 1}월 ${Math.ceil(kst.getDate() / 7)}주차`
}

export type DraftResult = { ok: true; slug: string; created: boolean } | { ok: false; error: string }
