// 칼럼 카드(메인·칼럼 목록)용 표시 정보 — 제목 앞 [말머리]를 떼어 배지로, 평점은 따로 강조, 본문에서 핵심 한두 문장을 뽑는다.
// 서버·클라이언트 어디서든 쓸 수 있게 순수 함수로만 둔다.

export type ColumnCardInfo = {
  badge: string // "경기 리포트" · "K리그1" · "주간 해외파" · "칼럼"
  title: string // 말머리·평점을 뗀 제목
  rating: number | null
  lead: string // 핵심 내용 (최대 ~140자)
}

const HEAD = /^\s*\[([^\]]+)\]\s*/
const RATING = /\s*평점\s*([0-9]+(?:\.[0-9]+)?)\s*$/

function plain(s: string) {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function cut(s: string, max: number) {
  if (s.length <= max) return s
  const sliced = s.slice(0, max)
  const lastStop = Math.max(sliced.lastIndexOf("다."), sliced.lastIndexOf(". "))
  return lastStop > max * 0.6 ? sliced.slice(0, lastStop + (sliced[lastStop] === "다" ? 2 : 1)) : sliced.replace(/\s+\S*$/, "") + "…"
}

export function columnCardInfo(c: { title: string; summary: string; content: string }): ColumnCardInfo {
  const head = c.title.match(HEAD)
  let title = head ? c.title.slice(head[0].length) : c.title
  const badge = head?.[1] ?? "칼럼"

  let rating: number | null = null
  const r = title.match(RATING)
  if (r) {
    rating = Number(r[1])
    title = title.replace(RATING, "").replace(/\s+/g, " ").trim()
  }

  // 본문에서 "경기 내용"이 담긴 첫 문단: 제목·요약과 겹치지 않는 40자 이상 문장 문단
  const summary = plain(c.summary)
  let lead = ""
  for (const raw of c.content.split(/\n+/)) {
    const line = plain(raw)
    if (raw.trim().startsWith("#") || raw.trim().startsWith("!") || raw.trim().startsWith("|")) continue
    if (line.length < 40 || !/[다요]\.?$|다\./.test(line)) continue
    if (line === summary || line.startsWith(plain(c.title))) continue
    lead = line
    break
  }
  if (!lead) lead = summary
  // 카드에는 한 문장만, 잘림표(…) 없이 끝까지 보이게 짧게
  let one = lead.split(/(?<=[다요]\.)\s+/)[0].trim()
  if (one.length > 60) {
    const part = one.slice(0, 60)
    const i = Math.max(part.lastIndexOf(", "), part.lastIndexOf("고 "), part.lastIndexOf("며 "))
    one = i > 25 ? part.slice(0, i + 1).replace(/,$/, "") + "." : part.replace(/\s+\S*$/, "") + "."
  }
  return { badge, title, rating, lead: one }
}
