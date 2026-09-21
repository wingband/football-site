"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser, SignInButton } from "@clerk/nextjs"

const TITLE_MAX = 100
const CONTENT_MAX = 5000

type FormatAction = "bold" | "italic" | "strike" | "quote" | "link"

function applyFormat(
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

export default function BoardWritePage() {
  const { isSignedIn, isLoaded, user } = useUser()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleFormat(action: FormatAction) {
    const el = textareaRef.current
    if (!el) return
    const result = applyFormat(el, action)
    setContent(result.value)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  async function submit() {
    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 모두 입력해주세요")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const nickname =
        user?.username ?? user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "익명"
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, nickname }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "글 등록에 실패했습니다")
        return
      }
      router.push(`/board/${data.id}`)
    } catch {
      setError("글 등록에 실패했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight font-sans flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-floodlight/50 mb-4">글을 쓰려면 로그인이 필요합니다</p>
          <SignInButton mode="modal">
            <button className="text-sm px-6 py-2.5 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors">
              로그인하기
            </button>
          </SignInButton>
        </div>
      </main>
    )
  }

  const FORMAT_BUTTONS: { action: FormatAction; label: string; title: string }[] = [
    { action: "bold", label: "B", title: "굵게" },
    { action: "italic", label: "I", title: "기울임" },
    { action: "strike", label: "S", title: "취소선" },
    { action: "quote", label: "”", title: "인용" },
    { action: "link", label: "🔗", title: "링크" },
  ]

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-1.5 text-[11px] text-floodlight/40 mb-3">
          <Link href="/board" className="hover:text-floodlight/70 transition-colors">
            자유게시판
          </Link>
          <span>/</span>
          <span>글쓰기</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display uppercase text-xl text-score-amber">글쓰기</h1>
          <span className="text-[11px] px-2.5 py-1 rounded border border-turf-line text-floodlight/50">
            자유
          </span>
        </div>

        <div className="border border-turf-line rounded-lg overflow-hidden bg-turf/20">
          <div className="border-b border-turf-line/60">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="제목을 입력하세요"
              className="w-full bg-transparent px-4 py-3 text-sm text-floodlight placeholder:text-floodlight/30 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 px-3 py-2 border-b border-turf-line/60 bg-pitch-night/40">
            {FORMAT_BUTTONS.map((btn) => (
              <button
                key={btn.action}
                type="button"
                title={btn.title}
                onClick={() => handleFormat(btn.action)}
                className="w-7 h-7 flex items-center justify-center text-xs text-floodlight/60 rounded hover:bg-turf-line/40 hover:text-floodlight transition-colors"
              >
                {btn.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-floodlight/30">
              **굵게** *기울임* &gt;인용 지원
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
            placeholder="내용을 입력하세요"
            rows={14}
            className="w-full bg-transparent px-4 py-3 text-sm text-floodlight placeholder:text-floodlight/30 focus:outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-turf-line/60 text-[11px] text-floodlight/30">
            <span>{title.length}/{TITLE_MAX}</span>
            <span className="text-floodlight/20">·</span>
            <span>{content.length}/{CONTENT_MAX}</span>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        <p className="text-[11px] text-floodlight/30 mt-3 leading-relaxed">
          욕설·도배·분쟁 유발 게시글은 예고 없이 삭제될 수 있습니다. 서로 매너를 지켜주세요.
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <Link
            href="/board"
            className="text-sm px-6 py-2.5 border border-turf-line text-floodlight/60 rounded hover:bg-turf-line/20 transition-colors"
          >
            취소
          </Link>
          <button
            onClick={submit}
            disabled={submitting}
            className="text-sm px-6 py-2.5 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </main>
  )
}
