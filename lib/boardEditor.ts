export type FormatAction = "bold" | "italic" | "strike" | "quote" | "link"

export const TITLE_MAX = 100
export const CONTENT_MAX = 5000

export const FORMAT_BUTTONS: { action: FormatAction; label: string; title: string }[] = [
  { action: "bold", label: "B", title: "굵게" },
  { action: "italic", label: "I", title: "기울임" },
  { action: "strike", label: "S", title: "취소선" },
  { action: "quote", label: "”", title: "인용" },
  { action: "link", label: "🔗", title: "링크" },
]

// 글쓰기/수정 폼이 공유하는 서식 삽입 로직. 폼마다 따로 복붙해두면
// 나중에 한쪽만 고치고 다른 쪽을 빠뜨리는 사고가 나서 한 곳으로 통합함
export function applyFormat(
  textarea: HTMLTextAreaElement,
  action: FormatAction
): { value: string; selectionStart: number; selectionEnd: number } {
  const { value, selectionStart: start, selectionEnd: end } = textarea
  const selected = value.slice(start, end)

  const wrap = (mark: string, placeholder: string) => {
    const text = selected || placeholder
    const before = value.slice(0, start)
    const after = value.slice(end)
    const next = `${before}${mark}${text}${mark}${after}`
    const cursorStart = start + mark.length
    const cursorEnd = cursorStart + text.length
    return { value: next, selectionStart: cursorStart, selectionEnd: cursorEnd }
  }

  switch (action) {
    case "bold":
      return wrap("**", "굵게 강조할 내용")
    case "italic":
      return wrap("*", "기울임 내용")
    case "strike":
      return wrap("~~", "취소선 내용")
    case "quote": {
      const text = selected || "인용할 내용"
      const before = value.slice(0, start)
      const after = value.slice(end)
      const quoted = text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")
      const needsLeadingBreak = before.length > 0 && !before.endsWith("\n")
      const prefix = needsLeadingBreak ? "\n" : ""
      const next = `${before}${prefix}${quoted}${after}`
      const cursorStart = start + prefix.length
      const cursorEnd = cursorStart + quoted.length
      return { value: next, selectionStart: cursorStart, selectionEnd: cursorEnd }
    }
    case "link": {
      const text = selected || "링크 텍스트"
      const before = value.slice(0, start)
      const after = value.slice(end)
      const next = `${before}[${text}](https://)${after}`
      const urlStart = before.length + text.length + 3
      const urlEnd = urlStart + 8
      return { value: next, selectionStart: urlStart, selectionEnd: urlEnd }
    }
  }
}
