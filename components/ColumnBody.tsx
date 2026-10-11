import { Fragment, type ReactNode } from "react"

// 칼럼 본문 렌더러. 게시판과 같은 마크다운 표기(**굵게**, *기울임*, ~~취소선~~, > 인용)에
// 소제목(## / ###)과 목록(- / 1.), 링크([텍스트](https://...))를 더 지원한다.
// HTML을 직접 주입하지 않고 React 요소로만 만들기 때문에 XSS 걱정이 없다.

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const pattern = /(\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = `${keyBase}-${i++}`
    if (m[2] !== undefined) out.push(<strong key={key} className="font-semibold text-floodlight">{m[2]}</strong>)
    else if (m[3] !== undefined) out.push(<del key={key}>{m[3]}</del>)
    else if (m[4] !== undefined) out.push(<em key={key}>{m[4]}</em>)
    else if (m[5] !== undefined) {
      const href = m[6]
      const external = href.startsWith("http")
      out.push(
        <a
          key={key}
          href={href}
          className="text-score-amber underline underline-offset-2 hover:text-floodlight"
          {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
        >
          {m[5]}
        </a>
      )
    }
    last = pattern.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block =
  | { type: "h2" | "h3" | "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "hr" }
  | { type: "img"; alt: string; src: string }

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let para: string[] = []
  let quote: string[] = []
  let list: { type: "ul" | "ol"; items: string[] } | null = null

  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join("\n") })
    if (quote.length) blocks.push({ type: "quote", text: quote.join("\n") })
    if (list) blocks.push(list)
    para = []
    quote = []
    list = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flush(); continue }
    let m
    if ((m = line.match(/^###\s+(.*)/))) { flush(); blocks.push({ type: "h3", text: m[1] }); continue }
    if ((m = line.match(/^##\s+(.*)/))) { flush(); blocks.push({ type: "h2", text: m[1] }); continue }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flush(); blocks.push({ type: "hr" }); continue }
    // 한 줄 전체가 ![설명](https://...) 이면 이미지 (https 또는 사이트 내부 경로만 허용)
    if ((m = line.trim().match(/^!\[([^\]]*)\]\((https:\/\/[^\s)]+|\/[^\s)]*)\)$/))) {
      flush(); blocks.push({ type: "img", alt: m[1], src: m[2] }); continue
    }
    if ((m = line.match(/^>\s?(.*)/))) {
      if (para.length || list) flush()
      quote.push(m[1]); continue
    }
    if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
      if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] } }
      list.items.push(m[1]); continue
    }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
      if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] } }
      list.items.push(m[1]); continue
    }
    if (quote.length || list) flush()
    para.push(line)
  }
  flush()
  return blocks
}

function withBreaks(text: string, keyBase: string): ReactNode[] {
  return text.split("\n").flatMap((ln, i, arr) => {
    const nodes = renderInline(ln, `${keyBase}-${i}`)
    return i < arr.length - 1 ? [...nodes, <br key={`${keyBase}-br-${i}`} />] : nodes
  })
}

export default function ColumnBody({ content }: { content: string }) {
  // 초안용 "✍️ 내 의견:" 표시는 화면에 보여주지 않는다 (이미 발행된 예전 글에도 적용)
  const blocks = parseBlocks(content.replace(/✍️\s*내\s*의견\s*[:：]\s*(?!\(여기에)/g, ""))
  return (
    <div className="text-sm leading-[1.8] text-floodlight/85 space-y-4 max-w-4xl">
      {blocks.map((b, i) => {
        const k = `b${i}`
        switch (b.type) {
          case "h2":
            return <h2 key={k} className="text-base font-semibold text-floodlight pt-3">{renderInline(b.text, k)}</h2>
          case "h3":
            return <h3 key={k} className="text-sm font-semibold text-floodlight pt-1">{renderInline(b.text, k)}</h3>
          case "quote":
            return (
              <blockquote key={k} className="border-l-2 border-score-amber/60 pl-4 text-floodlight/70 italic">
                {withBreaks(b.text, k)}
              </blockquote>
            )
          case "ul":
          case "ol": {
            const Tag = b.type
            return (
              <Tag key={k} className={`${b.type === "ul" ? "list-disc" : "list-decimal"} pl-5 space-y-1.5`}>
                {b.items.map((it, j) => <li key={j}>{renderInline(it, `${k}-${j}`)}</li>)}
              </Tag>
            )
          }
          case "hr":
            return <hr key={k} className="border-turf-line/50" />
          case "img":
            // 자동 생성되던 큼직한 기록 카드 이미지는 보여주지 않는다 (본문 텍스트에 같은 내용이 있다)
            if (/— GoalLine/.test(b.alt)) return null
            return (
              <figure key={k} className="my-2">
                {/* 칼럼 이미지는 업로드 시점에 이미 줄여서 저장하므로 next/image 최적화 없이 그대로 쓴다 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.alt} loading="lazy" className="w-full h-auto rounded border border-turf-line/30" />
                {b.alt && <figcaption className="text-xs text-floodlight/45 mt-2 text-center">{b.alt}</figcaption>}
              </figure>
            )
          default:
            return <p key={k}><Fragment>{withBreaks(b.text, k)}</Fragment></p>
        }
      })}
    </div>
  )
}
