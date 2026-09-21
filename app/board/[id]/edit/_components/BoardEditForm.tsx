"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { applyFormat, FORMAT_BUTTONS, TITLE_MAX, CONTENT_MAX } from "@/lib/boardEditor"
import type { Post } from "@/lib/board"

export default function BoardEditForm({ post }: { post: Post }) {
  const { user } = useUser()
  const router = useRouter()
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 서버에서 이미 본인 확인 후 아니면 리다이렉트하지만, 하이드레이션
  // 직후 잠깐 잘못된 화면이 보이는 걸 막는 2차 방어
  if (user && user.id !== post.userId) return null

  function handleFormat(action: Parameters<typeof applyFormat>[1]) {
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
      const res = await fetch(`/api/board/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "수정에 실패했습니다")
        return
      }
      router.push(`/board/${post.id}`)
    } catch {
      setError("수정에 실패했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-1.5 text-[11px] text-floodlight/40 mb-3">
          <Link href={`/board/${post.id}`} className="hover:text-floodlight/70 transition-colors truncate max-w-xs">
            {post.title}
          </Link>
          <span>/</span>
          <span>수정</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display uppercase text-xl text-score-amber">글 수정</h1>
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

        <div className="flex justify-end gap-2 mt-4">
          <Link
            href={`/board/${post.id}`}
            className="text-sm px-6 py-2.5 border border-turf-line text-floodlight/60 rounded hover:bg-turf-line/20 transition-colors"
          >
            취소
          </Link>
          <button
            onClick={submit}
            disabled={submitting}
            className="text-sm px-6 py-2.5 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors disabled:opacity-50"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </main>
  )
}
